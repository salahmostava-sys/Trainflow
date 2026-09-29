-- Reject damaged backup settings before an atomic restore can replace current data.
alter table public.ibta_settings add constraint ibta_settings_required_arrays
check (
  coalesce(jsonb_typeof(payload->'categoryOrder')='array',false)
  and coalesce(jsonb_typeof(payload->'codeCategories')='array',false)
  and coalesce(jsonb_typeof(payload->'keycodes')='array',false)
);
