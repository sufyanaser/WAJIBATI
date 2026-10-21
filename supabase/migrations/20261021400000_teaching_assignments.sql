-- Teaching assignments: many-to-many teacher × subject × section
-- Replaces the single teachers.subject_id FK for multi-subject teachers.
-- teachers.subject_id is kept for backwards compat (HomeworkEntry timetable lookup).

create table if not exists teaching_assignments (
  id          serial primary key,
  teacher_id  int  not null references teachers(id)  on delete cascade,
  subject_id  smallint not null references subjects(id) on delete cascade,
  section_id  int  references sections(id) on delete cascade,  -- null = all sections
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (teacher_id, subject_id, section_id)
);

create index on teaching_assignments(teacher_id);
create index on teaching_assignments(subject_id);
create index on teaching_assignments(section_id);

alter table teaching_assignments enable row level security;
create policy ta_staff_read  on teaching_assignments for select using (is_staff());
create policy ta_admin_write on teaching_assignments for all
  using (is_admin()) with check (is_admin());
-- guardians read teachers for their sections via timetable join — no direct policy needed

-- Helper: get teachers who teach a given subject in a given section (for homework quick-fill)
create or replace function get_section_subject_teachers(
  p_section_id int,
  p_subject_id int
) returns table (teacher_id int, full_name text)
language sql stable security definer set search_path = public as $$
  select distinct t.id, t.full_name
  from teaching_assignments ta
  join teachers t on t.id = ta.teacher_id and t.active
  where ta.subject_id = p_subject_id
    and (ta.section_id = p_section_id or ta.section_id is null)
    and ta.active
  order by t.full_name;
$$;

-- Back-fill: create assignments from existing timetable rows (idempotent)
insert into teaching_assignments (teacher_id, subject_id, section_id)
select distinct tt.teacher_id, tt.subject_id, tt.section_id
from timetable tt
where tt.teacher_id is not null
on conflict do nothing;
