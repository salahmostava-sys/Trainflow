-- Keep supervisor balances readable to the team while limiting each write
-- operation to administrators without duplicate SELECT policies.
drop policy supervisor_stock_write on public.ibta_supervisor_stock;
create policy supervisor_stock_insert on public.ibta_supervisor_stock for insert to authenticated
  with check ((select private.ibta_role())='admin');
create policy supervisor_stock_update on public.ibta_supervisor_stock for update to authenticated
  using ((select private.ibta_role())='admin')
  with check ((select private.ibta_role())='admin');
create policy supervisor_stock_delete on public.ibta_supervisor_stock for delete to authenticated
  using ((select private.ibta_role())='admin');

create index ibta_supervisor_stock_events_actor_idx
  on public.ibta_supervisor_stock_events(actor);
