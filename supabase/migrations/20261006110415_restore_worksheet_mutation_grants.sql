-- Invoker RPCs need column grants as well as EXECUTE. Existing RLS and guards remain authoritative.
grant update(trainee_name) on public.ibta_codes to authenticated;
grant insert(sheet_id,sheet_name,sheet_order,sheet_hidden,tab_color),
      update(sheet_name,sheet_order,sheet_hidden,tab_color)
  on public.ibta_trainee_sheets to authenticated;
