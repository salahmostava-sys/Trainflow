-- Remove 5,000 row limits to support unlimited trainee spreadsheet rows (up to Excel standard 1,000,000+ rows).

-- 1. Update private.ibta_valid_sheet: remove array length check of 5000 and expand text size limit to 50MB
create or replace function private.ibta_valid_sheet(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare r jsonb; c jsonb;
begin
  if value is null or jsonb_typeof(value)<>'array' or octet_length(value::text)>50000000 then return false; end if;
  for r in select v from jsonb_array_elements(value) as x(v) loop
    if jsonb_typeof(r)<>'array' then return false; end if;
    if jsonb_array_length(r)<>13 then return false; end if;
    for c in select v from jsonb_array_elements(r) as x(v) loop
      if jsonb_typeof(c)<>'string' or length(c#>>'{}')>2000 then return false; end if;
    end loop;
  end loop;
  return true;
end $$;

revoke all on function private.ibta_valid_sheet(jsonb) from public,anon;
grant execute on function private.ibta_valid_sheet(jsonb) to authenticated;

-- 2. Update private.ibta_valid_sheet_format: allow any row index in styles key and remove 5000 row limit
create or replace function private.ibta_valid_sheet_format(value jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item record; attribute record; col jsonb;
begin
  if value is null or jsonb_typeof(value)<>'object' or octet_length(value::text)>25000000 then return false; end if;
  if exists(select 1 from jsonb_object_keys(value) k where k not in ('direction','fontSize','hidden','styles')) then return false; end if;
  if value ? 'direction' and (value->>'direction' is null or value->>'direction' not in ('rtl','ltr')) then return false; end if;
  if value ? 'fontSize' then
    if jsonb_typeof(value->'fontSize')<>'number' or (value->>'fontSize')::numeric not between 10 and 32
       or (value->>'fontSize')::numeric<>trunc((value->>'fontSize')::numeric) then return false; end if;
  end if;
  if value ? 'hidden' then
    if jsonb_typeof(value->'hidden')<>'array' then return false; end if;
    if jsonb_array_length(value->'hidden')>12 then return false; end if;
    for col in select v from jsonb_array_elements(value->'hidden') as x(v) loop
      if jsonb_typeof(col)<>'number' then return false; end if;
      if col::text !~ '^(0|[1-9]|1[0-2])$' then return false; end if;
    end loop;
    if exists(select 1 from jsonb_array_elements(value->'hidden') c group by c having count(*)>1) then return false; end if;
  end if;
  if value ? 'styles' then
    if jsonb_typeof(value->'styles')<>'object' then return false; end if;
    for item in select * from jsonb_each(value->'styles') loop
      if item.key !~ '^(0|[1-9][0-9]*):([0-9]|1[0-2])$' then return false; end if;
      if jsonb_typeof(item.value)<>'object' then return false; end if;
      for attribute in select * from jsonb_each(item.value) loop
        if attribute.key in ('bg','color') then
          if jsonb_typeof(attribute.value)<>'string' or (attribute.value#>>'{}') !~ '^#[0-9a-fA-F]{6}$' then return false; end if;
        elsif attribute.key='bold' then
          if jsonb_typeof(attribute.value)<>'boolean' then return false; end if;
        elsif attribute.key='size' then
          if jsonb_typeof(attribute.value)<>'number' then return false; end if;
          if attribute.value::text !~ '^(1[0-9]|2[0-9]|3[0-2])$' then return false; end if;
        else return false;
        end if;
      end loop;
    end loop;
  end if;
  return true;
end $$;

revoke all on function private.ibta_valid_sheet_format(jsonb) from public,anon;
grant execute on function private.ibta_valid_sheet_format(jsonb) to authenticated;
