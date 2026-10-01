-- Track the supervisor's unallocated codes separately from codes already received.
create table public.ibta_supervisor_stock (
  category text primary key check (length(category) between 1 and 100),
  remaining integer not null check (remaining between 0 and 1000000),
  updated_at timestamptz not null default now()
);
alter table public.ibta_supervisor_stock enable row level security;
revoke all on public.ibta_supervisor_stock from anon, authenticated;
grant select, insert, update, delete on public.ibta_supervisor_stock to authenticated;
create policy supervisor_stock_read on public.ibta_supervisor_stock for select to authenticated
  using ((select private.ibta_role()) is not null);
create policy supervisor_stock_write on public.ibta_supervisor_stock for all to authenticated
  using ((select private.ibta_role())='admin')
  with check ((select private.ibta_role())='admin');

create table public.ibta_supervisor_stock_events (
  id bigint generated always as identity primary key,
  category text not null check (length(category) between 1 and 100),
  change_amount integer not null,
  balance_after integer not null check (balance_after between 0 and 1000000),
  reason text not null check (reason in ('opening','replenishment','correction','allocation')),
  actor uuid references auth.users(id) on delete set null,
  happened_at timestamptz not null default now()
);
create index ibta_supervisor_stock_events_time_idx on public.ibta_supervisor_stock_events(happened_at desc);
alter table public.ibta_supervisor_stock_events enable row level security;
revoke all on public.ibta_supervisor_stock_events from anon, authenticated;
grant select, insert on public.ibta_supervisor_stock_events to authenticated;
grant usage, select on sequence public.ibta_supervisor_stock_events_id_seq to authenticated;
create policy supervisor_stock_events_read on public.ibta_supervisor_stock_events for select to authenticated
  using ((select private.ibta_role()) is not null);
create policy supervisor_stock_events_insert on public.ibta_supervisor_stock_events for insert to authenticated
  with check ((select private.ibta_role())='admin' and actor=(select auth.uid()));

create function public.ibta_change_supervisor_stock(target_category text, mode text, quantity integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare prior integer; result integer;
begin
  if private.ibta_role() is distinct from 'admin' then raise exception 'Access denied'; end if;
  if target_category is null or length(target_category) not between 1 and 100
     or not exists(select 1 from jsonb_array_elements_text(
       (select payload->'codeCategories' from public.ibta_settings where id=1)) as item(value)
       where item.value=target_category)
     or quantity is null or quantity<0 or quantity>1000000
     or mode is null or mode not in ('opening','replenishment','correction')
     or (mode='replenishment' and quantity=0) then
    raise exception 'IBTA_INVALID_STOCK_CHANGE';
  end if;
  if mode='opening' then
    insert into public.ibta_supervisor_stock(category,remaining)
    values(target_category,quantity) on conflict do nothing;
    if not found then raise exception 'CONFLICT: stock already initialized'; end if;
    result:=quantity;
  else
    select remaining into prior from public.ibta_supervisor_stock
      where category=target_category for update;
    if not found then raise exception 'IBTA_STOCK_NOT_SET'; end if;
    result:=case when mode='replenishment' then prior+quantity else quantity end;
    if result>1000000 then raise exception 'IBTA_INVALID_STOCK_CHANGE'; end if;
    update public.ibta_supervisor_stock set remaining=result,updated_at=now()
      where category=target_category;
  end if;
  insert into public.ibta_supervisor_stock_events(category,change_amount,balance_after,reason,actor)
    values(target_category,case when mode='opening' then quantity else result-prior end,result,mode,auth.uid());
  return result;
end $$;
revoke all on function public.ibta_change_supervisor_stock(text,text,integer) from public,anon;
grant execute on function public.ibta_change_supervisor_stock(text,text,integer) to authenticated;

-- The standard insert and file import both start at version 1. Edits and restores
-- preserve a later version, so neither is mistaken for a new delivery.
create function private.ibta_allocate_supervisor_stock()
returns trigger language plpgsql security invoker set search_path='' as $$
declare balance integer;
begin
  if new.version<>1 then return new; end if;
  update public.ibta_supervisor_stock
    set remaining=remaining-1,updated_at=now()
    where category=new.category and remaining>0
    returning remaining into balance;
  if not found then
    if exists(select 1 from public.ibta_supervisor_stock where category=new.category) then
      raise exception 'IBTA_STOCK_INSUFFICIENT';
    end if;
    raise exception 'IBTA_STOCK_NOT_SET';
  end if;
  insert into public.ibta_supervisor_stock_events(category,change_amount,balance_after,reason,actor)
    values(new.category,-1,balance,'allocation',auth.uid());
  return new;
end $$;
revoke all on function private.ibta_allocate_supervisor_stock() from public,anon,authenticated;
create trigger allocate_supervisor_stock after insert on public.ibta_codes
  for each row execute function private.ibta_allocate_supervisor_stock();

-- Backups made after this migration include the supervisor balances. Older
-- backups remain restorable and leave the manually configured balances alone.
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
  insert into public.ibta_codes(code,category,notes,used_on,used_by,version)
  select r.code,r.category,coalesce(r.notes,''),r.used_on,
    case when r.used_on is null then null else r.used_by end,restored_version
  from jsonb_to_recordset(backup->'codes') as r(
    code text,category text,notes text,used_on text,used_by uuid
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
