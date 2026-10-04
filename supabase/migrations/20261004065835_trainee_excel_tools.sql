-- Extend the existing private formatting validator; ownership and save RPCs are unchanged.
create or replace function private.ibta_valid_sheet_format(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item record; attribute record; col jsonb; header record; n numeric;
begin
  if value is null or jsonb_typeof(value)<>'object' or octet_length(value::text)>25000000 then return false; end if;
  if exists(select 1 from jsonb_object_keys(value) k where k not in ('direction','fontSize','hidden','styles','headers','colHeaders')) then return false; end if;
  if value ? 'direction' and (value->>'direction' is null or value->>'direction' not in ('rtl','ltr')) then return false; end if;
  if value ? 'fontSize' then
    if jsonb_typeof(value->'fontSize')<>'number' or (value->>'fontSize')::numeric not between 10 and 32 or (value->>'fontSize')::numeric<>trunc((value->>'fontSize')::numeric) then return false; end if;
  end if;
  if value ? 'hidden' then
    if jsonb_typeof(value->'hidden')<>'array' then return false; end if;
    for col in select v from jsonb_array_elements(value->'hidden') as x(v) loop
      if jsonb_typeof(col)<>'number' or col::text !~ '^(0|[1-9][0-9]*)$' or length(col::text)>3 then return false; end if;
      if col::text::numeric>=500 then return false; end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(value->'hidden') c group by c having count(*)>1) then return false; end if;
  end if;
  if value ? 'headers' then
    if jsonb_typeof(value->'headers')<>'object' then return false; end if;
    for header in select * from jsonb_each(value->'headers') loop
      if header.key !~ '^(0|[1-9][0-9]*)$' or length(header.key)>3 or jsonb_typeof(header.value)<>'string' or length(header.value#>>'{}')>100 then return false; end if;
      if header.key::numeric>=500 then return false; end if;
    end loop;
  end if;
  if value ? 'styles' then
    if jsonb_typeof(value->'styles')<>'object' then return false; end if;
    for item in select * from jsonb_each(value->'styles') loop
      if item.key !~ '^(0|[1-9][0-9]*):(0|[1-9][0-9]*)$' or length(split_part(item.key,':',1))>6 or length(split_part(item.key,':',2))>3 then return false; end if;
      if split_part(item.key,':',1)::numeric>=1000000 or split_part(item.key,':',2)::numeric>=500 or jsonb_typeof(item.value)<>'object' then return false; end if;
      for attribute in select * from jsonb_each(item.value) loop
        if attribute.key in ('bg','color') then
          if jsonb_typeof(attribute.value)<>'string' or (attribute.value#>>'{}') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
        elsif attribute.key in ('bold','italic','underline','strike','wrap','borderTop','borderBottom','borderLeft','borderRight') then
          if jsonb_typeof(attribute.value)<>'boolean' then return false; end if;
        elsif attribute.key='font' then
          if jsonb_typeof(attribute.value)<>'string' or attribute.value#>>'{}' not in ('Arial','Calibri','Tahoma','Segoe UI','Times New Roman','IBM Plex Sans Arabic') then return false; end if;
        elsif attribute.key='align' then
          if jsonb_typeof(attribute.value)<>'string' or attribute.value#>>'{}' not in ('left','center','right') then return false; end if;
        elsif attribute.key='valign' then
          if jsonb_typeof(attribute.value)<>'string' or attribute.value#>>'{}' not in ('top','middle','bottom') then return false; end if;
        elsif attribute.key='border' then
          if jsonb_typeof(attribute.value)<>'string' or attribute.value#>>'{}' not in ('none','all','outline','top','bottom','left','right') then return false; end if;
        elsif attribute.key in ('size','indent','rotation','height','mergeCols','mergeRows') then
          if jsonb_typeof(attribute.value)<>'number' then return false; end if;
          n=(attribute.value#>>'{}')::numeric;if n<>trunc(n) then return false; end if;
          if attribute.key='size' and n not between 10 and 32 then return false; end if;
          if attribute.key='indent' and n not between 0 and 15 then return false; end if;
          if attribute.key='rotation' and n not between -90 and 90 then return false; end if;
          if attribute.key='height' and n not between 20 and 400 then return false; end if;
          if attribute.key='mergeCols' and (n<1 or n+split_part(item.key,':',2)::numeric>500) then return false; end if;
          if attribute.key='mergeRows' and (n<1 or n+split_part(item.key,':',1)::numeric>1000000) then return false; end if;
        else return false;
        end if;
      end loop;
    end loop;
  end if;
  return true;
exception when others then return false;
end $$;
revoke all on function private.ibta_valid_sheet_format(jsonb) from public,anon;
grant execute on function private.ibta_valid_sheet_format(jsonb) to authenticated;
