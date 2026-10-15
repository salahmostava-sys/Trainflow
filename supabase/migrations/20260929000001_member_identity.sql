-- Bind approved memberships to immutable Auth user IDs so a confirmed email
-- change keeps the same role and active flag.
alter table public.ibta_members
  add column if not exists user_id uuid unique references auth.users(id) on delete set null;

update public.ibta_members m set user_id=u.id
from auth.users u
where m.email=lower(u.email) and u.email_confirmed_at is not null and m.user_id is null;

create or replace function private.ibta_role() returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.ibta_members m join auth.users u on u.id=(select auth.uid())
  where u.email_confirmed_at is not null and m.active
    and (m.user_id=u.id or (m.user_id is null and m.email=lower(u.email)))
$$;

drop policy if exists member_read on public.ibta_members;
create policy member_read on public.ibta_members for select to authenticated
using (user_id=(select auth.uid())
  or (user_id is null and email=lower((select auth.jwt())->>'email'))
  or (select private.ibta_role())='admin');

create or replace function private.ibta_sync_member_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null then
    update public.ibta_members
    set user_id=new.id, email=lower(new.email)
    where user_id=new.id or (user_id is null and email=lower(new.email));
  end if;
  return new;
end $$;
revoke all on function private.ibta_sync_member_identity() from public, anon, authenticated;

create trigger ibta_sync_member_identity
after insert or update of email, email_confirmed_at, last_sign_in_at on auth.users
for each row execute function private.ibta_sync_member_identity();
