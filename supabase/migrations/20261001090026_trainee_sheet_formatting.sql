-- Formatting is private, versioned with the sheet, and validated as data, never CSS text.
create function private.ibta_valid_sheet_format(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item record; attribute record; col jsonb;
begin
  if value is null or jsonb_typeof(value)<>'object' or octet_length(value::text)>2500000 then return false; end if;
  if exists(select 1 from jsonb_object_keys(value) k where k not in ('direction','fontSize','hidden','styles')) then return false; end if;
  if value ? 'direction' and (value->>'direction' is null or value->>'direction' not in ('rtl','ltr')) then return false; end if;
  if value ? 'fontSize' then
    if jsonb_typeof(value->'fontSize')<>'number' or (value->>'fontSize')::numeric not between 10 and 32
       or (value->>'fontSize')::numeric<>trunc((value->>'fontSize')::numeric) then return false; end if;
  end if;
  if value ? 'hidden' then
    if jsonb_typeof(value->'hidden')<>'array' then return false; end if;
    if jsonb_array_length(value->'hidden')>12 then return false; end if;
    for col in select v from jsonb_array_elements(value->'hidden') as x(v) loop
      if jsonb_typeof(col)<>'number' then return false; end if;
      if col::text !~ '^(0|[1-9]|1[0-2])$' then return false; end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(value->'hidden') c group by c having count(*)>1) then return false; end if;
  end if;
  if value ? 'styles' then
    if jsonb_typeof(value->'styles')<>'object' then return false; end if;
    for item in select * from jsonb_each(value->'styles') loop
      if item.key !~ '^(0|[1-9][0-9]{0,3}):([0-9]|1[0-2])$' then return false; end if;
      if split_part(item.key,':',1)::int>=5000 or jsonb_typeof(item.value)<>'object' then return false; end if;
      for attribute in select * from jsonb_each(item.value) loop
        if attribute.key in ('bg','color') then
          if jsonb_typeof(attribute.value)<>'string' or (attribute.value#>>'{}') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
        elsif attribute.key='bold' then
          if jsonb_typeof(attribute.value)<>'boolean' then return false; end if;
        elsif attribute.key='size' then
          if jsonb_typeof(attribute.value)<>'number' then return false; end if;
          if attribute.value::text !~ '^(1[0-9]|2[0-9]|3[0-2])$' then return false; end if;
        else return false;
        end if;
      end loop;
    end loop;
  end if;
  return true;
end $$;
revoke all on function private.ibta_valid_sheet_format(jsonb) from public,anon;
grant execute on function private.ibta_valid_sheet_format(jsonb) to authenticated;
alter table public.ibta_trainee_sheets add column format jsonb not null default '{}'::jsonb check(private.ibta_valid_sheet_format(format));
grant insert(format),update(format) on public.ibta_trainee_sheets to authenticated;

create function public.ibta_save_trainee_sheet_formatted(target_owner uuid,new_cells jsonb,expected_version bigint,new_format jsonb)
returns bigint language plpgsql security invoker set search_path='' as $$
declare result bigint;
begin
  if auth.uid() is null or private.ibta_role() is null
     or (target_owner is distinct from auth.uid() and private.ibta_role() is distinct from 'admin') then raise exception 'Access denied'; end if;
  if target_owner is null or expected_version is null or expected_version<0
     or not private.ibta_valid_sheet(new_cells) or not private.ibta_valid_sheet_format(new_format) then raise exception 'Invalid sheet'; end if;
  if expected_version=0 then
    insert into public.ibta_trainee_sheets(owner_id,cells,format) values(target_owner,new_cells,new_format)
      on conflict do nothing returning version into result;
  else
    update public.ibta_trainee_sheets set cells=new_cells,format=new_format
      where owner_id=target_owner and version=expected_version returning version into result;
  end if;
  if result is null then raise exception 'CONFLICT: reload required'; end if;
  return result;
end $$;
revoke all on function public.ibta_save_trainee_sheet_formatted(uuid,jsonb,bigint,jsonb) from public,anon;
grant execute on function public.ibta_save_trainee_sheet_formatted(uuid,jsonb,bigint,jsonb) to authenticated;

create or replace function public.ibta_restore_backup(backup jsonb, expected_version bigint)
returns void language plpgsql security invoker set search_path='' as $$
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
    if exists(select 1 from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,cells jsonb,format jsonb)
      where r.owner_id is null or not private.ibta_valid_sheet(r.cells) or (r.format is not null and not private.ibta_valid_sheet_format(r.format))) then raise exception 'Invalid trainee backup'; end if;
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
    select coalesce(jsonb_object_agg(owner_id,format),'{}'::jsonb) into prior_formats from public.ibta_trainee_sheets;
    update public.ibta_trainee_sheets set cells='[]'::jsonb,format='{}'::jsonb;
    insert into public.ibta_trainee_sheets(owner_id,cells,format)
      select r.owner_id,r.cells,coalesce(r.format,prior_formats->r.owner_id::text,'{}'::jsonb)
      from jsonb_to_recordset(backup->'traineeSheets') as r(owner_id uuid,cells jsonb,format jsonb)
      on conflict(owner_id) do update set cells=excluded.cells,format=excluded.format;
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
