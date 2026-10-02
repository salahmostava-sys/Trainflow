begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000000301','format-admin@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000302','format-user@example.invalid',now()),
 ('00000000-0000-4000-8000-000000000303','format-other@example.invalid',now());
insert into public.ibta_members(email,user_id,role,active) values
 ('format-admin@example.invalid','00000000-0000-4000-8000-000000000301','admin',true),
 ('format-user@example.invalid','00000000-0000-4000-8000-000000000302','operator',true),
 ('format-other@example.invalid','00000000-0000-4000-8000-000000000303','operator',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000302","role":"authenticated"}',true);
do $$ declare v bigint; f jsonb:='{"direction":"rtl","fontSize":18,"hidden":[1,10],"styles":{"0:4":{"bg":"#fff2cc","color":"#112233","bold":true,"size":20}}}';begin
  v:=public.ibta_save_trainee_sheet_formatted(auth.uid(),'[]',0,f);
  if v<>1 or (select format from public.ibta_trainee_sheets where owner_id=auth.uid())<>f then raise exception 'FAIL: initial format save'; end if;
  -- An already open older client still saves cells without erasing formatting.
  perform public.ibta_save_trainee_sheet(auth.uid(),'[]',1);
  if (select format from public.ibta_trainee_sheets where owner_id=auth.uid())<>f then raise exception 'FAIL: legacy client lost format'; end if;
  begin
    perform public.ibta_save_trainee_sheet_formatted(auth.uid(),'[]',1,'{}');raise exception 'FAIL: stale format overwrite';
  exception when raise_exception then if sqlerrm not like 'CONFLICT:%' then raise;end if;end;
  begin
    perform public.ibta_save_trainee_sheet_formatted('00000000-0000-4000-8000-000000000303','[]',0,f);raise exception 'FAIL: foreign format write';
  exception when raise_exception then if sqlerrm<>'Access denied' then raise;end if;end;
  if private.ibta_valid_sheet_format('{"styles":{"0:0":{"bg":"url(https://example.invalid)"}}}')
     or private.ibta_valid_sheet_format('{"fontSize":999}')
     or private.ibta_valid_sheet_format('{"styles":{"1000000:0":{"bold":true}}}')
     or private.ibta_valid_sheet_format('{"hidden":[1,1]}')
     or private.ibta_valid_sheet_format('{"hidden":[500]}')
     or private.ibta_valid_sheet_format('{"direction":"other"}') then raise exception 'FAIL: invalid format accepted';end if;
  begin
    update public.ibta_trainee_sheets set format='{"fontSize":999}' where owner_id=auth.uid();raise exception 'FAIL: direct invalid format allowed';
  exception when check_violation then null;end;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000303","role":"authenticated"}',true);
do $$ declare n integer;begin
  if exists(select 1 from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000302') then raise exception 'FAIL: foreign format read';end if;
  update public.ibta_trainee_sheets set format='{}' where owner_id='00000000-0000-4000-8000-000000000302';get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: foreign format updated';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000301","role":"authenticated"}',true);
do $$ declare backup jsonb; original jsonb;begin
  select format into original from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000302';
  select jsonb_build_object('settings',(select payload from public.ibta_settings where id=1),
    'codes',coalesce((select jsonb_agg(to_jsonb(c)) from public.ibta_codes c),'[]'),
    'traineeSheets',(select jsonb_agg(jsonb_build_object('owner_id',owner_id,'cells',cells,'format',format)) from public.ibta_trainee_sheets)) into backup;
  update public.ibta_trainee_sheets set format='{}' where owner_id='00000000-0000-4000-8000-000000000302';
  perform public.ibta_restore_backup(backup,(select version from public.ibta_settings where id=1));
  if (select format from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000302')<>original then raise exception 'FAIL: backup format restore';end if;
  backup:=jsonb_set(backup,'{traineeSheets}',(select jsonb_agg(x-'format') from jsonb_array_elements(backup->'traineeSheets') x));
  perform public.ibta_restore_backup(backup,(select version from public.ibta_settings where id=1));
  if (select format from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000302')<>original then raise exception 'FAIL: old backup erased format';end if;
end $$;
set local role anon;
do $$ begin
  begin perform public.ibta_save_trainee_sheet_formatted(null,'[]',0,'{}');raise exception 'FAIL: anonymous formatted save';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'PASS: formatting persistence, privacy, validation, optimistic locking, legacy clients and backup restore' as result;
