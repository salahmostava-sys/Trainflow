-- Apply the same owner limit to RPC, direct REST and restore inserts.
create or replace function private.ibta_enforce_worksheet_quota()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
  if tg_op='UPDATE' and new.owner_id is not distinct from old.owner_id then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text,0));
  if tg_op='INSERT' and exists(
    select 1 from public.ibta_trainee_sheets where owner_id=new.owner_id and sheet_id=new.sheet_id
  ) then return new; end if;
  if (select count(*) from public.ibta_trainee_sheets where owner_id=new.owner_id)>=100 then
    raise exception 'WORKSHEET_LIMIT';
  end if;
  return new;
end $function$;

revoke all on function private.ibta_enforce_worksheet_quota() from public,anon,authenticated;
create trigger enforce_worksheet_quota
before insert or update of owner_id on public.ibta_trainee_sheets
for each row execute function private.ibta_enforce_worksheet_quota();
