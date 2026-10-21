-- Rumaila Homework — Day 1: schema + RLS + storage
-- Auth model: guardian = Supabase email/password user
--   email    = <phone_e164_digits>@guardian.rumaila.local   (e.g. 9647801234567@guardian.rumaila.local)
--   password = PIN (6 digits)  → no SMS provider needed
-- Admin = row in public.admins

create extension if not exists pgcrypto;

-- ───────────── Core reference ─────────────
create table academic_years (
  id smallserial primary key,
  label text not null unique,              -- '2026–2027'
  is_current boolean not null default false
);
create unique index one_current_year on academic_years(is_current) where is_current;

create table stages (
  id smallserial primary key,
  name text not null,                      -- الرابع / الخامس / السادس
  branch text not null check (branch in ('علمي','أدبي')),
  sort smallint not null default 0,
  unique (name, branch)
);

create table sections (
  id serial primary key,
  year_id smallint not null references academic_years(id),
  stage_id smallint not null references stages(id),
  letter text not null,                    -- أ ب ج ...
  active boolean not null default true,
  unique (year_id, stage_id, letter)
);

create table subjects (
  id smallserial primary key,
  name text not null unique,
  color text,                              -- hex for UI chip
  icon text,
  sort smallint not null default 0
);

create table teachers (
  id serial primary key,
  full_name text not null,
  subject_id smallint references subjects(id),
  phone text,
  active boolean not null default true
);

create table timetable (
  id serial primary key,
  section_id int not null references sections(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 4),   -- 0=الأحد … 4=الخميس
  period smallint not null check (period between 1 and 6),
  subject_id smallint not null references subjects(id),
  teacher_id int references teachers(id),
  unique (section_id, weekday, period)
);

-- ───────────── People ─────────────
create table students (
  id serial primary key,
  full_name text not null,
  section_id int not null references sections(id),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create index on students(section_id);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  full_name text,
  phone text not null unique check (phone ~ '^\+9647[0-9]{9}$'),
  alt_phone text,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table guardian_students (
  guardian_id uuid not null references guardians(id) on delete cascade,
  student_id int not null references students(id) on delete cascade,
  relation text,
  primary key (guardian_id, student_id)
);
create index on guardian_students(student_id);

create table admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'editor' check (role in ('owner','editor','viewer'))
);

-- ───────────── Content ─────────────
create table homework (
  id uuid primary key default gen_random_uuid(),
  section_id int not null references sections(id) on delete cascade,
  subject_id smallint not null references subjects(id),
  teacher_id int references teachers(id),
  due_date date not null,                  -- the school day it belongs to
  period smallint check (period between 1 and 6),
  body text not null,
  status text not null default 'published' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (to_tsvector('simple', coalesce(body,''))) stored
);
create index on homework(section_id, due_date desc);
create index on homework using gin(search);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references homework(id) on delete cascade,
  storage_path text not null unique,       -- '<section_id>/<homework_id>/<file>'
  mime text not null,
  bytes int,
  created_at timestamptz not null default now()
);

create table notices (
  id uuid primary key default gen_random_uuid(),
  section_id int references sections(id) on delete cascade,  -- null = whole school
  title text not null,
  body text,
  priority smallint not null default 0,    -- 0 normal, 1 important, 2 urgent
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index on notices(section_id, publish_at desc);

create table reads (
  guardian_id uuid not null references guardians(id) on delete cascade,
  section_id int not null references sections(id) on delete cascade,
  day date not null,
  first_read_at timestamptz not null default now(),
  primary key (guardian_id, section_id, day)
);
create index on reads(section_id, day);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references guardians(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);

create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ───────────── Helpers ─────────────
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and role in ('owner','editor'))
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid())
$$;

create or replace function my_guardian_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from guardians where user_id = auth.uid() and active
$$;

create or replace function my_section_ids() returns setof int
language sql stable security definer set search_path = public as $$
  select distinct s.section_id
  from guardians g
  join guardian_students gs on gs.guardian_id = g.id
  join students s on s.id = gs.student_id and s.active
  where g.user_id = auth.uid() and g.active
$$;

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger homework_touch before update on homework for each row execute function touch_updated_at();

-- Guardian marks a day as read (idempotent)
create or replace function mark_read(p_section int, p_day date) returns void
language plpgsql security definer set search_path = public as $$
declare gid uuid := my_guardian_id();
begin
  if gid is null or p_section not in (select my_section_ids()) then
    raise exception 'forbidden';
  end if;
  insert into reads(guardian_id, section_id, day) values (gid, p_section, p_day)
  on conflict do nothing;
  update guardians set last_seen_at = now() where id = gid;
end $$;

-- ───────────── RLS ─────────────
alter table academic_years     enable row level security;
alter table stages             enable row level security;
alter table sections           enable row level security;
alter table subjects           enable row level security;
alter table teachers           enable row level security;
alter table timetable          enable row level security;
alter table students           enable row level security;
alter table guardians          enable row level security;
alter table guardian_students  enable row level security;
alter table admins             enable row level security;
alter table homework           enable row level security;
alter table attachments        enable row level security;
alter table notices            enable row level security;
alter table reads              enable row level security;
alter table push_subscriptions enable row level security;
alter table settings           enable row level security;

-- staff read everything, editors write everything
do $$ declare t text; begin
  foreach t in array array['academic_years','stages','sections','subjects','teachers','timetable',
    'students','guardians','guardian_students','homework','attachments','notices','reads',
    'push_subscriptions','settings'] loop
    execute format('create policy staff_read on %I for select using (is_staff())', t);
    execute format('create policy admin_write on %I for all using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;
create policy admins_self on admins for select using (user_id = auth.uid() or is_staff());

-- public reference for signed-in guardians
create policy g_years    on academic_years for select to authenticated using (true);
create policy g_stages   on stages         for select to authenticated using (true);
create policy g_subjects on subjects       for select to authenticated using (true);
create policy g_teachers on teachers       for select to authenticated using (active);
create policy g_settings on settings       for select using (true);   -- branding needed pre-login

-- scoped to guardian's sections
create policy g_sections  on sections  for select using (id in (select my_section_ids()));
create policy g_timetable on timetable for select using (section_id in (select my_section_ids()));
create policy g_homework  on homework  for select
  using (status = 'published' and section_id in (select my_section_ids()));
create policy g_attach    on attachments for select
  using (exists (select 1 from homework h where h.id = homework_id
                 and h.status = 'published' and h.section_id in (select my_section_ids())));
create policy g_notices   on notices for select
  using (publish_at <= now() and (expires_at is null or expires_at > now())
         and (section_id is null or section_id in (select my_section_ids())));

-- own records
create policy g_self      on guardians for select using (user_id = auth.uid());
create policy g_links     on guardian_students for select using (guardian_id = my_guardian_id());
create policy g_students  on students for select
  using (id in (select student_id from guardian_students where guardian_id = my_guardian_id()));
create policy g_reads     on reads for select using (guardian_id = my_guardian_id());
create policy g_push_all  on push_subscriptions for all
  using (guardian_id = my_guardian_id()) with check (guardian_id = my_guardian_id());

-- ───────────── Storage ─────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments','attachments', false, 10485760,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public) values ('branding','branding', true)
on conflict (id) do nothing;

create policy att_admin on storage.objects for all
  using (bucket_id in ('attachments','branding') and is_admin())
  with check (bucket_id in ('attachments','branding') and is_admin());

create policy att_guardian on storage.objects for select
  using (bucket_id = 'attachments'
         and (split_part(name,'/',1))::int in (select my_section_ids()));

-- ───────────── Dashboard views ─────────────
create or replace view v_section_day_reach with (security_invoker = true) as
select
  sec.id as section_id,
  st.name || ' ' || st.branch || ' ' || sec.letter as section_label,
  d.day,
  (select count(distinct gs.guardian_id)
     from students s join guardian_students gs on gs.student_id = s.id
     join guardians g on g.id = gs.guardian_id and g.active
    where s.section_id = sec.id and s.active) as guardians_total,
  (select count(*) from reads r where r.section_id = sec.id and r.day = d.day) as guardians_read
from sections sec
join stages st on st.id = sec.stage_id
cross join lateral (select distinct due_date as day from homework h where h.section_id = sec.id) d
where sec.active;

create or replace view v_unread_today with (security_invoker = true) as
select g.id as guardian_id, g.full_name, g.phone, s.section_id, s.full_name as student
from guardians g
join guardian_students gs on gs.guardian_id = g.id
join students s on s.id = gs.student_id and s.active
where g.active
  and not exists (select 1 from reads r where r.guardian_id = g.id
                  and r.section_id = s.section_id and r.day = (now() at time zone 'Asia/Baghdad')::date);

-- ───────────── Seed ─────────────
insert into academic_years(label, is_current) values ('2026–2027', true);
insert into stages(name, branch, sort) values
  ('الرابع','علمي',1),('الرابع','أدبي',2),('الخامس','علمي',3),
  ('الخامس','أدبي',4),('السادس','علمي',5),('السادس','أدبي',6);
insert into subjects(name, sort) values
  ('التربية الإسلامية',1),('اللغة العربية',2),('اللغة الإنكليزية',3),('الرياضيات',4),
  ('الكيمياء',5),('الفيزياء',6),('الأحياء',7),('الحاسوب',8),('جرائم البعث',9),
  ('التربية الرياضية',10),('التاريخ',11),('الجغرافية',12),('الاقتصاد',13),
  ('الفلسفة وعلم النفس',14),('اللغة الفرنسية',15);
insert into settings(key, value) values
  ('school', '{"name":"إعدادية الرميلة للبنين","directorate":"المديرية العامة لتربية الأنبار","contact":"+9647811205700"}'),
  ('branding', '{"app_name":"واجبات الرميلة","primary":"#1F3A5F","accent":"#C9A227","logo":null}'),
  ('periods', '{"1":["08:15",null],"6":[null,"12:10"],"thursday_periods":5}'),
  ('timezone', '"Asia/Baghdad"');
