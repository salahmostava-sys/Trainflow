-- IBTA Ops: reviewed operational controls for the existing project.
alter table public.ibta_members drop constraint if exists ibta_members_role_check;
alter table public.ibta_members add constraint ibta_members_role_check
  check (role in ('admin','operator','copy_only'));

create function private.ibta_keep_admin() returns trigger language plpgsql set search_path='' as $$
declare removes_admin boolean;
begin
  if tg_op='DELETE' then removes_admin=true;
  else removes_admin=new.role is distinct from 'admin' or not new.active; end if;
  if old.role='admin' and old.active and removes_admin then
    perform pg_advisory_xact_lock(741029);
    if not exists (select 1 from public.ibta_members
      where email<>old.email and role='admin' and active) then
      raise exception 'At least one active administrator is required';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function private.ibta_keep_admin() from public,anon,authenticated;
create trigger keep_ibta_admin before update or delete on public.ibta_members
  for each row execute function private.ibta_keep_admin();

-- A copy-only member may claim a fresh code but cannot edit its notes or release it.
create or replace function private.ibta_stamp() returns trigger language plpgsql set search_path='' as $$
begin
  new.version:=old.version+1;
  new.updated_at:=now();
  if tg_table_name='ibta_codes' then
    if private.ibta_role()='copy_only' and
       (new.notes is distinct from old.notes or old.used_on is not null or new.used_on is null) then
      raise exception 'Copy-only members may only claim unused codes';
    end if;
    if new.used_on is distinct from old.used_on then
      if old.used_on is not null and old.used_by is distinct from auth.uid()
         and private.ibta_role() is distinct from 'admin' then
        raise exception 'Only the owner or administrator can release this code';
      end if;
      new.used_by:=case when new.used_on is null then null else auth.uid() end;
    end if;
  end if;
  return new;
end $$;

-- An administrator can restore a validated operational backup atomically.
create function public.ibta_restore_backup(backup jsonb, expected_version bigint)
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
  if exists (
    select 1 from jsonb_to_recordset(backup->'codes') as r(code text,category text)
    group by lower(r.code) having count(*)>1
  ) then raise exception 'Duplicate backup codes'; end if;

  update public.ibta_settings set payload=backup->'settings'
  where id=1 and version=expected_version;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'CONFLICT: reload required'; end if;

  restored_version=(extract(epoch from clock_timestamp())*1000000)::bigint;
  delete from public.ibta_codes;
  insert into public.ibta_codes(code,category,notes,used_on,used_by,version)
  select r.code,r.category,coalesce(r.notes,''),r.used_on,
    case when r.used_on is null then null else r.used_by end,restored_version
  from jsonb_to_recordset(backup->'codes') as r(
    code text,category text,notes text,used_on text,used_by uuid
  );
end $$;
revoke all on function public.ibta_restore_backup(jsonb,bigint) from public,anon;
grant execute on function public.ibta_restore_backup(jsonb,bigint) to authenticated;

create function public.ibta_import_codes(target_category text, new_codes text[])
returns integer language plpgsql security invoker set search_path='' as $$
declare added integer;
begin
  if private.ibta_role() is distinct from 'admin' then raise exception 'Access denied'; end if;
  if length(target_category) not between 1 and 100 or
     cardinality(new_codes)>5000 or new_codes is null then raise exception 'Invalid import'; end if;
  if exists(select 1 from unnest(new_codes) as item(value)
    where length(btrim(item.value)) not between 1 and 200) then raise exception 'Invalid code'; end if;
  insert into public.ibta_codes(code,category)
  select candidate.code,target_category from (
    select distinct on (lower(btrim(item.value))) btrim(item.value) as code
    from unnest(new_codes) as item(value) order by lower(btrim(item.value)),btrim(item.value)
  ) as candidate
  where not exists(select 1 from public.ibta_codes existing
    where lower(existing.code)=lower(candidate.code))
  on conflict (code) do nothing;
  get diagnostics added=row_count;
  return added;
end $$;
revoke all on function public.ibta_import_codes(text,text[]) from public,anon;
grant execute on function public.ibta_import_codes(text,text[]) to authenticated;
