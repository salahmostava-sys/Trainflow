-- Audit insert, update and delete using worksheet identity, without storing cell contents.
create or replace function private.ibta_audit_sheet()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
  insert into public.ibta_audit(actor,action,entity,record_key)
    values(auth.uid(),tg_op,'ibta_trainee_sheets',
      coalesce(new.owner_id,old.owner_id)::text||':'||coalesce(new.sheet_id,old.sheet_id)::text);
  return null;
end $function$;
drop trigger audit_trainee_sheet on public.ibta_trainee_sheets;
create trigger audit_trainee_sheet after insert or update or delete on public.ibta_trainee_sheets
  for each row execute function private.ibta_audit_sheet();
create or replace function public.ibta_trainee_worksheet_action(target_owner uuid,target_sheet uuid,action text,new_name text default null,new_order integer default null,new_color text default null)
returns uuid language plpgsql set search_path='' AS $function$
declare result uuid; total integer;
begin
  if auth.uid() is null or private.ibta_role() is null or (target_owner is distinct from auth.uid() and private.ibta_role() is distinct from 'admin') then raise exception 'Access denied'; end if;
  if target_owner is null or action not in ('create','copy','delete','rename','move','hide','show','color') then raise exception 'Invalid worksheet action'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_owner::text,0));
  if new_name is not null and length(trim(new_name)) not between 1 and 100 then raise exception 'Invalid worksheet name'; end if;
  if new_color is not null and new_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid tab color'; end if;
  if new_order is not null and new_order not between -100000 and 100000 then raise exception 'Invalid worksheet position'; end if;
  select count(*) into total from public.ibta_trainee_sheets where owner_id=target_owner;
  if total=0 and action='create' then
    insert into public.ibta_trainee_sheets(owner_id) values(target_owner);total=1;
  end if;
  if action in ('create','copy') then
    if total>=100 then raise exception 'WORKSHEET_LIMIT'; end if;
    result=gen_random_uuid();
    if new_order is not null then
      update public.ibta_trainee_sheets set sheet_order=sheet_order+1
        where owner_id=target_owner and sheet_order>=new_order;
    end if;
    if action='create' then
      insert into public.ibta_trainee_sheets(owner_id,sheet_id,sheet_name,sheet_order)
      values(target_owner,result,coalesce(trim(new_name),'Sheet '||(total+1)),coalesce(new_order,total));
    else
      insert into public.ibta_trainee_sheets(owner_id,sheet_id,sheet_name,sheet_order,cells,format,tab_color)
      select owner_id,result,coalesce(trim(new_name),left(sheet_name,93)||' (Copy)'),coalesce(new_order,total),cells,format,tab_color
      from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id=target_sheet;
      if not found then raise exception 'Worksheet not found'; end if;
    end if;
    return result;
  end if;
  if not exists(select 1 from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id=target_sheet) then raise exception 'Worksheet not found'; end if;
  if action in ('delete','hide') and not exists(select 1 from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id<>target_sheet and not sheet_hidden) then raise exception 'LAST_VISIBLE_WORKSHEET'; end if;
  if action='delete' then delete from public.ibta_trainee_sheets where owner_id=target_owner and sheet_id=target_sheet;
  elsif action='rename' then
    if new_name is null then raise exception 'Invalid worksheet name'; end if;
    update public.ibta_trainee_sheets set sheet_name=trim(new_name) where owner_id=target_owner and sheet_id=target_sheet;
  elsif action='move' then
    if new_order is null then raise exception 'Invalid worksheet position'; end if;
    update public.ibta_trainee_sheets set sheet_order=sheet_order+1
      where owner_id=target_owner and sheet_id<>target_sheet and sheet_order>=new_order;
    update public.ibta_trainee_sheets set sheet_order=new_order where owner_id=target_owner and sheet_id=target_sheet;
  elsif action in ('hide','show') then update public.ibta_trainee_sheets set sheet_hidden=(action='hide') where owner_id=target_owner and sheet_id=target_sheet;
  elsif action='color' then update public.ibta_trainee_sheets set tab_color=new_color where owner_id=target_owner and sheet_id=target_sheet;
  end if;
  return target_sheet;
end $function$;
