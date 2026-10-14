-- Dedicated, fully migrated local test database only; all dummy records roll back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
 ('00000000-0000-4000-8000-000000001401','quota-owner@example.invalid',now()),
 ('00000000-0000-4000-8000-000000001402','quota-other@example.invalid',now());
insert into public.ibta_members(email,user_id,role,active) values
 ('quota-owner@example.invalid','00000000-0000-4000-8000-000000001401','operator',true),
 ('quota-other@example.invalid','00000000-0000-4000-8000-000000001402','operator',true);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001401","role":"authenticated"}',true);

do $test$
declare v bigint; denied boolean=false;
begin
  insert into public.ibta_trainee_sheets(owner_id) values(auth.uid());
  for i in 2..100 loop
    insert into public.ibta_trainee_sheets(owner_id,sheet_id,sheet_name) values(auth.uid(),gen_random_uuid(),'Quota '||i);
  end loop;
  begin
    insert into public.ibta_trainee_sheets(owner_id,sheet_id) values(auth.uid(),gen_random_uuid());
  exception when raise_exception then
    if sqlerrm<>'WORKSHEET_LIMIT' then raise; end if;
    denied=true;
  end;
  if not denied then raise exception '101st direct insertion exceeded owner quota'; end if;
  denied=false;
  begin
    perform public.ibta_trainee_worksheet_action(auth.uid(),'00000000-0000-0000-0000-000000000001','copy');
  exception when raise_exception then
    if sqlerrm<>'WORKSHEET_LIMIT' then raise; end if;
    denied=true;
  end;
  if not denied then raise exception 'Copy exceeded owner quota'; end if;
  select version into v from public.ibta_trainee_sheets where owner_id=auth.uid() and sheet_id='00000000-0000-0000-0000-000000000001';
  perform public.ibta_save_trainee_worksheet(auth.uid(),'00000000-0000-0000-0000-000000000001','[]',v,'{}');
  delete from public.ibta_trainee_sheets where owner_id=auth.uid() and sheet_id<>( '00000000-0000-0000-0000-000000000001')::uuid
    and sheet_id=(select sheet_id from public.ibta_trainee_sheets where owner_id=auth.uid() and sheet_id<>'00000000-0000-0000-0000-000000000001' limit 1);
  insert into public.ibta_trainee_sheets(owner_id,sheet_id) values(auth.uid(),gen_random_uuid());
  if (select count(*) from public.ibta_trainee_sheets where owner_id=auth.uid())<>100 then raise exception 'Deletion did not release quota capacity'; end if;
end $test$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000001402","role":"authenticated"}',true);
insert into public.ibta_trainee_sheets(owner_id) values(auth.uid());
do $test$ begin
  if (select count(*) from public.ibta_trainee_sheets)<>1 then raise exception 'Owner isolation regressed'; end if;
end $test$;
rollback;
