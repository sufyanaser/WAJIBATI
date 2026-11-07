-- ── Security fixes for Argon audit findings ──────────────────────────────────

-- 1. SQL RPC: get_section_subscriptions
--    Replaces unreliable 3-level nested PostgREST filter in send-push.
--    Returns push subscription credentials for all guardians of a section.
create or replace function get_section_subscriptions(p_section_id int)
returns table(id uuid, endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = public
as $$
  select ps.id, ps.endpoint, ps.p256dh, ps.auth
  from push_subscriptions ps
  join guardians g on g.id = ps.guardian_id
  join guardian_students gs on gs.guardian_id = g.id
  join students s on s.id = gs.student_id
  where s.section_id = p_section_id;
$$;

-- Only admins/service role should call this
revoke all on function get_section_subscriptions(int) from public;
grant execute on function get_section_subscriptions(int) to service_role;

-- 2. Safe attachment storage policy
--    Original ::int cast throws on non-numeric path segments.
--    Replace with regex guard before casting.
drop policy if exists att_guardian on storage.objects;
create policy att_guardian on storage.objects for select
  using (
    bucket_id = 'attachments'
    and split_part(name, '/', 1) ~ '^[0-9]+$'
    and (split_part(name, '/', 1))::int in (select my_section_ids())
  );

-- 3. Performance indexes
create index if not exists idx_homework_section_date
  on homework(section_id, due_date);

create index if not exists idx_guardian_students_guardian
  on guardian_students(guardian_id);

create index if not exists idx_guardian_students_student
  on guardian_students(student_id);

create index if not exists idx_push_subscriptions_guardian
  on push_subscriptions(guardian_id);

create index if not exists idx_reads_guardian
  on reads(guardian_id);
