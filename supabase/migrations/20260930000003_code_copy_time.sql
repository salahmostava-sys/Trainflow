-- Store the actual claim time separately from the legacy day string.
alter table public.ibta_codes add column used_at timestamptz;

create function private.ibta_set_used_at()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and new.used_on is distinct from old.used_on then
    new.used_at:=case when new.used_on is null then null else clock_timestamp() end;
  end if;
  return new;
end $$;
revoke all on function private.ibta_set_used_at() from public,anon,authenticated;
create trigger set_ibta_code_used_at before update on public.ibta_codes
  for each row execute function private.ibta_set_used_at();

-- A replace preserves the original claim time if the usage day has not changed.
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
      insert into public.ibta_codes(code,category,notes,used_on,used_by,used_at,version,created_at)
      values(item->>'new_code',item->>'new_category',coalesce(item->>'notes',''),next_date,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_by else auth.uid() end,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_at else clock_timestamp() end,
        previous.version+1,previous.created_at);
    else raise exception 'Invalid operation'; end if;
  end loop;
end $$;

-- Backup restoration keeps recorded claim times; older backups retain only the day.
create or replace function public.ibta_restore_backup(backup jsonb, expected_version bigint)
returns void language plpgsql security invoker set search_path='' as $$
declare affected integer; restored_version bigint;
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

  update public.ibta_settings set payload=backup->'settings'
  where id=1 and version=expected_version;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'CONFLICT: reload required'; end if;

  restored_version=(extract(epoch from clock_timestamp())*1000000)::bigint;
  delete from public.ibta_codes;
  insert into public.ibta_codes(code,category,notes,used_on,used_by,used_at,version)
  select r.code,r.category,coalesce(r.notes,''),r.used_on,
    case when r.used_on is null then null else r.used_by end,
    case when r.used_on is null then null else r.used_at end,restored_version
  from jsonb_to_recordset(backup->'codes') as r(
    code text,category text,notes text,used_on text,used_by uuid,used_at timestamptz
  );

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
