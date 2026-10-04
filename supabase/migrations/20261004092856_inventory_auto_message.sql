-- One server-side inventory report per Saudi day; no browser timer or user JWT required.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create table private.ibta_inventory_delivery (
  id integer primary key check(id=1),
  enabled boolean not null default false,
  send_time time not null default '16:59',
  phone_id text not null default '',
  template_name text not null default '',
  template_language text not null default 'ar',
  api_version text not null default 'v24.0',
  secret_id uuid,
  last_dispatch date
);
insert into private.ibta_inventory_delivery(id) values(1);
create table private.ibta_inventory_delivery_log (
  day date primary key,
  requested_at timestamptz not null default now(),
  request_id bigint,
  state text not null check(state in ('queued','accepted','failed','unknown')),
  error_code text,
  message_id text
);
alter table private.ibta_inventory_delivery enable row level security;
alter table private.ibta_inventory_delivery_log enable row level security;
revoke all on private.ibta_inventory_delivery,private.ibta_inventory_delivery_log from public,anon,authenticated;

create function private.ibta_inventory_delivery_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or private.ibta_role() is distinct from 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  select jsonb_build_object('enabled',d.enabled,'time',to_char(d.send_time,'HH24:MI'),
    'phoneId',d.phone_id,'template',d.template_name,'language',d.template_language,'apiVersion',d.api_version,
    'connected',d.secret_id is not null and d.phone_id<>'' and d.template_name<>'',
    'last', (select jsonb_build_object('at',l.requested_at,'state',l.state,'error',l.error_code)
      from private.ibta_inventory_delivery_log l order by l.day desc limit 1))
  into result from private.ibta_inventory_delivery d where id=1;
  return result;
end $$;

create function private.ibta_save_inventory_delivery(options jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid; token text; hour_text text; phone text; template text; lang text; version text; v_enabled boolean;
begin
  if auth.uid() is null or private.ibta_role() is distinct from 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(options) is distinct from 'object' then raise exception 'INVALID_OPTIONS'; end if;
  hour_text:=options->>'time'; phone:=btrim(coalesce(options->>'phoneId',''));
  template:=btrim(coalesce(options->>'template','')); lang:=coalesce(options->>'language','ar');
  version:=coalesce(options->>'apiVersion','v24.0'); token:=btrim(coalesce(options->>'token',''));
  if hour_text is null or hour_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or (phone<>'' and phone !~ '^[0-9]{5,30}$') or (template<>'' and template !~ '^[a-z0-9_]{1,100}$')
    or lang not in ('ar','en','en_US','en_GB') or version !~ '^v[0-9]{2}\.0$'
    or jsonb_typeof(options->'enabled') is distinct from 'boolean'
    or (token<>'' and (length(token) not between 20 and 4096 or token ~ '[[:space:][:cntrl:]]')) then
    raise exception 'INVALID_OPTIONS';
  end if;
  v_enabled:=(options->>'enabled')::boolean;
  select secret_id into sid from private.ibta_inventory_delivery where id=1 for update;
  if token<>'' then
    if sid is null then sid:=vault.create_secret(token,'ibta_whatsapp_inventory_token','WhatsApp inventory delivery');
    else perform vault.update_secret(sid,token); end if;
  end if;
  if v_enabled and (sid is null or phone='' or template='') then raise exception 'WHATSAPP_NOT_CONNECTED'; end if;
  if v_enabled and not exists(select 1 from public.ibta_settings where id=1 and payload->>'inventoryWhatsappNumber' ~ '^[0-9]{8,15}$') then raise exception 'RECIPIENT_REQUIRED'; end if;
  update private.ibta_inventory_delivery set enabled=v_enabled,send_time=hour_text::time,
    phone_id=phone,template_name=template,template_language=lang,api_version=version,secret_id=sid where id=1;
  return private.ibta_inventory_delivery_status();
end $$;

-- All category counts use the same inventory visible to an administrator.
create function private.ibta_inventory_template_parameters(report_day date) returns jsonb
language plpgsql set search_path='' as $$
declare p jsonb; mine text; supervisor text; total text; overall bigint; name text; parameters jsonb;
begin
  select payload into p from public.ibta_settings where id=1;
  if coalesce(p->>'inventoryWhatsappNumber','') !~ '^[0-9]{8,15}$' then raise exception 'RECIPIENT_REQUIRED'; end if;
  name:=coalesce(nullif(p->>'inventorySupervisorName',''),case when p->>'inventoryMessageLanguage'='en' then 'supervisor' else 'المشرف' end);
  with categories as (
    select value as category from jsonb_array_elements_text(p->'codeCategories')
    union select category from public.ibta_codes
  ), counts as (
    select c.category,coalesce(p->'categoryLabels'->>c.category,p->'categoryLabels'->>regexp_replace(c.category,'-[0-9]+$',''),regexp_replace(c.category,'-[0-9]+$','')) as label,
      (select count(*) from public.ibta_codes x where x.category=c.category and x.used_on is null) as available,
      s.remaining,
      coalesce(nullif(array_position(array['Foundation','Master','BIS','Corporate','CYBP'],regexp_replace(c.category,'-[0-9]+$','')),0),6) as priority
    from categories c left join public.ibta_supervisor_stock s on s.category=c.category
  ) select string_agg(label||': '||available,' · ' order by priority,category),
    string_agg(label||': '||remaining,' · ' order by priority,category),
    string_agg(label||': '||(available+remaining),' · ' order by priority,category),
    case when count(*)>0 and count(remaining)=count(*) then sum(available+remaining) end
    into mine,supervisor,total,overall from counts;
  if overall is null then raise exception 'STOCK_INCOMPLETE'; end if;
  parameters:=jsonb_build_array(to_char(report_day,'DD/MM/YYYY'),mine,name,supervisor,total,overall::text);
  if length(parameters::text)>1000 or parameters::text ~ '\\[nrt]' then raise exception 'REPORT_TOO_LONG'; end if;
  return (select jsonb_agg(jsonb_build_object('type','text','text',value)) from jsonb_array_elements_text(parameters));
end $$;

create function private.ibta_delivery_response(content text) returns jsonb
language plpgsql immutable set search_path='' as $$
begin return content::jsonb; exception when others then return '{}'::jsonb; end $$;
revoke all on function private.ibta_delivery_response(text) from public,anon,authenticated;

create function private.ibta_inventory_delivery_tick() returns void
language plpgsql set search_path='' as $$
declare cfg private.ibta_inventory_delivery; saudi timestamp:=clock_timestamp() at time zone 'Asia/Riyadh';
  p jsonb; params jsonb; token text; req bigint; error_name text;
begin
  -- A 2xx response means provider acceptance, not handset delivery.
  update private.ibta_inventory_delivery_log l set
    state=case when r.status_code between 200 and 299 and private.ibta_delivery_response(r.content)->'messages'->0->>'id' is not null then 'accepted' else 'failed' end,
    error_code=case when r.status_code between 200 and 299 and private.ibta_delivery_response(r.content)->'messages'->0->>'id' is not null then null else 'PROVIDER_REJECTED' end,
    message_id=case when r.status_code between 200 and 299 then private.ibta_delivery_response(r.content)->'messages'->0->>'id' end
  from net._http_response r where l.state='queued' and r.id=l.request_id;
  update private.ibta_inventory_delivery_log set state='unknown',error_code='RESPONSE_UNAVAILABLE'
    where state='queued' and requested_at<now()-interval '10 minutes';
  select * into cfg from private.ibta_inventory_delivery where id=1 for update;
  if not cfg.enabled or saudi::time<cfg.send_time or cfg.last_dispatch=saudi::date then return; end if;
  -- Snapshot once per day. Unknown outcomes never retry automatically to avoid duplicates.
  begin
    select payload into p from public.ibta_settings where id=1;
    if (coalesce(p->>'inventoryMessageLanguage','ar')='en') is distinct from (cfg.template_language like 'en%') then raise exception 'TEMPLATE_LANGUAGE_MISMATCH'; end if;
    params:=private.ibta_inventory_template_parameters(saudi::date);
    select decrypted_secret into token from vault.decrypted_secrets where id=cfg.secret_id;
    if token is null or cfg.phone_id='' or cfg.template_name='' then raise exception 'WHATSAPP_NOT_CONNECTED'; end if;
    req:=net.http_post(url:='https://graph.facebook.com/'||cfg.api_version||'/'||cfg.phone_id||'/messages',
      headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),
      body:=jsonb_build_object('messaging_product','whatsapp','to',p->>'inventoryWhatsappNumber','type','template',
        'template',jsonb_build_object('name',cfg.template_name,'language',jsonb_build_object('code',cfg.template_language),
          'components',jsonb_build_array(jsonb_build_object('type','body','parameters',params)))),timeout_milliseconds:=15000);
    insert into private.ibta_inventory_delivery_log(day,request_id,state) values(saudi::date,req,'queued');
  exception when others then
    error_name:=case when sqlerrm in ('RECIPIENT_REQUIRED','STOCK_INCOMPLETE','REPORT_TOO_LONG','TEMPLATE_LANGUAGE_MISMATCH','WHATSAPP_NOT_CONNECTED') then sqlerrm else 'SEND_FAILED' end;
    insert into private.ibta_inventory_delivery_log(day,state,error_code) values(saudi::date,'failed',error_name);
  end;
  update private.ibta_inventory_delivery set last_dispatch=saudi::date where id=1;
end $$;

revoke all on function private.ibta_inventory_delivery_tick(),private.ibta_inventory_template_parameters(date),private.ibta_inventory_delivery_status(),private.ibta_save_inventory_delivery(jsonb) from public,anon,authenticated;
grant execute on function private.ibta_inventory_delivery_status(),private.ibta_save_inventory_delivery(jsonb) to authenticated;
create function public.ibta_inventory_delivery_status() returns jsonb language sql security invoker set search_path='' as $$ select private.ibta_inventory_delivery_status() $$;
create function public.ibta_save_inventory_delivery(options jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.ibta_save_inventory_delivery(options) $$;
revoke all on function public.ibta_inventory_delivery_status(),public.ibta_save_inventory_delivery(jsonb) from public,anon;
grant execute on function public.ibta_inventory_delivery_status(),public.ibta_save_inventory_delivery(jsonb) to authenticated;
select cron.schedule('ibta-inventory-whatsapp','* * * * *','select private.ibta_inventory_delivery_tick()');
