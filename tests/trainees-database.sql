-- All fixtures and writes are rolled back, including administrator backup/restore tests.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000201','sheet-admin@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000202','sheet-user-a@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000203','sheet-user-b@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000204','sheet-outsider@example.invalid',now());
insert into public.ibta_members(email,user_id,role,active) values
 ('sheet-admin@example.invalid','00000000-0000-4000-8000-000000000201','admin',true),
 ('sheet-user-a@example.invalid','00000000-0000-4000-8000-000000000202','operator',true),
 ('sheet-user-b@example.invalid','00000000-0000-4000-8000-000000000203','copy_only',true);
-- Later versions bypass the existing new-delivery stock trigger, exactly as restores do.
insert into public.ibta_codes(code,category,owner_id,version) values
 ('SHEET-TEST-A','Test','00000000-0000-4000-8000-000000000202',10),
 ('SHEET-TEST-B','Test','00000000-0000-4000-8000-000000000203',10),
 ('SHEET-TEST-POOL','Test',null,10);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
do $$ declare v bigint;n integer; begin
  v:=public.ibta_save_trainee_sheet(auth.uid(),'[["A","","اسم تجريبي","","00123","0501234567","","","","","","ناجح","001234567"]]',0);
  if v<>1 then raise exception 'FAIL: initial version'; end if;
  if (select cells->0->>12 from public.ibta_trainee_sheets where owner_id=auth.uid())<>'001234567' then raise exception 'FAIL: ID lost leading zeros'; end if;
  v:=public.ibta_save_trainee_sheet(auth.uid(),'[]',v);
  if v<>2 then raise exception 'FAIL: version increment'; end if;
  begin
    perform public.ibta_save_trainee_sheet(auth.uid(),'[]',1);
    raise exception 'FAIL: stale save allowed';
  exception when raise_exception then if sqlerrm not like 'CONFLICT:%' then raise; end if; end;
  begin
    perform public.ibta_save_trainee_sheet('00000000-0000-4000-8000-000000000203','[]',0);
    raise exception 'FAIL: another user sheet allowed';
  exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end;
  begin
    insert into public.ibta_trainee_sheets(owner_id,cells) values('00000000-0000-4000-8000-000000000203','[]');
    raise exception 'FAIL: direct foreign insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.ibta_trainee_sheets set owner_id='00000000-0000-4000-8000-000000000203' where owner_id=auth.uid();
    raise exception 'FAIL: sheet owner changed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.ibta_trainee_sheets where owner_id=auth.uid();
    raise exception 'FAIL: version counter deleted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ibta_save_trainee_sheet(auth.uid(),'[["bad"]]',2);
    raise exception 'FAIL: invalid shape accepted';
  exception when raise_exception then if sqlerrm<>'Invalid sheet' then raise; end if; end;
  if exists(select 1 from public.ibta_codes where code in ('SHEET-TEST-B','SHEET-TEST-POOL')) then raise exception 'FAIL: foreign/pool codes exposed'; end if;
  update public.ibta_codes set notes='intrusion' where code='SHEET-TEST-B';get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: foreign code updated'; end if;
  begin
    update public.ibta_codes set owner_id='00000000-0000-4000-8000-000000000203' where code='SHEET-TEST-A';
    raise exception 'FAIL: owner changed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.ibta_assign_codes(auth.uid(),'[{"code":"SHEET-TEST-POOL","version":10}]');
    raise exception 'FAIL: operator assigned codes';
  exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end;
  if exists(select 1 from public.ibta_claim_code('SHEET-TEST-B',10,'01/10/2026')) then raise exception 'FAIL: foreign claim succeeded'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
do $$ declare n integer; begin
  if exists(select 1 from public.ibta_trainee_sheets) then raise exception 'FAIL: foreign sheet exposed'; end if;
  update public.ibta_trainee_sheets set cells='[]' where owner_id='00000000-0000-4000-8000-000000000202';get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: foreign sheet updated'; end if;
  perform public.ibta_save_trainee_sheet(auth.uid(),'[]',0);
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated"}',true);
do $$ declare n integer; begin
  if (select count(*) from public.ibta_trainee_sheets where owner_id in ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000203'))<>2 then raise exception 'FAIL: admin visibility'; end if;
  perform public.ibta_save_trainee_sheet('00000000-0000-4000-8000-000000000202','[]',2);
  perform public.ibta_assign_codes('00000000-0000-4000-8000-000000000202','[{"code":"SHEET-TEST-POOL","version":10}]');
  if (select owner_id from public.ibta_codes where code='SHEET-TEST-POOL')<>'00000000-0000-4000-8000-000000000202'::uuid then raise exception 'FAIL: assignment'; end if;
  begin
    perform public.ibta_assign_codes('00000000-0000-4000-8000-000000000203','[{"code":"SHEET-TEST-POOL","version":10}]');
    raise exception 'FAIL: stale allocation succeeded';
  exception when raise_exception then if sqlerrm not like 'CONFLICT:%' then raise; end if; end;
  perform public.ibta_apply_changes('[{"op":"replace","code":"SHEET-TEST-POOL","version":11,"new_code":"SHEET-TEST-RENAMED","new_category":"Test","notes":"edited"}]');
  if (select owner_id from public.ibta_codes where code='SHEET-TEST-RENAMED')<>'00000000-0000-4000-8000-000000000202'::uuid then raise exception 'FAIL: edit lost code owner'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
do $$ begin
  if not exists(select 1 from public.ibta_codes where code='SHEET-TEST-RENAMED') then raise exception 'FAIL: assigned code invisible'; end if;
  if not exists(select 1 from public.ibta_claim_code('SHEET-TEST-RENAMED',12,'01/10/2026')) then raise exception 'FAIL: cannot claim assigned code'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000201","role":"authenticated"}',true);
do $$ declare backup jsonb; before_version bigint; before_owner uuid; begin
  begin
    perform public.ibta_assign_codes(null,'[{"code":"SHEET-TEST-RENAMED","version":13}]');
    raise exception 'FAIL: used code reassigned';
  exception when raise_exception then if sqlerrm<>'Used codes cannot be reassigned' then raise; end if; end;
  select version into before_version from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000202';
  select jsonb_build_object('settings',(select payload from public.ibta_settings where id=1),
    'codes',(select jsonb_agg(to_jsonb(c)) from public.ibta_codes c),
    'traineeSheets',(select jsonb_agg(jsonb_build_object('owner_id',owner_id,'cells',cells)) from public.ibta_trainee_sheets)) into backup;
  perform public.ibta_restore_backup(backup,(select version from public.ibta_settings where id=1));
  if (select owner_id from public.ibta_codes where code='SHEET-TEST-RENAMED')<>'00000000-0000-4000-8000-000000000202'::uuid then raise exception 'FAIL: restore lost owner'; end if;
  if (select version from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000202')<=before_version then raise exception 'FAIL: restore reset sheet version'; end if;
  -- An old backup without owner fields must preserve existing code assignments and sheets.
  backup:=backup-'traineeSheets';
  backup:=jsonb_set(backup,'{codes}',(select jsonb_agg(x-'owner_id') from jsonb_array_elements(backup->'codes') x));
  perform public.ibta_restore_backup(backup,(select version from public.ibta_settings where id=1));
  if (select owner_id from public.ibta_codes where code='SHEET-TEST-RENAMED')<>'00000000-0000-4000-8000-000000000202'::uuid then raise exception 'FAIL: legacy restore lost owner'; end if;
  if not exists(select 1 from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000202') then raise exception 'FAIL: legacy restore erased sheets'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000204","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.ibta_trainee_sheets) or exists(select 1 from public.ibta_codes) then raise exception 'FAIL: outsider reads'; end if;
  begin
    perform public.ibta_save_trainee_sheet(auth.uid(),'[]',0);
    raise exception 'FAIL: outsider save';
  exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end;
end $$;
reset role;
update public.ibta_members set active=false where user_id='00000000-0000-4000-8000-000000000202';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.ibta_trainee_sheets) or exists(select 1 from public.ibta_codes) then raise exception 'FAIL: inactive access'; end if;
  begin
    perform public.ibta_save_trainee_sheet(auth.uid(),'[]',0);
    raise exception 'FAIL: inactive save';
  exception when raise_exception then if sqlerrm<>'Access denied' then raise; end if; end;
end $$;
set local role anon;
do $$ begin
  begin perform 1 from public.ibta_trainee_sheets;raise exception 'FAIL: anonymous sheet read';exception when insufficient_privilege then null;end;
  begin perform public.ibta_save_trainee_sheet(null,'[]',0);raise exception 'FAIL: anonymous save';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: private sheets, ownership, admin access, atomic versions, claims, inactive/anonymous denial' as result;
