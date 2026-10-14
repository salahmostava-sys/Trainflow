-- Realtime publishes invalidations only, never vouchers, credentials or sheet contents.
create table public.ibta_live_changes (
  key text primary key,
  owner_id uuid,
  revision bigint not null default 1,
  check (key=coalesce(owner_id::text,'workspace'))
);
alter table public.ibta_live_changes enable row level security;
revoke all on public.ibta_live_changes from public,anon,authenticated;
grant select on public.ibta_live_changes to authenticated;
create policy live_changes_read on public.ibta_live_changes for select to authenticated
using ((select private.ibta_role()) is not null and
  (owner_id is null or owner_id=(select auth.uid()) or (select private.ibta_role())='admin'));

create function private.ibta_touch_live(target_owner uuid) returns void
language sql security definer set search_path='' as $$
  insert into public.ibta_live_changes(key,owner_id)
  values(coalesce(target_owner::text,'workspace'),target_owner)
  on conflict(key) do update set revision=public.ibta_live_changes.revision+1;
$$;
revoke all on function private.ibta_touch_live(uuid) from public,anon,authenticated;

create function private.ibta_live_workspace() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform private.ibta_touch_live(null);
  return null;
end $$;
revoke all on function private.ibta_live_workspace() from public,anon,authenticated;

create function private.ibta_live_sheet() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='DELETE' then
    perform private.ibta_touch_live(old.owner_id);
  else
    perform private.ibta_touch_live(new.owner_id);
    if tg_op='UPDATE' and old.owner_id is distinct from new.owner_id then
      perform private.ibta_touch_live(old.owner_id);
    end if;
  end if;
  return null;
end $$;
revoke all on function private.ibta_live_sheet() from public,anon,authenticated;

create trigger live_codes after insert or update or delete on public.ibta_codes
for each statement execute function private.ibta_live_workspace();
create trigger live_settings after insert or update or delete on public.ibta_settings
for each statement execute function private.ibta_live_workspace();
create trigger live_stock after insert or update or delete on public.ibta_supervisor_stock
for each statement execute function private.ibta_live_workspace();
create trigger live_members after insert or update or delete on public.ibta_members
for each statement execute function private.ibta_live_workspace();
create trigger live_sheets after insert or update or delete on public.ibta_trainee_sheets
for each row execute function private.ibta_live_sheet();

do $$
begin
  if not exists(select 1 from pg_publication where pubname='supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='ibta_live_changes') then
    alter publication supabase_realtime add table public.ibta_live_changes;
  end if;
end $$;
