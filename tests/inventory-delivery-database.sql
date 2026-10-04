-- Run in the dedicated IBTA database. All fixture changes roll back; no HTTP send.
begin;
do $$
declare result jsonb; admin_id uuid; before_count bigint;
begin
  if (select enabled from private.ibta_inventory_delivery where id=1) then raise exception 'TEST_REQUIRES_DISABLED_DELIVERY'; end if;
  select count(*) into before_count from net.http_request_queue;
  perform private.ibta_inventory_delivery_tick();
  if (select count(*) from net.http_request_queue)<>before_count then raise exception 'DISABLED_DELIVERY_SENT'; end if;
  begin perform public.ibta_inventory_delivery_status();raise exception 'MISSING_AUTH_ALLOWED';
    exception when others then if sqlerrm<>'ADMIN_REQUIRED' then raise; end if; end;
  if has_table_privilege('authenticated','private.ibta_inventory_delivery','SELECT')
    or has_function_privilege('authenticated','private.ibta_inventory_delivery_tick()','EXECUTE')
    or has_function_privilege('anon','public.ibta_save_inventory_delivery(jsonb)','EXECUTE') then raise exception 'ACCESS_LEAK'; end if;
  select u.id into admin_id from auth.users u join public.ibta_members m on m.user_id=u.id or (m.user_id is null and m.email=lower(u.email)) where m.active and m.role='admin' and u.email_confirmed_at is not null limit 1;
  if admin_id is null then raise exception 'NO_TEST_ADMIN'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  result:=public.ibta_inventory_delivery_status();
  if result ? 'secret_id' or result ? 'token' then raise exception 'SECRET_IN_STATUS'; end if;
  result:=public.ibta_save_inventory_delivery('{"enabled":false,"time":"14:22","phoneId":"","template":"","language":"ar","apiVersion":"v24.0","token":""}');
  if result->>'time'<>'14:22' then raise exception 'TIME_NOT_SAVED'; end if;
  begin perform public.ibta_save_inventory_delivery('{"enabled":true,"time":"16:59","phoneId":"","template":"","language":"ar","token":""}');raise exception 'UNCONNECTED_ENABLED';
    exception when others then if sqlerrm<>'WHATSAPP_NOT_CONNECTED' then raise; end if; end;
  begin perform public.ibta_save_inventory_delivery('{"enabled":false,"time":"25:01","language":"ar"}');raise exception 'INVALID_TIME_ALLOWED';
    exception when others then if sqlerrm<>'INVALID_OPTIONS' then raise; end if; end;
  if private.ibta_delivery_response('<html>502</html>')<>'{}'::jsonb then raise exception 'NON_JSON_RESPONSE'; end if;
  -- Fixtures use the same aggregate model as the visible inventory.
  insert into public.ibta_supervisor_stock(category,remaining)
    select value,3 from public.ibta_settings,jsonb_array_elements_text(payload->'codeCategories') where id=1
    on conflict(category) do update set remaining=3;
  update public.ibta_settings set payload=jsonb_set(jsonb_set(payload,'{inventoryWhatsappNumber}','"966500000000"'),'{inventoryMessageLanguage}','"ar"') where id=1;
  result:=private.ibta_inventory_template_parameters('2026-10-04');
  if jsonb_array_length(result)<>6 or result->0->>'text'<>'04/10/2026' then raise exception 'TEMPLATE_PARAMETERS_INVALID'; end if;
  if exists(select 1 from jsonb_array_elements(result) p where p->>'type'<>'text' or p->>'text' is null) then raise exception 'TEMPLATE_PARAMETER_EMPTY'; end if;
  -- pg_net starts requests only after COMMIT. This queue and dummy Vault secret
  -- are rolled back, so no message leaves the database during this test.
  perform public.ibta_save_inventory_delivery('{"enabled":true,"time":"00:00","phoneId":"123456789012","template":"ibta_inventory_test","language":"ar","token":"dummy_token_for_transaction_test"}');
  update private.ibta_inventory_delivery set last_dispatch=null where id=1;
  perform private.ibta_inventory_delivery_tick();
  if (select count(*) from net.http_request_queue)<>before_count+1 then raise exception 'DUE_REPORT_NOT_QUEUED'; end if;
  perform private.ibta_inventory_delivery_tick();
  if (select count(*) from net.http_request_queue)<>before_count+1 then raise exception 'DUPLICATE_SEND'; end if;
end $$;
rollback;
