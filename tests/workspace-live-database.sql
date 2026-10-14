\set ON_ERROR_STOP on
begin;
do $$ begin
  if current_database()<>'trainflow_live_test' then raise exception 'Run only in the isolated trainflow_live_test database'; end if;
end $$;
create role authenticated nologin;
create role anon nologin;
create schema auth;
create schema private;
grant usage on schema auth,private to authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.user',true),'')::uuid $$;
create function private.ibta_role() returns text language sql stable as $$ select nullif(current_setting('test.role',true),'') $$;
create table public.ibta_codes(code text primary key);
create table public.ibta_settings(id int primary key);
create table public.ibta_supervisor_stock(category text primary key);
create table public.ibta_members(email text primary key);
create table public.ibta_trainee_sheets(owner_id uuid,sheet_id uuid,primary key(owner_id,sheet_id));
\ir ../supabase/migrations/20261014120000_workspace_live_changes.sql

insert into public.ibta_codes values('DUMMY-A'),('DUMMY-B');
do $$ begin
  if (select revision from public.ibta_live_changes where key='workspace')<>1 then raise exception 'Bulk insert must produce one invalidation'; end if;
end $$;
update public.ibta_codes set code='DUMMY-C' where code='DUMMY-A';
delete from public.ibta_codes where code='DUMMY-B';
insert into public.ibta_settings values(1);
insert into public.ibta_supervisor_stock values('DUMMY');
insert into public.ibta_members values('dummy@example.invalid');
do $$ begin
  if (select revision from public.ibta_live_changes where key='workspace')<>6 then raise exception 'Shared table updates must invalidate the workspace'; end if;
end $$;
insert into public.ibta_trainee_sheets values
('00000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000001'),
('00000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000001');
delete from public.ibta_trainee_sheets where owner_id='00000000-0000-4000-8000-000000000002';
do $$ begin
  if (select revision from public.ibta_live_changes where owner_id='00000000-0000-4000-8000-000000000002')<>2 then raise exception 'Deleted sheets must notify their owner without publishing old contents'; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='ibta_live_changes') then raise exception 'Missing realtime publication'; end if;
end $$;
set local role authenticated;
select set_config('test.user','00000000-0000-4000-8000-000000000001',true);
select set_config('test.role','operator',true);
do $$ begin
  if (select count(*) from public.ibta_live_changes)<>2 then raise exception 'Operator should read only shared and own invalidations'; end if;
  begin
    perform private.ibta_touch_live(null);
    raise exception 'Client can forge invalidations';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.ibta_live_changes(key) values('workspace');
    raise exception 'Client can write invalidations';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('test.role','admin',true);
do $$ begin
  if (select count(*) from public.ibta_live_changes)<>3 then raise exception 'Administrator should see all invalidations'; end if;
end $$;
select set_config('test.role','',true);
do $$ begin
  if exists(select 1 from public.ibta_live_changes) then raise exception 'Inactive member can read invalidations'; end if;
end $$;
reset role;
rollback;
\echo 'PASS: live invalidations, bulk coalescing, sheet deletion, publication, RLS and client write denial'
