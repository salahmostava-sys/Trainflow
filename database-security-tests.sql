-- Checks for supabase/migrations/20261015090000_security_hardening.sql.
-- Transactional: every fixture is rolled back. Run after all migrations.
begin;
update public.ibta_settings set payload=jsonb_set(payload,'{codeCategories}',
  (payload->'codeCategories') || '["SecTest"]'::jsonb) where id=1;
insert into public.ibta_supervisor_stock(category,remaining) values ('SecTest',10)
  on conflict (category) do update set remaining=10;
insert into public.ibta_members(email,role) values
 ('sec-admin@example.invalid','admin'),('sec-op@example.invalid','operator'),
 ('sec-copy@example.invalid','copy_only'),('sec-invite@example.invalid','operator');
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000201','sec-admin@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000202','sec-op@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000203','sec-copy@example.invalid',now());

-- An unconfirmed sign-up must not claim an invite; a later confirmation binds it.
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000209','sec-invite@example.invalid',null);
do $$ begin
  if (select user_id from public.ibta_members where email='sec-invite@example.invalid') is not null then
    raise exception 'FAIL: unconfirmed sign-up bound the invite';
  end if;
end $$;
update auth.users set last_sign_in_at=now() where id='00000000-0000-4000-8000-000000000209';
do $$ begin
  if (select user_id from public.ibta_members where email='sec-invite@example.invalid') is not null then
    raise exception 'FAIL: unconfirmed sign-in bound the invite';
  end if;
end $$;
-- member_read: an unconfirmed account sees nothing even though the JWT carries the email.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000209","email":"sec-invite@example.invalid","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.ibta_members) then raise exception 'FAIL: unconfirmed account reads invite'; end if;
end $$;
reset role;
update auth.users set email_confirmed_at=now() where id='00000000-0000-4000-8000-000000000209';
do $$ begin
  if (select user_id from public.ibta_members where email='sec-invite@example.invalid')
     is distinct from '00000000-0000-4000-8000-000000000209'::uuid then
    raise exception 'FAIL: later confirmation did not bind the invite';
  end if;
end $$;

-- Credentials never live in the settings payload.
update public.ibta_settings set payload=payload||'{"credentials":{"account":"legacy-acct","password":"legacy-pass"}}'::jsonb where id=1;
do $$ begin
  if (select payload ? 'credentials' from public.ibta_settings where id=1) then
    raise exception 'FAIL: credentials kept in payload';
  end if;
  if (select account from private.ibta_prometric_credentials where id=1)<>'legacy-acct' then
    raise exception 'FAIL: payload credentials not captured';
  end if;
end $$;

insert into public.ibta_codes(code,category,owner_id) values
 ('SEC-OP-1','SecTest','00000000-0000-4000-8000-000000000202'),
 ('SEC-OP-2','SecTest','00000000-0000-4000-8000-000000000202'),
 ('SEC-OP-3','SecTest','00000000-0000-4000-8000-000000000202'),
 ('SEC-ADMIN-1','SecTest',null);

set local role authenticated;
-- Operator: reads credentials, cannot set them, cannot read the private table.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","email":"sec-op@example.invalid","role":"authenticated"}',true);
do $$ declare n int; d text; begin
  if (select account from public.ibta_get_prometric_credentials())<>'legacy-acct' then
    raise exception 'FAIL: operator cannot read credentials';
  end if;
  begin
    perform public.ibta_set_prometric_credentials('x','y');
    raise exception 'FAIL: operator set credentials';
  exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end;
  begin
    perform 1 from private.ibta_prometric_credentials;
    raise exception 'FAIL: operator read private credentials table';
  exception when insufficient_privilege then null; end;
  -- Claims ignore the client date and use the Riyadh day.
  select used_on into d from public.ibta_claim_code('SEC-OP-1',1,'01/01/2000');
  if d is distinct from private.ibta_riyadh_today() then raise exception 'FAIL: claim used client date %',d; end if;
  select used_on into d from public.ibta_claim_trainee_voucher('SEC-OP-2',1,'01/01/2000','Trainee');
  if d is distinct from private.ibta_riyadh_today() then raise exception 'FAIL: trainee claim used client date'; end if;
  -- Another owner's code cannot be claimed.
  select count(*) into n from public.ibta_claim_code('SEC-ADMIN-1',1,'01/01/2000');
  if n<>0 then raise exception 'FAIL: operator claimed an unassigned code'; end if;
  -- Direct column update is gone.
  begin
    update public.ibta_codes set used_on='01/01/2000' where code='SEC-OP-1';
    raise exception 'FAIL: direct used_on update allowed';
  exception when insufficient_privilege then null; end;
  -- apply_changes: marking an unused code records today, not the sent day.
  perform public.ibta_apply_changes('[{"op":"update","code":"SEC-OP-3","version":1,"notes":"n","used_on":"01/01/2000"}]'::jsonb);
  if (select used_on from public.ibta_codes where code='SEC-OP-3') is distinct from private.ibta_riyadh_today() then
    raise exception 'FAIL: apply_changes kept client date';
  end if;
  -- Changing an existing day is admin-only.
  begin
    perform public.ibta_apply_changes('[{"op":"update","code":"SEC-OP-3","version":2,"notes":"n","used_on":"01/01/2000"}]'::jsonb);
    raise exception 'FAIL: operator re-dated a code';
  exception when raise_exception then if sqlerrm not like 'Only an administrator%' then raise; end if; end;
  -- Releasing an own code still works; notes-only edits keep the day.
  perform public.ibta_apply_changes('[{"op":"update","code":"SEC-OP-3","version":2,"notes":"n2","used_on":null}]'::jsonb);
  if (select used_on from public.ibta_codes where code='SEC-OP-3') is not null then raise exception 'FAIL: release'; end if;
  -- Codes outside the caller's ownership look like a conflict.
  begin
    perform public.ibta_apply_changes('[{"op":"update","code":"SEC-ADMIN-1","version":1,"notes":"x","used_on":null}]'::jsonb);
    raise exception 'FAIL: operator updated an unowned code';
  exception when raise_exception then if sqlerrm not like 'CONFLICT:%' then raise; end if; end;
end $$;

-- Copy-only: no credentials.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","email":"sec-copy@example.invalid","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.ibta_get_prometric_credentials()) then
    raise exception 'FAIL: copy-only member read credentials';
  end if;
end $$;

-- Admin: sets credentials and may record any day.
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","email":"sec-admin@example.invalid","role":"authenticated"}',true);
do $$ declare v bigint; begin
  perform public.ibta_set_prometric_credentials(' new-acct ','new-pass');
  if (select account||'/'||password from public.ibta_get_prometric_credentials())<>'new-acct/new-pass' then
    raise exception 'FAIL: admin credential update';
  end if;
  select version into v from public.ibta_codes where code='SEC-ADMIN-1';
  perform public.ibta_apply_changes(jsonb_build_array(jsonb_build_object('op','update','code','SEC-ADMIN-1','version',v,'notes','','used_on','05/05/2025')));
  if (select used_on from public.ibta_codes where code='SEC-ADMIN-1')<>'05/05/2025' then
    raise exception 'FAIL: admin date edit';
  end if;
  if not exists(select 1 from pg_indexes where indexname='ibta_audit_actor_idx') then
    raise exception 'FAIL: audit actor index missing';
  end if;
end $$;
rollback;
select 'PASS: confirmed-email membership, private credentials, server-side use dates, audit index' as result;
