-- Restore inserts a fresh monotonic version to reject stale worksheet editors.
-- UPDATE(version) stays forbidden; existing owner/admin RLS still applies.
grant insert(version) on public.ibta_trainee_sheets to authenticated;
