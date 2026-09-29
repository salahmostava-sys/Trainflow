-- IBTA Ops: run only in the dedicated IBTA project.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.ibta_members (
  email text primary key check (email = lower(email)),
  user_id uuid unique references auth.users(id) on delete set null,
  role text not null check (role in ('admin','operator')),
  active boolean not null default true
);
alter table public.ibta_members enable row level security;

create function private.ibta_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.ibta_members m join auth.users u on u.id=(select auth.uid())
  where u.email_confirmed_at is not null and m.active
    and (m.user_id=u.id or (m.user_id is null and m.email=lower(u.email)))
$$;
revoke all on function private.ibta_role() from public, anon;
grant execute on function private.ibta_role() to authenticated;

create table public.ibta_settings (
  id integer primary key check(id=1),
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=65536),
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
create table public.ibta_codes (
  code text primary key check(length(code) between 1 and 200),
  category text not null check(length(category) between 1 and 100),
  notes text not null default '' check(length(notes)<=2000),
  used_on text,
  used_by uuid references auth.users(id) on delete set null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ibta_codes_category_idx on public.ibta_codes(category,created_at,code);
create table public.ibta_audit (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  entity text not null,
  record_key text,
  happened_at timestamptz not null default now()
);
create index ibta_audit_time_idx on public.ibta_audit(happened_at desc);
alter table public.ibta_settings enable row level security;
alter table public.ibta_codes enable row level security;
alter table public.ibta_audit enable row level security;
revoke all on public.ibta_members, public.ibta_settings, public.ibta_codes, public.ibta_audit from anon, authenticated;
grant select,insert,update,delete on public.ibta_members to authenticated;
grant select on public.ibta_settings to authenticated;
grant update(payload) on public.ibta_settings to authenticated;
grant select,insert,delete on public.ibta_codes to authenticated;
grant update(notes,used_on) on public.ibta_codes to authenticated;
grant select on public.ibta_audit to authenticated;

create policy member_read on public.ibta_members for select to authenticated
using (user_id=(select auth.uid()) or (user_id is null and email=lower((select auth.jwt())->>'email'))
  or (select private.ibta_role())='admin');
create policy member_admin on public.ibta_members for all to authenticated
using ((select private.ibta_role())='admin') with check ((select private.ibta_role())='admin');
create policy settings_read on public.ibta_settings for select to authenticated using ((select private.ibta_role()) is not null);
create policy settings_write on public.ibta_settings for update to authenticated
using ((select private.ibta_role())='admin') with check ((select private.ibta_role())='admin');
create policy codes_read on public.ibta_codes for select to authenticated using ((select private.ibta_role()) is not null);
create policy codes_add on public.ibta_codes for insert to authenticated with check ((select private.ibta_role())='admin');
create policy codes_delete on public.ibta_codes for delete to authenticated using ((select private.ibta_role())='admin');
create policy codes_update on public.ibta_codes for update to authenticated
using ((select private.ibta_role()) is not null) with check ((select private.ibta_role()) is not null);
create policy audit_read on public.ibta_audit for select to authenticated using ((select private.ibta_role())='admin');

create function private.ibta_stamp() returns trigger language plpgsql set search_path='' as $$
begin
  new.version:=old.version+1;
  new.updated_at:=now();
  if tg_table_name='ibta_codes' then
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
create trigger stamp_codes before update on public.ibta_codes for each row execute function private.ibta_stamp();
create trigger stamp_settings before update on public.ibta_settings for each row execute function private.ibta_stamp();

-- Only trigger calls can append audit records; no client write permissions.
create function private.ibta_audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.ibta_audit(actor,action,entity,record_key)
  values(auth.uid(),tg_op,tg_table_name,
    case when tg_table_name='ibta_codes' then coalesce(to_jsonb(new)->>'code',to_jsonb(old)->>'code')
         when tg_table_name='ibta_members' then coalesce(to_jsonb(new)->>'email',to_jsonb(old)->>'email') else '1' end);
  return null;
end $$;
revoke all on function private.ibta_audit_change() from public,anon,authenticated;
create trigger audit_codes after insert or update or delete on public.ibta_codes for each row execute function private.ibta_audit_change();
create trigger audit_settings after update on public.ibta_settings for each row execute function private.ibta_audit_change();
create trigger audit_members after insert or update or delete on public.ibta_members for each row execute function private.ibta_audit_change();

-- Keep approved access bound to the Auth ID when a user confirms a new email.
create function private.ibta_sync_member_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null then
    update public.ibta_members set user_id=new.id,email=lower(new.email)
    where (user_id=new.id or (user_id is null and email=lower(new.email)))
      and (user_id is distinct from new.id or email is distinct from lower(new.email));
  end if;
  return new;
end $$;
revoke all on function private.ibta_sync_member_identity() from public,anon,authenticated;
create trigger ibta_sync_member_identity after insert or update of email,email_confirmed_at,last_sign_in_at on auth.users
for each row execute function private.ibta_sync_member_identity();

-- All edits in a batch succeed together or fail; stale versions never overwrite a colleague.
create function public.ibta_apply_changes(changes jsonb, settings_payload jsonb default null, settings_version bigint default null)
returns void language plpgsql security invoker set search_path='' as $$
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
      insert into public.ibta_codes(code,category,notes,used_on,used_by,version,created_at)
      values(item->>'new_code',item->>'new_category',coalesce(item->>'notes',''),next_date,
        case when next_date is null then null when next_date is not distinct from previous.used_on then previous.used_by else auth.uid() end,
        previous.version+1,previous.created_at);
    else raise exception 'Invalid operation'; end if;
  end loop;
end $$;
create function public.ibta_claim_code(target_code text, expected_version bigint, use_date text)
returns setof public.ibta_codes language plpgsql security invoker set search_path='' as $$
begin
  if length(target_code)>200 or use_date is null or use_date !~ '^\d{2}/\d{2}/\d{4}$' then raise exception 'Invalid claim'; end if;
  return query update public.ibta_codes set used_on=use_date
  where code=target_code and version=expected_version and used_on is null returning *;
end $$;
revoke all on function public.ibta_apply_changes(jsonb,jsonb,bigint),public.ibta_claim_code(text,bigint,text) from public,anon;
grant execute on function public.ibta_apply_changes(jsonb,jsonb,bigint),public.ibta_claim_code(text,bigint,text) to authenticated;

insert into public.ibta_members(email,role) values ('salah@gmail.ru','admin');

