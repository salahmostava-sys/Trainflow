alter table public.ibta_codes add column trainee_name text not null default '' check(length(trainee_name)<=200);
create or replace function public.ibta_set_voucher_trainee_name(target_code text,expected_version bigint,trainee_name text)
returns bigint language plpgsql set search_path='' as $function$
declare result bigint;
begin
  if auth.uid() is null or coalesce(private.ibta_role(),'') not in ('admin','operator') then raise exception 'Access denied'; end if;
  if target_code is null or trainee_name is null or length(trainee_name)>200 or expected_version is null then raise exception 'Invalid trainee name'; end if;
  update public.ibta_codes set trainee_name=trim(ibta_set_voucher_trainee_name.trainee_name)
    where code=target_code and version=expected_version returning version into result;
  if result is null then raise exception 'CONFLICT: reload required'; end if;return result;
end $function$;

CREATE OR REPLACE FUNCTION public.ibta_claim_trainee_voucher(target_code text, expected_version bigint, use_date text, trainee_name text)
 RETURNS SETOF ibta_codes
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null or private.ibta_role() is null then raise exception 'Access denied'; end if;
  if trainee_name is null or length(trainee_name)>200 then raise exception 'Invalid trainee name'; end if;
  if length(target_code)>200 or use_date is null or use_date !~ '^\d{2}/\d{2}/\d{4}$' then raise exception 'Invalid claim'; end if;
  return query update public.ibta_codes set used_on=use_date,trainee_name=trim(ibta_claim_trainee_voucher.trainee_name)
  where code=target_code and version=expected_version and used_on is null returning *;
end $function$;
revoke all on function public.ibta_claim_trainee_voucher(text,bigint,text,text) from public,anon;
grant execute on function public.ibta_claim_trainee_voucher(text,bigint,text,text) to authenticated;
revoke all on function public.ibta_set_voucher_trainee_name(text,bigint,text) from public,anon;
grant execute on function public.ibta_set_voucher_trainee_name(text,bigint,text) to authenticated;
CREATE OR REPLACE FUNCTION public.ibta_apply_changes(changes jsonb, settings_payload jsonb DEFAULT NULL::jsonb, settings_version bigint DEFAULT NULL::bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item jsonb; affected integer; previous public.ibta_codes%rowtype; next_date text;
begin
  if private.ibta_role() is null then raise exception 'Access denied'; end if;
  if jsonb_typeof(changes)<>'array' or jsonb_array_length(changes)>250 then raise exception 'Invalid batch'; end if;
  if settings_payload is not null and octet_length(settings_payload::text)>65536 then raise exception 'Settings too large'; end if;
  if settings_payload is not null then
    update public.ibta_settings set payload=settings_payload where id=1 and version=settings_version;
    get diagnostics affected=row_count;
    if affected<>1 then raise exception 'CONFLICT: reload required'; end if;
  end if;
  for item in select value from jsonb_array_elements(changes) order by value->>'code' loop
    if item->>'op'='insert' then
      insert into public.ibta_codes(code,category,notes,used_on,used_by)
      values(item->>'code',item->>'category',coalesce(item->>'notes',''),item->>'used_on',
        case when item->>'used_on' is null then null else auth.uid() end);
    elsif item->>'op'='delete' then
      delete from public.ibta_codes where code=item->>'code' and version=(item->>'version')::bigint;
      get diagnostics affected=row_count;
      if affected<>1 then raise exception 'CONFLICT: reload required'; end if;
    elsif item->>'op'='update' then
      update public.ibta_codes set notes=coalesce(item->>'notes',''),used_on=item->>'used_on'
      where code=item->>'code' and version=(item->>'version')::bigint;
      get diagnostics affected=row_count;
      if affected<>1 then raise exception 'CONFLICT: reload required'; end if;
    elsif item->>'op'='replace' then
      if private.ibta_role() <> 'admin' then raise exception 'Access denied'; end if;
      next_date:=item->>'used_on';
      if length(item->>'new_code') not between 1 and 200
         or length(item->>'new_category') not between 1 and 100
         or length(coalesce(item->>'notes',''))>2000
         or (next_date is not null and next_date !~ '^\d{2}/\d{2}/\d{4}$')
      then raise exception 'Invalid code edit'; end if;
      select * into previous from public.ibta_codes
      where code=item->>'code' and version=(item->>'version')::bigint for update;
      if not found then raise exception 'CONFLICT: reload required'; end if;
      delete from public.ibta_codes where code=previous.code;
      insert into public.ibta_codes(code,category,notes,used_on,used_by,used_at,version,created_at,owner_id,trainee_name)
      values(item->>'new_code',item->>'new_category',coalesce(item->>'notes',''),next_date,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_by else auth.uid() end,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_at else clock_timestamp() end,
        previous.version+1,previous.created_at,previous.owner_id,previous.trainee_name);
    else raise exception 'Invalid operation'; end if;
  end loop;
end $function$;

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
  insert into public.ibta_codes(code,category,notes,used_on,used_by,used_at,version,owner_id,trainee_name)
  select r.code,r.category,coalesce(r.notes,''),r.used_on,
    case when r.used_on is null then null else r.used_by end,
    case when r.used_on is null then null else r.used_at end,restored_version,
    case when raw.item ? 'owner_id' then (raw.item->>'owner_id')::uuid else (owners->>r.code)::uuid end,coalesce(raw.item->>'trainee_name','')
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
