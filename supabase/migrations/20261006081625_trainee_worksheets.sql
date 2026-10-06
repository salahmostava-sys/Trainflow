-- Preserve the existing first sheet in place; identity is now owner + worksheet.
alter table public.ibta_trainee_sheets add column sheet_id uuid not null default '00000000-0000-0000-0000-000000000001',
  add column sheet_name text not null default 'Sheet 1' check(length(trim(sheet_name)) between 1 and 100),
  add column sheet_order integer not null default 0,
  add column sheet_hidden boolean not null default false,
  add column tab_color text check(tab_color ~ '^#[0-9a-fA-F]{6}$');
alter table public.ibta_trainee_sheets drop constraint ibta_trainee_sheets_pkey,
  add primary key(owner_id,sheet_id);
create policy trainee_delete on public.ibta_trainee_sheets for delete to authenticated
  using((select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));
grant delete on public.ibta_trainee_sheets to authenticated;
create or replace function public.ibta_save_trainee_worksheet(target_owner uuid,target_sheet uuid,new_cells jsonb,expected_version bigint,new_format jsonb)
returns bigint language plpgsql set search_path='' AS $function$
declare result bigint;
begin
  if auth.uid() is null or private.ibta_role() is null or (target_owner is distinct from auth.uid() and private.ibta_role() is distinct from 'admin') then raise exception 'Access denied'; end if;
  if target_owner is null or target_sheet is null or expected_version is null or expected_version<0 or not private.ibta_valid_sheet(new_cells) or not private.ibta_valid_sheet_format(new_format) then raise exception 'Invalid sheet'; end if;
  if expected_version=0 then
    -- Only the legacy first worksheet may be created lazily. Other sheets require create/copy.
    if target_sheet<>'00000000-0000-0000-0000-000000000001'::uuid then raise exception 'Worksheet not found'; end if;
    insert into public.ibta_trainee_sheets(owner_id,sheet_id,cells,format) values(target_owner,target_sheet,new_cells,new_format)
      on conflict do nothing returning version into result;
  else
    update public.ibta_trainee_sheets set cells=new_cells,format=new_format
      where owner_id=target_owner and sheet_id=target_sheet and version=expected_version returning version into result;
  end if;
  if result is null then raise exception 'CONFLICT: reload required'; end if;return result;
end $function$;
revoke all on function public.ibta_save_trainee_worksheet(uuid,uuid,jsonb,bigint,jsonb) from public,anon;
grant execute on function public.ibta_save_trainee_worksheet(uuid,uuid,jsonb,bigint,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.ibta_save_trainee_sheet(target_owner uuid, new_cells jsonb, expected_version bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  return public.ibta_save_trainee_worksheet(target_owner,'00000000-0000-0000-0000-000000000001'::uuid,new_cells,expected_version,coalesce((select format from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id='00000000-0000-0000-0000-000000000001'::uuid),'{}'::jsonb));
end $function$;

CREATE OR REPLACE FUNCTION public.ibta_save_trainee_sheet_formatted(target_owner uuid, new_cells jsonb, expected_version bigint, new_format jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  return public.ibta_save_trainee_worksheet(target_owner,'00000000-0000-0000-0000-000000000001'::uuid,new_cells,expected_version,new_format);
end $function$;

create or replace function public.ibta_trainee_worksheet_action(target_owner uuid,target_sheet uuid,action text,new_name text default null,new_order integer default null,new_color text default null)
returns uuid language plpgsql set search_path='' AS $function$
declare result uuid; total integer;
begin
  if auth.uid() is null or private.ibta_role() is null or (target_owner is distinct from auth.uid() and private.ibta_role() is distinct from 'admin') then raise exception 'Access denied'; end if;
  if target_owner is null or action not in ('create','copy','delete','rename','move','hide','show','color') then raise exception 'Invalid worksheet action'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_owner::text,0));
  if new_name is not null and length(trim(new_name)) not between 1 and 100 then raise exception 'Invalid worksheet name'; end if;
  if new_color is not null and new_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid tab color'; end if;
  if new_order is not null and new_order not between -100000 and 100000 then raise exception 'Invalid worksheet position'; end if;
  select count(*) into total from public.ibta_trainee_sheets where owner_id=target_owner;
  if total=0 and action='create' then
    insert into public.ibta_trainee_sheets(owner_id) values(target_owner);total=1;
  end if;
  if action in ('create','copy') then
    if total>=100 then raise exception 'WORKSHEET_LIMIT'; end if;
    result=gen_random_uuid();
    if action='create' then
      insert into public.ibta_trainee_sheets(owner_id,sheet_id,sheet_name,sheet_order)
      values(target_owner,result,coalesce(trim(new_name),'Sheet '||(total+1)),coalesce(new_order,total));
    else
      insert into public.ibta_trainee_sheets(owner_id,sheet_id,sheet_name,sheet_order,cells,format,tab_color)
      select owner_id,result,coalesce(trim(new_name),left(sheet_name,93)||' (Copy)'),coalesce(new_order,total),cells,format,tab_color
      from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id=target_sheet;
      if not found then raise exception 'Worksheet not found'; end if;
    end if;
    return result;
  end if;
  if not exists(select 1 from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id=target_sheet) then raise exception 'Worksheet not found'; end if;
  if action in ('delete','hide') and not exists(select 1 from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id<>target_sheet and not sheet_hidden) then raise exception 'LAST_VISIBLE_WORKSHEET'; end if;
  if action='delete' then delete from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id=target_sheet;
  elsif action='rename' then
    if new_name is null then raise exception 'Invalid worksheet name'; end if;
    update public.ibta_trainee_sheets set sheet_name=trim(new_name) where owner_id=target_owner and sheet_id=target_sheet;
  elsif action='move' then
    if new_order is null then raise exception 'Invalid worksheet position'; end if;
    update public.ibta_trainee_sheets set sheet_order=new_order where owner_id=target_owner and sheet_id=target_sheet;
  elsif action in ('hide','show') then update public.ibta_trainee_sheets set sheet_hidden=(action='hide') where owner_id=target_owner and sheet_id=target_sheet;
  elsif action='color' then update public.ibta_trainee_sheets set tab_color=new_color where owner_id=target_owner and sheet_id=target_sheet;
  end if;
  return target_sheet;
end $function$;
revoke all on function public.ibta_trainee_worksheet_action(uuid,uuid,text,text,integer,text) from public,anon;
grant execute on function public.ibta_trainee_worksheet_action(uuid,uuid,text,text,integer,text) to authenticated;
CREATE OR REPLACE FUNCTION public.ibta_restore_backup(backup jsonb, expected_version bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare affected integer; restored_version bigint; owners jsonb; prior_formats jsonb;
begin
  if private.ibta_role() is distinct from 'admin' then raise exception 'Access denied'; end if;
  if jsonb_typeof(backup) is distinct from 'object'
     or jsonb_typeof(backup->'settings') is distinct from 'object'
     or jsonb_typeof(backup->'codes') is distinct from 'array'
     or jsonb_array_length(backup->'codes')>20000
     or octet_length(backup::text)>10000000 then
    raise exception 'Invalid backup';
  end if;
  if backup ? 'supervisorStock' and
     (jsonb_typeof(backup->'supervisorStock') is distinct from 'array'
      or jsonb_array_length(backup->'supervisorStock')>1000) then
    raise exception 'Invalid backup stock';
  end if;
  if exists(select 1 from jsonb_to_recordset(backup->'codes') as r(code text,category text)
    group by lower(r.code) having count(*)>1) then
    raise exception 'Duplicate backup codes';
  end if;
  if backup ? 'supervisorStock' and exists(
    select 1 from jsonb_to_recordset(backup->'supervisorStock') as r(category text,remaining integer)
    group by r.category having count(*)>1
  ) then raise exception 'Duplicate backup stock categories'; end if;

  if backup ? 'traineeSheets' then
    if jsonb_typeof(backup->'traineeSheets') is distinct from 'array' then raise exception 'Invalid trainee backup'; end if;
    if jsonb_array_length(backup->'traineeSheets')>1000 then raise exception 'Invalid trainee backup'; end if;
    if exists(select 1 from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,sheet_id uuid,sheet_name text,sheet_order integer,sheet_hidden boolean,tab_color text,cells jsonb,format jsonb)
      where r.owner_id is null or (r.sheet_name is not null and (length(trim(r.sheet_name))<1 or length(r.sheet_name)>100)) or (r.tab_color is not null and r.tab_color !~ '^#[0-9a-fA-F]{6}$') or not private.ibta_valid_sheet(r.cells) or (r.format is not null and not private.ibta_valid_sheet_format(r.format))) then raise exception 'Invalid trainee backup'; end if;
    if exists(select 1 from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,sheet_id uuid)
      group by r.owner_id,coalesce(r.sheet_id,'00000000-0000-0000-0000-000000000001'::uuid) having count(*)>1) then raise exception 'Duplicate trainee worksheet'; end if;
  end if;

  update public.ibta_settings set payload=backup->'settings'
  where id=1 and version=expected_version;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'CONFLICT: reload required'; end if;

  restored_version=(extract(epoch from clock_timestamp())*1000000)::bigint;
  select coalesce(jsonb_object_agg(code,owner_id),'{}'::jsonb) into owners from public.ibta_codes;
  delete from public.ibta_codes;
  insert into public.ibta_codes(code,category,notes,used_on,used_by,used_at,version,owner_id)
  select r.code,r.category,coalesce(r.notes,''),r.used_on,
    case when r.used_on is null then null else r.used_by end,
    case when r.used_on is null then null else r.used_at end,restored_version,
    case when raw.item ? 'owner_id' then (raw.item->>'owner_id')::uuid else (owners->>r.code)::uuid end
  from jsonb_array_elements(backup->'codes') as raw(item)
  cross join lateral jsonb_to_record(raw.item) as r(
    code text,category text,notes text,used_on text,used_by uuid,used_at timestamptz
  );

  if backup ? 'traineeSheets' then
    select coalesce(jsonb_object_agg(owner_id::text||':'||sheet_id::text,format),'{}'::jsonb) into prior_formats from public.ibta_trainee_sheets;
    delete from public.ibta_trainee_sheets;
    insert into public.ibta_trainee_sheets(owner_id,sheet_id,sheet_name,sheet_order,sheet_hidden,tab_color,cells,format,version)
      select r.owner_id,coalesce(r.sheet_id,'00000000-0000-0000-0000-000000000001'::uuid),coalesce(r.sheet_name,'Sheet 1'),
        coalesce(r.sheet_order,0),coalesce(r.sheet_hidden,false),r.tab_color,r.cells,
        coalesce(r.format,prior_formats->(r.owner_id::text||':'||coalesce(r.sheet_id,'00000000-0000-0000-0000-000000000001'::uuid)::text),'{}'::jsonb),restored_version
      from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,sheet_id uuid,sheet_name text,sheet_order integer,sheet_hidden boolean,tab_color text,cells jsonb,format jsonb);
    update public.ibta_trainee_sheets t set sheet_hidden=false where (t.owner_id,t.sheet_id) in
      (select distinct on (owner_id) owner_id,sheet_id from public.ibta_trainee_sheets s
       where not exists(select 1 from public.ibta_trainee_sheets v where v.owner_id=s.owner_id and not v.sheet_hidden)
       order by owner_id,sheet_order,sheet_id);
  end if;

  if backup ? 'supervisorStock' then
    delete from public.ibta_supervisor_stock;
    insert into public.ibta_supervisor_stock(category,remaining)
    select r.category,r.remaining
    from jsonb_to_recordset(backup->'supervisorStock') as r(category text,remaining integer);
    insert into public.ibta_supervisor_stock_events(category,change_amount,balance_after,reason,actor)
    select category,0,remaining,'correction',auth.uid()
    from public.ibta_supervisor_stock;
  end if;
end $function$;
