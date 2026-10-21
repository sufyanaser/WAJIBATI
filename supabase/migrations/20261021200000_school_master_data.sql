-- School Master Data: staged, auditable and idempotent imports.
-- This migration is intentionally not applied by this PR.

alter table subjects add column if not exists external_key text;
alter table teachers add column if not exists external_key text;
alter table sections add column if not exists external_key text;
alter table students add column if not exists external_key text;
alter table guardians add column if not exists external_key text;

create unique index if not exists subjects_external_key_uq on subjects(external_key) where external_key is not null;
create unique index if not exists teachers_external_key_uq on teachers(external_key) where external_key is not null;
create unique index if not exists sections_external_key_uq on sections(external_key) where external_key is not null;
create unique index if not exists students_external_key_uq on students(external_key) where external_key is not null;
create unique index if not exists guardians_external_key_uq on guardians(external_key) where external_key is not null;

create table school_account_profiles (
  external_key text primary key,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('owner','editor','viewer')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table school_account_profiles is
  'School account metadata only. Authentication credentials remain exclusively in Supabase Auth.';

create table school_import_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  source_name text not null,
  content_hash text not null,
  payload jsonb not null,
  preview jsonb not null,
  status text not null default 'previewed' check (status in ('previewed','applied','rejected','failed')),
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (created_by, content_hash)
);

create table school_import_audit (
  id bigint generated always as identity primary key,
  batch_id uuid not null references school_import_batches(id) on delete restrict,
  actor_id uuid not null references auth.users(id),
  entity_type text not null,
  entity_key text not null,
  action text not null check (action in ('create','update','unchanged')),
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index school_import_audit_batch_idx on school_import_audit(batch_id, id);

alter table school_account_profiles enable row level security;
alter table school_import_batches enable row level security;
alter table school_import_audit enable row level security;

create policy school_accounts_staff_read on school_account_profiles for select using (is_staff());
create policy school_accounts_admin_write on school_account_profiles for all using (is_admin()) with check (is_admin());
create policy school_batches_owner_read on school_import_batches for select
  using (created_by = auth.uid() and is_admin());
create policy school_batches_owner_insert on school_import_batches for insert
  with check (created_by = auth.uid() and is_admin());
create policy school_audit_staff_read on school_import_audit for select using (is_staff());

create or replace function apply_school_master_data(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  b school_import_batches%rowtype;
  item jsonb;
  actor uuid := auth.uid();
  before_row jsonb;
  entity_action text;
  affected int := 0;
begin
  if actor is null or not exists (select 1 from admins where user_id = actor and role = 'owner') then
    raise exception 'owner_required';
  end if;

  select * into b from school_import_batches where id = p_batch_id for update;
  if not found or b.created_by <> actor then raise exception 'batch_not_found'; end if;
  if b.status = 'applied' then
    return jsonb_build_object('batch_id', b.id, 'status', 'applied', 'idempotent', true);
  end if;
  if b.status <> 'previewed' then raise exception 'batch_not_applicable'; end if;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'subjects','[]'::jsonb)) loop
    select to_jsonb(s) into before_row from subjects s where external_key = item->>'external_key';
    entity_action := case when before_row is null then 'create' when before_row - 'id' =
      jsonb_build_object('name',item->>'name','color',nullif(item->>'color',''),'icon',nullif(item->>'icon',''),'sort',coalesce((item->>'sort')::smallint,0),'external_key',item->>'external_key') then 'unchanged' else 'update' end;
    insert into subjects(external_key,name,color,icon,sort) values(item->>'external_key',item->>'name',nullif(item->>'color',''),nullif(item->>'icon',''),coalesce((item->>'sort')::smallint,0))
    on conflict (external_key) where external_key is not null do update set name=excluded.name,color=excluded.color,icon=excluded.icon,sort=excluded.sort;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,before_data,after_data)
    values(b.id,actor,'subject',item->>'external_key',entity_action,before_row,item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'teachers','[]'::jsonb)) loop
    select to_jsonb(t) into before_row from teachers t where external_key = item->>'external_key';
    entity_action := case when before_row is null then 'create' else 'update' end;
    insert into teachers(external_key,full_name,subject_id,phone,active)
    select item->>'external_key',item->>'full_name',s.id,nullif(item->>'phone',''),coalesce((item->>'active')::boolean,true)
    from subjects s where s.external_key=item->>'subject_key'
    on conflict (external_key) where external_key is not null do update set full_name=excluded.full_name,subject_id=excluded.subject_id,phone=excluded.phone,active=excluded.active;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,before_data,after_data)
    values(b.id,actor,'teacher',item->>'external_key',entity_action,before_row,item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'sections','[]'::jsonb)) loop
    select to_jsonb(x) into before_row from sections x where external_key=item->>'external_key';
    entity_action := case when before_row is null then 'create' else 'update' end;
    insert into sections(external_key,year_id,stage_id,letter,active)
    select item->>'external_key',y.id,s.id,item->>'letter',coalesce((item->>'active')::boolean,true)
    from academic_years y cross join stages s where y.label=item->>'academic_year' and s.name=item->>'stage' and s.branch=item->>'branch'
    on conflict (external_key) where external_key is not null do update set year_id=excluded.year_id,stage_id=excluded.stage_id,letter=excluded.letter,active=excluded.active;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,before_data,after_data)
    values(b.id,actor,'section',item->>'external_key',entity_action,before_row,item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'students','[]'::jsonb)) loop
    select to_jsonb(x) into before_row from students x where external_key=item->>'external_key';
    entity_action := case when before_row is null then 'create' else 'update' end;
    insert into students(external_key,full_name,section_id,active,notes)
    select item->>'external_key',item->>'full_name',s.id,coalesce((item->>'active')::boolean,true),nullif(item->>'notes','') from sections s where s.external_key=item->>'section_key'
    on conflict (external_key) where external_key is not null do update set full_name=excluded.full_name,section_id=excluded.section_id,active=excluded.active,notes=excluded.notes;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,before_data,after_data)
    values(b.id,actor,'student',item->>'external_key',entity_action,before_row,item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'guardians','[]'::jsonb)) loop
    select to_jsonb(x) into before_row from guardians x where external_key=item->>'external_key';
    entity_action := case when before_row is null then 'create' else 'update' end;
    insert into guardians(external_key,full_name,phone,alt_phone,active)
    values(item->>'external_key',item->>'full_name',item->>'phone',nullif(item->>'alt_phone',''),coalesce((item->>'active')::boolean,true))
    on conflict (external_key) where external_key is not null do update set full_name=excluded.full_name,phone=excluded.phone,alt_phone=excluded.alt_phone,active=excluded.active;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,before_data,after_data)
    values(b.id,actor,'guardian',item->>'external_key',entity_action,before_row,item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'guardian_students','[]'::jsonb)) loop
    insert into guardian_students(guardian_id,student_id,relation)
    select g.id,s.id,nullif(item->>'relation','') from guardians g cross join students s
    where g.external_key=item->>'guardian_key' and s.external_key=item->>'student_key'
    on conflict (guardian_id,student_id) do update set relation=excluded.relation;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,after_data)
    values(b.id,actor,'guardian_student',(item->>'guardian_key')||':'||(item->>'student_key'),'update',item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'timetable','[]'::jsonb)) loop
    insert into timetable(section_id,weekday,period,subject_id,teacher_id)
    select sec.id,(item->>'weekday')::smallint,(item->>'period')::smallint,sub.id,tea.id
    from sections sec join subjects sub on sub.external_key=item->>'subject_key'
    left join teachers tea on tea.external_key=nullif(item->>'teacher_key','')
    where sec.external_key=item->>'section_key'
    on conflict (section_id,weekday,period) do update set subject_id=excluded.subject_id,teacher_id=excluded.teacher_id;
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,after_data)
    values(b.id,actor,'timetable',(item->>'section_key')||':'||(item->>'weekday')||':'||(item->>'period'),'update',item); affected := affected + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(b.payload->'accounts','[]'::jsonb)) loop
    insert into school_account_profiles(external_key,email,full_name,role,active)
    values(item->>'external_key',lower(item->>'email'),item->>'full_name',item->>'role',coalesce((item->>'active')::boolean,true))
    on conflict (external_key) do update set email=excluded.email,full_name=excluded.full_name,role=excluded.role,active=excluded.active,updated_at=now();
    insert into school_import_audit(batch_id,actor_id,entity_type,entity_key,action,after_data)
    values(b.id,actor,'account',item->>'external_key','update',item); affected := affected + 1;
  end loop;

  update school_import_batches set status='applied',applied_at=now() where id=b.id;
  return jsonb_build_object('batch_id',b.id,'status','applied','affected',affected,'idempotent',false);
end $$;

revoke all on function apply_school_master_data(uuid) from public;
grant execute on function apply_school_master_data(uuid) to authenticated;
