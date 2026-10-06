-- Run against an already migrated test project using the SQL runner.
-- No fixture write survives this transaction; no membership or Auth settings change.
begin;
do $test$
declare
  uid uuid; first uuid='00000000-0000-0000-0000-000000000001';
  independent uuid; copied uuid; original jsonb; v bigint; denied boolean=false;
  snapshot jsonb; target text; claimed public.ibta_codes;
begin
  select u.id into uid from auth.users u join public.ibta_members m
    on (m.user_id=u.id or (m.user_id is null and m.email=lower(u.email)))
    where m.active and m.role='admin' and u.email_confirmed_at is not null limit 1;
  if uid is null then raise exception 'An approved administrator test context is required'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  select cells into original from public.ibta_trainee_sheets where owner_id=uid and sheet_id=first;
  independent=public.ibta_trainee_worksheet_action(uid,first,'create','Integration independent');
  copied=public.ibta_trainee_worksheet_action(uid,first,'copy','Integration copy');
  if (select cells from public.ibta_trainee_sheets where owner_id=uid and sheet_id=copied)
      is distinct from coalesce(original,'[]'::jsonb) then raise exception 'Copy lost values'; end if;
  select version into v from public.ibta_trainee_sheets where owner_id=uid and sheet_id=independent;
  perform public.ibta_save_trainee_worksheet(uid,independent,
    '[ ["Test","","","","","","","","","","","",""] ]',v,
    '{"styles":{"0:0":{"borders":{"top":{"style":"double","color":"#ff0000"}}}},"widths":{"0":160},"hiddenRows":[2]}');
  if (select cells from public.ibta_trainee_sheets where owner_id=uid and sheet_id=first)
      is distinct from original then raise exception 'Independent save changed the original'; end if;
  denied=false;
  begin perform public.ibta_save_trainee_worksheet(uid,independent,'[]',v,'{}');
  exception when others then if sqlerrm like '%CONFLICT%' then denied=true; else raise; end if; end;
  if not denied then raise exception 'Worksheet version guard missing'; end if;
  perform public.ibta_trainee_worksheet_action(uid,independent,'rename','Integration renamed');
  perform public.ibta_trainee_worksheet_action(uid,independent,'color',null,null,'#00aa77');
  perform public.ibta_trainee_worksheet_action(uid,independent,'move',null,-10);
  perform public.ibta_trainee_worksheet_action(uid,copied,'delete');
  perform public.ibta_trainee_worksheet_action(uid,independent,'hide');
  -- Other worksheets could already be present; last-visible behavior is covered by the browser fixture.
  select jsonb_build_object('settings',(select payload from public.ibta_settings where id=1),
    'codes',coalesce((select jsonb_agg(to_jsonb(c)) from public.ibta_codes c),'[]'::jsonb),
    'traineeSheets',coalesce((select jsonb_agg(to_jsonb(s)) from public.ibta_trainee_sheets s),'[]'::jsonb)) into snapshot;
  perform public.ibta_restore_backup(snapshot,(select version from public.ibta_settings where id=1));
  if not exists(select 1 from public.ibta_trainee_sheets where owner_id=uid and sheet_id=independent
    and sheet_name='Integration renamed' and tab_color='#00aa77' and cells->0->>0='Test') then raise exception 'Worksheet restore lost metadata'; end if;
  target='TEST-NAME-'||gen_random_uuid()::text;
  insert into public.ibta_codes(code,category,owner_id,version)
    select target,category,uid,100 from public.ibta_codes limit 1;
  select * into claimed from public.ibta_claim_trainee_voucher(target,100,'06/10/2026','Automatic Trainee');
  if claimed.trainee_name<>'Automatic Trainee' or claimed.used_on is null then raise exception 'Atomic named claim failed'; end if;
  perform public.ibta_set_voucher_trainee_name(target,claimed.version,'Edited trainee');
  denied=false;
  begin perform public.ibta_set_voucher_trainee_name(target,claimed.version,'Stale');
  exception when others then if sqlerrm like '%CONFLICT%' then denied=true; else raise; end if; end;
  if not denied then raise exception 'Voucher version guard missing'; end if;
  perform set_config('request.jwt.claims','{}',true);
  denied=false;
  begin perform public.ibta_set_voucher_trainee_name(target,claimed.version,'Forbidden');
  exception when others then if sqlerrm like '%Access denied%' then denied=true; else raise; end if; end;
  if not denied then raise exception 'Authentication guard missing'; end if;
  if not private.ibta_valid_sheet_format('{"styles":{"0:0":{"borders":{"top":{"style":"double","color":"#00aa77"}}}}}')
    or private.ibta_valid_sheet_format('{"styles":{"0:0":{"borders":{"top":{"style":"evil","color":"red"}}}}}') then raise exception 'Border validation failed'; end if;
end $test$;
rollback;
select 'PASS: worksheet isolation, names, copy/metadata/restore, named claims, conflicts and border validation; all fixture writes rolled back' as result;
