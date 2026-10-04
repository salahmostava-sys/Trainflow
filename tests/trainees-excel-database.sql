-- Read-only validator regression checks; this does not change any trainee records.
begin;
do $$
begin
  if not private.ibta_valid_sheet_format('{"styles":{"0:13":{"font":"Calibri","italic":true,"underline":true,"strike":false,"wrap":true,"align":"left","valign":"top","border":"none","borderTop":true,"borderBottom":false,"indent":2,"rotation":45,"height":48,"mergeCols":2,"mergeRows":2}}}') then raise exception 'New Excel formats rejected'; end if;
  if private.ibta_valid_sheet_format('{"styles":{"0:13":{"font":"url(evil)"}}}') then raise exception 'Unsafe font accepted'; end if;
  if private.ibta_valid_sheet_format('{"styles":{"0:499":{"mergeCols":2}}}') then raise exception 'Out of bounds merge accepted'; end if;
  if private.ibta_valid_sheet_format('{"styles":{"999999:0":{"mergeRows":2}}}') then raise exception 'Out of bounds row merge accepted'; end if;
  if private.ibta_valid_sheet_format('{"styles":{"0:0":{"rotation":91}}}') then raise exception 'Invalid rotation accepted'; end if;
  if private.ibta_valid_sheet_format('{"styles":{"0:0":{"wrap":"true"}}}') then raise exception 'Invalid Boolean accepted'; end if;
end $$;
rollback;
