-- Security hardening from the October 2026 code review.
--  1. Invited memberships bind to an Auth user only after that user confirms the email,
--     including when confirmation happens after sign-up.
--  2. member_read no longer trusts an unconfirmed JWT email.
--  3. Shared Prometric credentials move out of ibta_settings.payload into a private
--     table reachable only through role-checked SECURITY DEFINER functions.
--  4. Voucher use dates are computed by the database (Asia/Riyadh) and the direct
--     UPDATE(used_on) column grant is revoked.
--  5. ibta_audit gains an index on actor.

-- 1. Confirmed-email membership binding --------------------------------------------
create or replace function private.ibta_sync_member_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- An unconfirmed address proves nothing: never bind or rename a membership for it.
  if new.email is not null and new.email_confirmed_at is not null then
    update public.ibta_members set user_id=new.id,email=lower(new.email)
    where (user_id=new.id or (user_id is null and email=lower(new.email)))
      and (user_id is distinct from new.id or email is distinct from lower(new.email));
  end if;
  return new;
end $$;
revoke all on function private.ibta_sync_member_identity() from public,anon,authenticated;
-- The existing trigger already fires on UPDATE OF email_confirmed_at, so a later
-- confirmation (null -> timestamp) binds the invite. Recreate it to make that explicit.
drop trigger if exists ibta_sync_member_identity on auth.users;
create trigger ibta_sync_member_identity after insert or update of email,email_confirmed_at,last_sign_in_at on auth.users
for each row execute function private.ibta_sync_member_identity();

-- Unbind memberships that an unconfirmed account claimed before this fix. The
-- invite becomes available again and binds on the real owner's confirmed sign-in.
update public.ibta_members m set user_id=null
from auth.users u
where m.user_id=u.id and u.email_confirmed_at is null;

-- A confirmed caller's email, or null. JWT claims alone do not prove confirmation.
create or replace function private.ibta_confirmed_email() returns text
language sql stable security definer set search_path = '' as $$
  select lower(u.email) from auth.users u
  where u.id=(select auth.uid()) and u.email_confirmed_at is not null
$$;
revoke all on function private.ibta_confirmed_email() from public,anon;
grant execute on function private.ibta_confirmed_email() to authenticated;

-- 2. member_read requires a confirmed email for the unbound-invite branch.
drop policy if exists member_read on public.ibta_members;
create policy member_read on public.ibta_members for select to authenticated
using (user_id=(select auth.uid())
  or (user_id is null and email=(select private.ibta_confirmed_email()))
  or (select private.ibta_role())='admin');

-- 3. Private Prometric credentials ----------------------------------------------------
create table if not exists private.ibta_prometric_credentials (
  id integer primary key default 1 check (id=1),
  account text not null default '' check (length(account)<=200),
  password text not null default '' check (length(password)<=200),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table private.ibta_prometric_credentials enable row level security;
revoke all on private.ibta_prometric_credentials from public,anon,authenticated;

-- Move the current shared value, then remove it from the readable payload.
insert into private.ibta_prometric_credentials(id,account,password)
select 1,coalesce(payload->'credentials'->>'account',''),coalesce(payload->'credentials'->>'password','')
from public.ibta_settings where id=1 and jsonb_typeof(payload->'credentials')='object'
on conflict (id) do update set account=excluded.account,password=excluded.password,updated_at=now();

-- Old clients and backup restores may still send credentials inside the payload.
-- Capture an admin's value into the private table and always strip it from settings.
create or replace function private.ibta_strip_settings_credentials() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.payload ? 'credentials' then
    if jsonb_typeof(new.payload->'credentials')='object'
       and (tg_op='INSERT' or private.ibta_role()='admin' or auth.uid() is null)
       and coalesce(new.payload->'credentials'->>'account','')<>'' then
      insert into private.ibta_prometric_credentials(id,account,password,updated_by)
      values(1,left(new.payload->'credentials'->>'account',200),left(coalesce(new.payload->'credentials'->>'password',''),200),auth.uid())
      on conflict (id) do update set account=excluded.account,password=excluded.password,
        updated_at=now(),updated_by=excluded.updated_by;
    end if;
    new.payload:=new.payload - 'credentials';
  end if;
  return new;
end $$;
revoke all on function private.ibta_strip_settings_credentials() from public,anon,authenticated;
drop trigger if exists strip_settings_credentials on public.ibta_settings;
create trigger strip_settings_credentials before insert or update on public.ibta_settings
for each row execute function private.ibta_strip_settings_credentials();

update public.ibta_settings set payload=payload - 'credentials' where id=1 and payload ? 'credentials';

-- Operators use the shared login during registration; copy-only members do not.
create or replace function public.ibta_get_prometric_credentials()
returns table(account text, password text)
language plpgsql stable security definer set search_path='' as $$
begin
  if private.ibta_role() is null or private.ibta_role() not in ('admin','operator') then
    return;
  end if;
  return query select c.account,c.password from private.ibta_prometric_credentials c where c.id=1;
end $$;
revoke all on function public.ibta_get_prometric_credentials() from public,anon;
grant execute on function public.ibta_get_prometric_credentials() to authenticated;

create or replace function public.ibta_set_prometric_credentials(new_account text, new_password text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or private.ibta_role() is distinct from 'admin' then raise exception 'Access denied'; end if;
  if new_account is null or new_password is null or length(btrim(new_account)) not between 1 and 200
     or length(new_password) not between 1 and 200 then raise exception 'IBTA_CREDENTIAL_REQUIRED'; end if;
  insert into private.ibta_prometric_credentials(id,account,password,updated_by)
  values(1,btrim(new_account),new_password,auth.uid())
  on conflict (id) do update set account=excluded.account,password=excluded.password,
    updated_at=now(),updated_by=excluded.updated_by;
  insert into public.ibta_audit(actor,action,entity,record_key)
  values(auth.uid(),'UPDATE','ibta_prometric_credentials','1');
  perform private.ibta_touch_live(null);
end $$;
revoke all on function public.ibta_set_prometric_credentials(text,text) from public,anon;
grant execute on function public.ibta_set_prometric_credentials(text,text) to authenticated;

-- 4. Server-computed voucher use dates ------------------------------------------------
create or replace function private.ibta_riyadh_today() returns text
language sql stable set search_path='' as $$
  select to_char((now() at time zone 'Asia/Riyadh')::date,'DD/MM/YYYY')
$$;
revoke all on function private.ibta_riyadh_today() from public,anon;
grant execute on function private.ibta_riyadh_today() to authenticated;

-- use_date is still accepted for client compatibility but ignored: the day is the
-- database's Asia/Riyadh date, so a caller cannot back-date or forward-date a claim.
create or replace function public.ibta_claim_code(target_code text, expected_version bigint, use_date text)
returns setof public.ibta_codes language plpgsql security definer set search_path='' as $$
declare role text := private.ibta_role();
begin
  if auth.uid() is null or role is null then raise exception 'Access denied'; end if;
  if target_code is null or length(target_code)>200 then raise exception 'Invalid claim'; end if;
  return query update public.ibta_codes set used_on=private.ibta_riyadh_today()
  where code=target_code and version=expected_version and used_on is null
    and (owner_id=auth.uid() or role='admin')
  returning *;
end $$;

create or replace function public.ibta_claim_trainee_voucher(target_code text, expected_version bigint, use_date text, trainee_name text)
returns setof public.ibta_codes language plpgsql security definer set search_path='' as $$
declare role text := private.ibta_role();
begin
  if auth.uid() is null or role is null then raise exception 'Access denied'; end if;
  if trainee_name is null or length(trainee_name)>200 then raise exception 'Invalid trainee name'; end if;
  if target_code is null or length(target_code)>200 then raise exception 'Invalid claim'; end if;
  return query update public.ibta_codes
    set used_on=private.ibta_riyadh_today(),trainee_name=trim(ibta_claim_trainee_voucher.trainee_name)
  where code=target_code and version=expected_version and used_on is null
    and (owner_id=auth.uid() or role='admin')
  returning *;
end $$;
revoke all on function public.ibta_claim_code(text,bigint,text),
  public.ibta_claim_trainee_voucher(text,bigint,text,text) from public,anon;
grant execute on function public.ibta_claim_code(text,bigint,text),
  public.ibta_claim_trainee_voucher(text,bigint,text,text) to authenticated;

-- The one remaining path that changes used_on for an existing row. Owner/admin row
-- access mirrors codes_update. Non-admins may release a code (null) or mark it used
-- today; only administrators may record any other day.
create or replace function private.ibta_update_code(target_code text, expected_version bigint, new_notes text, requested text)
returns void language plpgsql security definer set search_path='' as $$
declare role text := private.ibta_role(); previous public.ibta_codes%rowtype; next_date text;
begin
  if auth.uid() is null or role is null then raise exception 'Access denied'; end if;
  select * into previous from public.ibta_codes
  where code=target_code and version=expected_version and (owner_id=auth.uid() or role='admin')
  for update;
  if not found then raise exception 'CONFLICT: reload required'; end if;
  next_date:=requested;
  if next_date is not null and next_date is distinct from previous.used_on and role<>'admin' then
    if previous.used_on is not null then raise exception 'Only an administrator can change a usage date'; end if;
    next_date:=private.ibta_riyadh_today();
  end if;
  update public.ibta_codes set notes=coalesce(new_notes,''),used_on=next_date where code=previous.code;
end $$;
revoke all on function private.ibta_update_code(text,bigint,text,text) from public,anon;
grant execute on function private.ibta_update_code(text,bigint,text,text) to authenticated;

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
      perform private.ibta_update_code(item->>'code',(item->>'version')::bigint,item->>'notes',item->>'used_on');
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
end $$;
revoke all on function public.ibta_apply_changes(jsonb,jsonb,bigint) from public,anon;
grant execute on function public.ibta_apply_changes(jsonb,jsonb,bigint) to authenticated;

-- Notes stay directly updatable under RLS; used_on changes only through the functions above.
revoke update(used_on) on public.ibta_codes from authenticated;

-- 5. Audit lookups by actor -------------------------------------------------------------
create index if not exists ibta_audit_actor_idx on public.ibta_audit(actor);

-- A fresh project needs the singleton settings row the app reads on start-up.
insert into public.ibta_settings(id,payload)
values(1,'{"categoryOrder":[],"codeCategories":[],"keycodes":[]}'::jsonb)
on conflict (id) do nothing;
