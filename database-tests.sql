-- Transactional fixtures: all test accounts, codes, and audit rows are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000101','ibta-test-admin@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000102','ibta-test-operator@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000103','ibta-test-stranger@example.invalid',now());
insert into public.ibta_members(email,role) values
 ('ibta-test-admin@example.invalid','admin'),('ibta-test-operator@example.invalid','operator');
insert into public.ibta_codes(code,category) values ('IBTA-TEST-ONLY','Test');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000103","email":"ibta-test-stranger@example.invalid","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.ibta_codes) or exists(select 1 from public.ibta_settings) then raise exception 'FAIL: stranger can read data'; end if;
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
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000101","email":"ibta-test-admin@example.invalid","role":"authenticated"}',true);
do $$ begin
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
    perform public.ibta_claim_code(repeat('x',201),1,'22/09/2026');
    raise exception 'FAIL: oversized claim accepted';
  exception when raise_exception then
    if sqlerrm <> 'Invalid claim' then raise; end if;
  end;
  perform public.ibta_apply_changes('[{"op":"delete","code":"IBTA-TEST-ONLY","version":3}]'::jsonb);
  if exists(select 1 from public.ibta_codes where code='IBTA-TEST-ONLY') then raise exception 'FAIL: admin delete'; end if;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.ibta_settings;
    raise exception 'FAIL: anon can read settings';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: anonymous isolation, membership, atomic claim, stale-write conflict, operator permissions, administrator access, audit, request limits' as result;
