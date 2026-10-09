-- Synthetic worksheets are rolled back; existing trainee records stay untouched.
begin;
do $test$
declare invalid jsonb; uid uuid; worksheet uuid; copied uuid; sheet_version bigint; denied boolean=false;
begin
  if not private.ibta_valid_sheet_format('{"daySeparators":[0,3,999999]}') then raise exception 'Valid separators rejected'; end if;
  for invalid in select v from jsonb_array_elements('[null,{},[null],[true],["1"],[-1],[1.5],[1000000],[0,0]]') x(v) loop
    if private.ibta_valid_sheet_format(jsonb_build_object('daySeparators',invalid)) then raise exception 'Invalid separators accepted: %',invalid; end if;
  end loop;
  if private.ibta_valid_sheet_format('{"daySeparators":[0],"unexpected":true}') then raise exception 'Unknown format accepted'; end if;
  select u.id into uid from auth.users u join public.ibta_members m
    on (m.user_id=u.id or (m.user_id is null and m.email=lower(u.email)))
    where m.active and m.role='admin' and u.email_confirmed_at is not null limit 1;
  if uid is null then raise exception 'Approved administrator context required'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',uid,'role','authenticated')::text,true);
  set local role authenticated;
  worksheet=public.ibta_trainee_worksheet_action(uid,'00000000-0000-0000-0000-000000000001','create','Separator integration');
  select version into sheet_version from public.ibta_trainee_sheets where owner_id=uid and sheet_id=worksheet;
  perform public.ibta_save_trainee_worksheet(uid,worksheet,'[["Synthetic trainee","","","","","","","","","","","",""]]',sheet_version,'{"daySeparators":[0,3]}');
  copied=public.ibta_trainee_worksheet_action(uid,worksheet,'copy','Separator integration copy');
  if (select format->'daySeparators' from public.ibta_trainee_sheets where owner_id=uid and sheet_id=copied) is distinct from '[0,3]'::jsonb then raise exception 'Copy lost separators'; end if;
  if (select format->'daySeparators' from public.ibta_trainee_sheets where owner_id=uid and sheet_id=worksheet) is distinct from '[0,3]'::jsonb then raise exception 'Save lost separators'; end if;
  begin perform public.ibta_save_trainee_worksheet(uid,worksheet,'[]',sheet_version,'{"daySeparators":[]}');
  exception when others then if sqlerrm like '%CONFLICT%' then denied=true; else raise; end if; end;
  if not denied then raise exception 'Stale separator update accepted'; end if;
end $test$;
rollback;
