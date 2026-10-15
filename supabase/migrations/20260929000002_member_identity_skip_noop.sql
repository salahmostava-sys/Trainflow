-- Avoid an audit entry on every sign-in once the membership is already synced.
create or replace function private.ibta_sync_member_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is not null then
    update public.ibta_members
    set user_id=new.id, email=lower(new.email)
    where (user_id=new.id or (user_id is null and email=lower(new.email)))
      and (user_id is distinct from new.id or email is distinct from lower(new.email));
  end if;
  return new;
end $$;
