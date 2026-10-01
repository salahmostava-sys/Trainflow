-- Transactional fixtures: all test accounts, codes, and audit rows are rolled back.
begin;
update public.ibta_settings set payload=jsonb_set(payload,'{codeCategories}',
  (payload->'codeCategories') || '["Test","Test-Opening"]'::jsonb) where id=1;
insert into public.ibta_supervisor_stock(category,remaining) values ('Test',10);
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000101','ibta-test-admin@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000102','ibta-test-operator@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000103','ibta-test-stranger@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000104','ibta-test-copy@example.invalid',now());
insert into public.ibta_members(email,role) values
 ('ibta-test-admin@example.invalid','admin'),('ibta-test-operator@example.invalid','operator'),
 ('ibta-test-copy@example.invalid','copy_only');
update auth.users set last_sign_in_at=now() where id='00000000-0000-4000-8000-000000000101';
update auth.users set email='ibta-test-admin-new@example.invalid' where id='00000000-0000-4000-8000-000000000101';
do $$ begin
  if not exists(select 1 from public.ibta_members where user_id='00000000-0000-4000-8000-000000000101'
    and email='ibta-test-admin-new@example.invalid' and role='admin') then
    raise exception 'FAIL: confirmed email change lost membership';
  end if;
end $$;
insert into public.ibta_codes(code,category,owner_id) values ('IBTA-TEST-ONLY','Test','00000000-0000-4000-8000-000000000102');
insert into public.ibta_codes(code,category,owner_id) values ('IBTA-TEST-COPY','Test','00000000-0000-4000-8000-000000000104');
do $$ begin
  if (select remaining from public.ibta_supervisor_stock where category='Test')<>8 then
    raise exception 'FAIL: code allocation did not reduce supervisor stock';
  end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","email":"ibta-test-stranger@example.invalid","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.ibta_codes) or exists(select 1 from public.ibta_settings)
     or exists(select 1 from public.ibta_supervisor_stock)
     or exists(select 1 from public.ibta_supervisor_stock_events) then
    raise exception 'FAIL: stranger can read data';
  end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000104","email":"ibta-test-copy@example.invalid","role":"authenticated"}',true);
do $$ declare n int; begin
  select count(*) into n from public.ibta_claim_code('IBTA-TEST-COPY',1,'22/09/2026');
  if n<>1 then raise exception 'FAIL: copy-only user cannot claim'; end if;
  begin
    update public.ibta_codes set notes='unauthorized' where code='IBTA-TEST-COPY';
    raise exception 'FAIL: copy-only user changed notes';
  exception when raise_exception then
    if sqlerrm not like 'Copy-only members%' then raise; end if;
  end;
  begin
    update public.ibta_codes set used_on=null where code='IBTA-TEST-COPY';
    raise exception 'FAIL: copy-only user released code';
  exception when raise_exception then
    if sqlerrm not like 'Copy-only members%' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000102","email":"ibta-test-operator@example.invalid","role":"authenticated"}',true);
do $$ declare n int; begin
  select count(*) into n from public.ibta_claim_code('IBTA-TEST-ONLY',1,'22/09/2026');
  if n<>1 then raise exception 'FAIL: initial claim'; end if;
  select count(*) into n from public.ibta_claim_code('IBTA-TEST-ONLY',1,'22/09/2026');
  if n<>0 then raise exception 'FAIL: duplicate claim'; end if;
  if (select used_by from public.ibta_codes where code='IBTA-TEST-ONLY')<>'00000000-0000-4000-8000-000000000102'::uuid then raise exception 'FAIL: claim ownership'; end if;
  perform public.ibta_apply_changes('[{"op":"update","code":"IBTA-TEST-ONLY","version":2,"notes":"saved note","used_on":"22/09/2026"}]'::jsonb);
  begin
    perform public.ibta_apply_changes('[{"op":"update","code":"IBTA-TEST-ONLY","version":2,"notes":"stale","used_on":null}]'::jsonb);
    raise exception 'FAIL: stale update succeeded';
  exception when raise_exception then
    if sqlerrm not like 'CONFLICT:%' then raise; end if;
  end;
  delete from public.ibta_codes where code='IBTA-TEST-ONLY'; get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: operator can delete'; end if;
  update public.ibta_settings set payload=payload where id=1;get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: operator can change settings'; end if;
  update public.ibta_supervisor_stock set remaining=100 where category='Test';get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: operator can change supervisor stock'; end if;
end $$;
do $$ begin
  begin
    perform public.ibta_import_codes('Test',array['UNAUTHORIZED']);
    raise exception 'FAIL: operator imported codes';
  exception when raise_exception then
    if sqlerrm <> 'Access denied' then raise; end if;
  end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","email":"ibta-test-admin@example.invalid","role":"authenticated"}',true);
do $$ begin
  if public.ibta_change_supervisor_stock('Test-Opening','opening',4)<>4 then
    raise exception 'FAIL: opening stock';
  end if;
  begin
    perform public.ibta_change_supervisor_stock('Test-Opening','opening',9);
    raise exception 'FAIL: opening stock overwritten';
  exception when raise_exception then
    if sqlerrm not like 'CONFLICT:%' then raise; end if;
  end;
  if public.ibta_change_supervisor_stock('Test','replenishment',2)<>10 then
    raise exception 'FAIL: company replenishment';
  end if;
  if public.ibta_change_supervisor_stock('Test','correction',0)<>0 then
    raise exception 'FAIL: stock correction';
  end if;
  begin
    insert into public.ibta_codes(code,category) values ('IBTA-NO-STOCK','Test');
    raise exception 'FAIL: imported beyond supervisor stock';
  exception when raise_exception then
    if sqlerrm<>'IBTA_STOCK_INSUFFICIENT' then raise; end if;
  end;
  perform public.ibta_change_supervisor_stock('Test','correction',8);
  if (select notes from public.ibta_codes where code='IBTA-TEST-ONLY')<>'saved note' then raise exception 'FAIL: saved note'; end if;
  if not exists(select 1 from public.ibta_audit where record_key='IBTA-TEST-ONLY' and actor='00000000-0000-4000-8000-000000000102') then raise exception 'FAIL: audit'; end if;
  begin
    perform public.ibta_apply_changes((select jsonb_agg(jsonb_build_object('op','insert','code','TEST-'||n,'category','Test')) from generate_series(1,251) n));
    raise exception 'FAIL: oversized batch accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid batch' then raise; end if;
  end;
  begin
    perform public.ibta_apply_changes('[]'::jsonb,jsonb_build_object('padding',repeat('x',65536)),1);
    raise exception 'FAIL: oversized settings accepted';
  exception when raise_exception then
    if sqlerrm <> 'Settings too large' then raise; end if;
  end;
  begin
    update public.ibta_settings set payload='{}'::jsonb where id=1;
    raise exception 'FAIL: damaged settings accepted';
  exception when check_violation then null;
  end;
  begin
    perform public.ibta_claim_code(repeat('x',201),1,'22/09/2026');
    raise exception 'FAIL: oversized claim accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid claim' then raise; end if;
  end;
  perform public.ibta_apply_changes('[{"op":"delete","code":"IBTA-TEST-ONLY","version":3}]'::jsonb);
  if exists(select 1 from public.ibta_codes where code='IBTA-TEST-ONLY') then raise exception 'FAIL: admin delete'; end if;
end $$;
do $$ declare backup jsonb; current_version bigint; before_count int; restored int; begin
  restored:=public.ibta_import_codes('Test',array['IBTA-BULK-ONE','IBTA-BULK-TWO','IBTA-BULK-ONE']);
  if restored<>2 then raise exception 'FAIL: bulk import count'; end if;
  if (select remaining from public.ibta_supervisor_stock where category='Test')<>6 then raise exception 'FAIL: import stock debit'; end if;
  select count(*) into before_count from public.ibta_codes;
  select version into current_version from public.ibta_settings where id=1;
  select jsonb_build_object('settings',(select payload from public.ibta_settings where id=1),
    'codes',coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb)) into backup from public.ibta_codes c;
  perform public.ibta_restore_backup(backup,current_version);
  if (select count(*) from public.ibta_codes)<>before_count then raise exception 'FAIL: backup restore count'; end if;
  if (select remaining from public.ibta_supervisor_stock where category='Test')<>6 then raise exception 'FAIL: restore debited stock'; end if;
  begin
    perform public.ibta_restore_backup(backup,current_version);
    raise exception 'FAIL: stale restore succeeded';
  exception when raise_exception then
    if sqlerrm not like 'CONFLICT:%' then raise; end if;
  end;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.ibta_settings;
    raise exception 'FAIL: anon can read settings';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: access isolation, member roles, claims, supervisor stock allocation, import, backup restore, audit, and request limits' as result;

