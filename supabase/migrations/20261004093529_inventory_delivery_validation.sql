-- pg_net was newly installed by this feature and has no queued requests.
-- Its extension metadata belongs in extensions; network tables remain in net.
do $$ begin
  if (select extnamespace='public'::regnamespace from pg_extension where extname='pg_net') then
    if exists(select 1 from net.http_request_queue) or exists(select 1 from net._http_response) then
      raise exception 'NETWORK_QUEUE_NOT_EMPTY';
    end if;
    drop extension pg_net;
    create extension pg_net with schema extensions;
  end if;
end $$;
revoke execute on all functions in schema net from public,anon,authenticated;
create policy inventory_delivery_deny on private.ibta_inventory_delivery to authenticated using(false) with check(false);
create policy inventory_delivery_log_deny on private.ibta_inventory_delivery_log to authenticated using(false) with check(false);

create function private.ibta_inventory_delivery_validate() returns trigger
language plpgsql set search_path='' as $$
declare p jsonb;
begin
  if new.enabled then
    select payload into p from public.ibta_settings where id=1;
    if (coalesce(p->>'inventoryMessageLanguage','ar')='en') is distinct from (new.template_language like 'en%') then raise exception 'TEMPLATE_LANGUAGE_MISMATCH'; end if;
    perform private.ibta_inventory_template_parameters((now() at time zone 'Asia/Riyadh')::date);
  end if;
  return new;
end $$;
revoke all on function private.ibta_inventory_delivery_validate() from public,anon,authenticated;
create trigger validate_inventory_delivery before insert or update of enabled,template_language on private.ibta_inventory_delivery for each row execute function private.ibta_inventory_delivery_validate();
