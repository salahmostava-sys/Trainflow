-- WhatsApp Web runs only on the administrator's explicitly enabled Chrome device.
alter table private.ibta_inventory_delivery add column provider text not null default 'web' check(provider in ('web','meta'));
create or replace function private.ibta_inventory_delivery_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or private.ibta_role() is distinct from 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  select jsonb_build_object('provider',d.provider,'enabled',d.enabled,'time',to_char(d.send_time,'HH24:MI'),
    'phoneId',d.phone_id,'template',d.template_name,'language',d.template_language,'apiVersion',d.api_version,
    'connected',d.secret_id is not null and d.phone_id<>'' and d.template_name<>'',
    'last',(select jsonb_build_object('at',l.requested_at,'state',l.state,'error',l.error_code) from private.ibta_inventory_delivery_log l order by l.day desc limit 1))
  into result from private.ibta_inventory_delivery d where id=1;
  return result;
end $$;
create or replace function private.ibta_save_inventory_delivery(options jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare sid uuid; token text; hour_text text; phone text; template text; lang text; version text; v_enabled boolean; v_provider text;
begin
  if auth.uid() is null or private.ibta_role() is distinct from 'admin' then raise exception 'ADMIN_REQUIRED'; end if;
  if jsonb_typeof(options) is distinct from 'object' then raise exception 'INVALID_OPTIONS'; end if;
  hour_text:=options->>'time'; phone:=btrim(coalesce(options->>'phoneId',''));
  template:=btrim(coalesce(options->>'template','')); lang:=coalesce(options->>'language','ar');
  version:=coalesce(options->>'apiVersion','v24.0'); token:=btrim(coalesce(options->>'token','')); v_provider:=coalesce(options->>'provider','meta');
  if hour_text is null or hour_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    or (phone<>'' and phone !~ '^[0-9]{5,30}$') or (template<>'' and template !~ '^[a-z0-9_]{1,100}$')
    or lang not in ('ar','en','en_US','en_GB') or version !~ '^v[0-9]{2}\.0$' or v_provider not in ('web','meta')
    or jsonb_typeof(options->'enabled') is distinct from 'boolean'
    or (token<>'' and (length(token) not between 20 and 4096 or token ~ '[[:space:][:cntrl:]]')) then raise exception 'INVALID_OPTIONS'; end if;
  v_enabled:=(options->>'enabled')::boolean;
  select secret_id into sid from private.ibta_inventory_delivery where id=1 for update;
  if v_provider='meta' and token<>'' then
    if sid is null then sid:=vault.create_secret(token,'ibta_whatsapp_inventory_token','WhatsApp inventory delivery');
    else perform vault.update_secret(sid,token); end if;
  end if;
  if v_enabled and v_provider='meta' and (sid is null or phone='' or template='') then raise exception 'WHATSAPP_NOT_CONNECTED'; end if;
  if v_enabled and not exists(select 1 from public.ibta_settings where id=1 and payload->>'inventoryWhatsappNumber' ~ '^[0-9]{8,15}$') then raise exception 'RECIPIENT_REQUIRED'; end if;
  update private.ibta_inventory_delivery set provider=v_provider,enabled=v_enabled,send_time=hour_text::time,
    phone_id=phone,template_name=template,template_language=lang,api_version=version,secret_id=sid where id=1;
  return private.ibta_inventory_delivery_status();
end $$;
create or replace function private.ibta_inventory_delivery_validate() returns trigger
language plpgsql set search_path='' as $$
declare p jsonb;
begin
  if new.enabled then
    select payload into p from public.ibta_settings where id=1;
    if new.provider='meta' then
      if (coalesce(p->>'inventoryMessageLanguage','ar')='en') is distinct from (new.template_language like 'en%') then raise exception 'TEMPLATE_LANGUAGE_MISMATCH'; end if;
      perform private.ibta_inventory_template_parameters((now() at time zone 'Asia/Riyadh')::date);
    elsif exists(select 1 from jsonb_array_elements_text(p->'codeCategories') c where not exists(select 1 from public.ibta_supervisor_stock s where s.category=c.value)) then raise exception 'STOCK_INCOMPLETE';
    end if;
  end if;
  return new;
end $$;
drop trigger validate_inventory_delivery on private.ibta_inventory_delivery;
create trigger validate_inventory_delivery before insert or update of enabled,template_language,provider on private.ibta_inventory_delivery for each row execute function private.ibta_inventory_delivery_validate();
alter function private.ibta_inventory_delivery_tick() rename to ibta_inventory_meta_tick;
create function private.ibta_inventory_delivery_tick() returns void
language plpgsql set search_path='' as $$
begin
  if (select provider from private.ibta_inventory_delivery where id=1)='meta' then perform private.ibta_inventory_meta_tick(); end if;
end $$;
revoke all on function private.ibta_inventory_delivery_tick(),private.ibta_inventory_meta_tick() from public,anon,authenticated;
