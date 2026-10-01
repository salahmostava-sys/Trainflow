-- Each account owns one private spreadsheet; administrators can inspect/edit any sheet.
create function private.ibta_valid_sheet(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r jsonb; c jsonb;
begin
  if value is null or jsonb_typeof(value)<>'array' or octet_length(value::text)>4000000 then return false; end if;
  if jsonb_array_length(value)>5000 then return false; end if;
  for r in select v from jsonb_array_elements(value) as x(v) loop
    if jsonb_typeof(r)<>'array' then return false; end if;
    if jsonb_array_length(r)<>13 then return false; end if;
    for c in select v from jsonb_array_elements(r) as x(v) loop
      if jsonb_typeof(c)<>'string' or length(c#>>'{}')>2000 then return false; end if;
    end loop;
  end loop;
  return true;
end $$;
revoke all on function private.ibta_valid_sheet(jsonb) from public,anon;
grant execute on function private.ibta_valid_sheet(jsonb) to authenticated;

create table public.ibta_trainee_sheets (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  cells jsonb not null default '[]'::jsonb check(private.ibta_valid_sheet(cells)),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.ibta_trainee_sheets enable row level security;
revoke all on public.ibta_trainee_sheets from public,anon,authenticated;
grant select on public.ibta_trainee_sheets to authenticated;
grant insert(owner_id,cells),update(cells) on public.ibta_trainee_sheets to authenticated;
create policy trainee_read on public.ibta_trainee_sheets for select to authenticated
  using ((select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));
create policy trainee_insert on public.ibta_trainee_sheets for insert to authenticated
  with check ((select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));
create policy trainee_update on public.ibta_trainee_sheets for update to authenticated
  using ((select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'))
  with check ((select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));
create trigger stamp_trainee_sheet before update on public.ibta_trainee_sheets
  for each row execute function private.ibta_stamp();
-- Audit metadata only; never record student details/passwords in the audit stream.
create function private.ibta_audit_sheet() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.ibta_audit(actor,action,entity,record_key)
    values(auth.uid(),tg_op,'ibta_trainee_sheets',new.owner_id::text);
  return null;
end $$;
revoke all on function private.ibta_audit_sheet() from public,anon,authenticated;
create trigger audit_trainee_sheet after insert or update on public.ibta_trainee_sheets
  for each row execute function private.ibta_audit_sheet();

create function public.ibta_save_trainee_sheet(target_owner uuid,new_cells jsonb,expected_version bigint)
returns bigint language plpgsql security invoker set search_path='' as $$
declare result bigint;
begin
  if auth.uid() is null or private.ibta_role() is null
     or (target_owner is distinct from auth.uid() and private.ibta_role() is distinct from 'admin') then raise exception 'Access denied'; end if;
  if target_owner is null or expected_version is null or expected_version<0
     or not private.ibta_valid_sheet(new_cells) then raise exception 'Invalid sheet'; end if;
  if expected_version=0 then
    insert into public.ibta_trainee_sheets(owner_id,cells) values(target_owner,new_cells)
      on conflict do nothing returning version into result;
  else
    update public.ibta_trainee_sheets set cells=new_cells
      where owner_id=target_owner and version=expected_version returning version into result;
  end if;
  if result is null then raise exception 'CONFLICT: reload required'; end if;
  return result;
end $$;
revoke all on function public.ibta_save_trainee_sheet(uuid,jsonb,bigint) from public,anon;
grant execute on function public.ibta_save_trainee_sheet(uuid,jsonb,bigint) to authenticated;

-- Existing claimed codes retain their known operator; unclaimed codes stay in the admin pool.
alter table public.ibta_codes add column owner_id uuid references auth.users(id) on delete set null;
create index ibta_codes_owner_idx on public.ibta_codes(owner_id,code);
update public.ibta_codes set owner_id=used_by where used_by is not null;
grant update(owner_id) on public.ibta_codes to authenticated;
alter policy codes_read on public.ibta_codes using (
  (select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));
alter policy codes_update on public.ibta_codes using (
  (select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'))
  with check ((select private.ibta_role()) is not null and (owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));

create function public.ibta_assign_codes(target_owner uuid,items jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare item jsonb; previous public.ibta_codes%rowtype;
begin
  if auth.uid() is null or private.ibta_role() is distinct from 'admin' then raise exception 'Access denied'; end if;
  if items is null or jsonb_typeof(items)<>'array' then raise exception 'Invalid assignment'; end if;
  if jsonb_array_length(items) not between 1 and 250 then raise exception 'Invalid assignment'; end if;
  if target_owner is not null and not exists(select 1 from public.ibta_members where user_id=target_owner and active) then
    raise exception 'User must have an active registered account'; end if;
  for item in select value from jsonb_array_elements(items) order by value->>'code' loop
    select * into previous from public.ibta_codes where code=item->>'code' and version=(item->>'version')::bigint for update;
    if not found then raise exception 'CONFLICT: reload required'; end if;
    if previous.used_on is not null and previous.owner_id is not null and previous.owner_id is distinct from target_owner then
      raise exception 'Used codes cannot be reassigned'; end if;
    update public.ibta_codes set owner_id=target_owner where code=previous.code;
  end loop;
end $$;
revoke all on function public.ibta_assign_codes(uuid,jsonb) from public,anon;
grant execute on function public.ibta_assign_codes(uuid,jsonb) to authenticated;

create or replace function public.ibta_apply_changes(changes jsonb, settings_payload jsonb default null, settings_version bigint default null)
returns void language plpgsql set search_path='' as $$
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
      insert into public.ibta_codes(code,category,notes,used_on,used_by,used_at,version,created_at,owner_id)
      values(item->>'new_code',item->>'new_category',coalesce(item->>'notes',''),next_date,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_by else auth.uid() end,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_at else clock_timestamp() end,
        previous.version+1,previous.created_at,previous.owner_id);
    else raise exception 'Invalid operation'; end if;
  end loop;
end $$;

-- Backup restoration keeps recorded claim times; older backups retain only the day.
create or replace function public.ibta_restore_backup(backup jsonb, expected_version bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare affected integer; restored_version bigint; owners jsonb;
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
    if exists(select 1 from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,cells jsonb)
      where r.owner_id is null or not private.ibta_valid_sheet(r.cells)) then raise exception 'Invalid trainee backup'; end if;
    if exists(select 1 from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid)
      group by r.owner_id having count(*)>1) then raise exception 'Duplicate trainee owner'; end if;
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
    -- Keep old rows/version counters so an open editor can never overwrite restored data.
    update public.ibta_trainee_sheets set cells='[]'::jsonb;
    insert into public.ibta_trainee_sheets(owner_id,cells)
      select r.owner_id,r.cells from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,cells jsonb)
      on conflict(owner_id) do update set cells=excluded.cells;
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
end $$;
