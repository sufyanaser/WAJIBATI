-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: subject colours, demo sections, teachers, timetable,
--       5 guardian auth users + guardians + students + links
-- PIN values documented inline — CHANGE BEFORE PRODUCTION
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Subject colours ────────────────────────────────────────────────────────────
UPDATE subjects SET color = '#3B82F6' WHERE name = 'الرياضيات';
UPDATE subjects SET color = '#10B981' WHERE name = 'اللغة العربية';
UPDATE subjects SET color = '#8B5CF6' WHERE name = 'اللغة الإنكليزية';
UPDATE subjects SET color = '#F59E0B' WHERE name = 'الفيزياء';
UPDATE subjects SET color = '#EF4444' WHERE name = 'الكيمياء';
UPDATE subjects SET color = '#06B6D4' WHERE name = 'الأحياء';
UPDATE subjects SET color = '#EC4899' WHERE name = 'التربية الإسلامية';
UPDATE subjects SET color = '#6366F1' WHERE name = 'التاريخ';
UPDATE subjects SET color = '#84CC16' WHERE name = 'الجغرافية';

-- ── Demo sections (year 2026–2027 = id 1) ────────────────────────────────────
DO $$ DECLARE yr CONSTANT INT := 1; s4s INT; s4a INT; s5s INT; s6s INT;
BEGIN
  SELECT id INTO s4s FROM stages WHERE name='الرابع'  AND branch='علمي';
  SELECT id INTO s4a FROM stages WHERE name='الرابع'  AND branch='أدبي';
  SELECT id INTO s5s FROM stages WHERE name='الخامس' AND branch='علمي';
  SELECT id INTO s6s FROM stages WHERE name='السادس' AND branch='علمي';
  INSERT INTO sections(year_id,stage_id,letter) VALUES
    (yr,s4s,'أ'),(yr,s4s,'ب'),(yr,s4s,'ج'),
    (yr,s4a,'أ'),
    (yr,s5s,'أ'),(yr,s5s,'ب'),
    (yr,s6s,'أ')
  ON CONFLICT DO NOTHING;
END $$;

-- ── Demo teachers ─────────────────────────────────────────────────────────────
INSERT INTO teachers(full_name,subject_id) VALUES
  ('أ. كريم عبدالله محمد', (SELECT id FROM subjects WHERE name='الرياضيات')),
  ('أ. سامي حسن جاسم',    (SELECT id FROM subjects WHERE name='اللغة العربية')),
  ('م. أحلام فارس عبيد',  (SELECT id FROM subjects WHERE name='اللغة الإنكليزية')),
  ('أ. وليد صالح مطر',    (SELECT id FROM subjects WHERE name='الفيزياء')),
  ('أ. رنا قاسم حمزة',    (SELECT id FROM subjects WHERE name='الكيمياء')),
  ('أ. علاء حميد راضي',   (SELECT id FROM subjects WHERE name='الأحياء')),
  ('أ. مروان ناصر ذياب',  (SELECT id FROM subjects WHERE name='التربية الإسلامية'))
ON CONFLICT DO NOTHING;

-- ── Demo timetable: الرابع علمي / أ — Sunday (weekday=0) ─────────────────────
DO $$ DECLARE
  sec INT;
  s_islam INT; s_ar INT; s_math INT; s_en INT; s_phy INT; s_chem INT;
  t_ar INT; t_math INT; t_en INT; t_phy INT; t_chem INT; t_islam INT;
BEGIN
  SELECT sec2.id INTO sec
  FROM sections sec2 JOIN stages st ON st.id=sec2.stage_id
  WHERE st.name='الرابع' AND st.branch='علمي' AND sec2.letter='أ' LIMIT 1;

  SELECT id INTO s_islam FROM subjects WHERE name='التربية الإسلامية';
  SELECT id INTO s_ar    FROM subjects WHERE name='اللغة العربية';
  SELECT id INTO s_math  FROM subjects WHERE name='الرياضيات';
  SELECT id INTO s_en    FROM subjects WHERE name='اللغة الإنكليزية';
  SELECT id INTO s_phy   FROM subjects WHERE name='الفيزياء';
  SELECT id INTO s_chem  FROM subjects WHERE name='الكيمياء';

  SELECT id INTO t_islam FROM teachers WHERE subject_id=s_islam LIMIT 1;
  SELECT id INTO t_ar    FROM teachers WHERE subject_id=s_ar    LIMIT 1;
  SELECT id INTO t_math  FROM teachers WHERE subject_id=s_math  LIMIT 1;
  SELECT id INTO t_en    FROM teachers WHERE subject_id=s_en    LIMIT 1;
  SELECT id INTO t_phy   FROM teachers WHERE subject_id=s_phy   LIMIT 1;
  SELECT id INTO t_chem  FROM teachers WHERE subject_id=s_chem  LIMIT 1;

  INSERT INTO timetable(section_id,weekday,period,subject_id,teacher_id) VALUES
    (sec,0,1,s_islam,t_islam),
    (sec,0,2,s_ar,   t_ar),
    (sec,0,3,s_math, t_math),
    (sec,0,4,s_en,   t_en),
    (sec,0,5,s_phy,  t_phy),
    (sec,0,6,s_chem, t_chem)
  ON CONFLICT DO NOTHING;
END $$;

-- ── 5 Guardian auth users + guardians + students ──────────────────────────────
-- Fixed UUIDs for determinism  |  auth user prefix: aa…  |  guardian prefix: bb…
-- ┌─────────────────────────────┬───────────────────┬──────────┬───────────────────────┐
-- │ الاسم                       │ الهاتف            │ PIN      │ الطالب / الشعبة       │
-- ├─────────────────────────────┼───────────────────┼──────────┼───────────────────────┤
-- │ أحمد محمد الدليمي           │ +9647801234567    │ 111111   │ عمر أحمد   / رابع أ  │
-- │ علي حسن الجبوري             │ +9647802345678    │ 222222   │ حيدر علي   / رابع أ  │
-- │ خالد سعود العاني            │ +9647803456789    │ 333333   │ مصطفى خالد / رابع ب  │
-- │ محمود عمر الراوي            │ +9647804567890    │ 444444   │ يوسف محمود / خامس أ  │
-- │ فارس جاسم الزوبعي           │ +9647805678901    │ 555555   │ حسين فارس  / خامس أ  │
-- └─────────────────────────────┴───────────────────┴──────────┴───────────────────────┘

DO $$ DECLARE
  sec4s_a INT; sec4s_b INT; sec5s_a INT;

  -- auth user UUIDs
  uid1 UUID := 'aa000001-0000-0000-0000-000000000000';
  uid2 UUID := 'aa000002-0000-0000-0000-000000000000';
  uid3 UUID := 'aa000003-0000-0000-0000-000000000000';
  uid4 UUID := 'aa000004-0000-0000-0000-000000000000';
  uid5 UUID := 'aa000005-0000-0000-0000-000000000000';

  -- guardian UUIDs
  gid1 UUID := 'bb000001-0000-0000-0000-000000000000';
  gid2 UUID := 'bb000002-0000-0000-0000-000000000000';
  gid3 UUID := 'bb000003-0000-0000-0000-000000000000';
  gid4 UUID := 'bb000004-0000-0000-0000-000000000000';
  gid5 UUID := 'bb000005-0000-0000-0000-000000000000';

  sid1 INT; sid2 INT; sid3 INT; sid4 INT; sid5 INT;
BEGIN
  -- resolve section IDs
  SELECT sec2.id INTO sec4s_a FROM sections sec2 JOIN stages st ON st.id=sec2.stage_id
    WHERE st.name='الرابع' AND st.branch='علمي' AND sec2.letter='أ' LIMIT 1;
  SELECT sec2.id INTO sec4s_b FROM sections sec2 JOIN stages st ON st.id=sec2.stage_id
    WHERE st.name='الرابع' AND st.branch='علمي' AND sec2.letter='ب' LIMIT 1;
  SELECT sec2.id INTO sec5s_a FROM sections sec2 JOIN stages st ON st.id=sec2.stage_id
    WHERE st.name='الخامس' AND st.branch='علمي' AND sec2.letter='أ' LIMIT 1;

  -- ── auth.users ──────────────────────────────────────────────────────────────
  INSERT INTO auth.users(id,instance_id,email,encrypted_password,
    email_confirmed_at,created_at,updated_at,
    raw_app_meta_data,raw_user_meta_data,aud,role,is_super_admin)
  VALUES
    (uid1,'00000000-0000-0000-0000-000000000000','9647801234567@guardian.rumaila.local',
      crypt('111111',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid2,'00000000-0000-0000-0000-000000000000','9647802345678@guardian.rumaila.local',
      crypt('222222',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid3,'00000000-0000-0000-0000-000000000000','9647803456789@guardian.rumaila.local',
      crypt('333333',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid4,'00000000-0000-0000-0000-000000000000','9647804567890@guardian.rumaila.local',
      crypt('444444',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false),
    (uid5,'00000000-0000-0000-0000-000000000000','9647805678901@guardian.rumaila.local',
      crypt('555555',gen_salt('bf')),now(),now(),now(),
      '{"provider":"email","providers":["email"]}','{}','authenticated','authenticated',false)
  ON CONFLICT(id) DO NOTHING;

  -- ── auth.identities ─────────────────────────────────────────────────────────
  INSERT INTO auth.identities(id,user_id,identity_data,provider,created_at,updated_at,last_sign_in_at,provider_id)
  VALUES
    (gen_random_uuid(),uid1,
      jsonb_build_object('sub',uid1::text,'email','9647801234567@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647801234567@guardian.rumaila.local'),
    (gen_random_uuid(),uid2,
      jsonb_build_object('sub',uid2::text,'email','9647802345678@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647802345678@guardian.rumaila.local'),
    (gen_random_uuid(),uid3,
      jsonb_build_object('sub',uid3::text,'email','9647803456789@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647803456789@guardian.rumaila.local'),
    (gen_random_uuid(),uid4,
      jsonb_build_object('sub',uid4::text,'email','9647804567890@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647804567890@guardian.rumaila.local'),
    (gen_random_uuid(),uid5,
      jsonb_build_object('sub',uid5::text,'email','9647805678901@guardian.rumaila.local'),
      'email',now(),now(),now(),'9647805678901@guardian.rumaila.local')
  ON CONFLICT(provider,provider_id) DO NOTHING;

  -- ── guardians ────────────────────────────────────────────────────────────────
  INSERT INTO guardians(id,user_id,full_name,phone) VALUES
    (gid1,uid1,'أحمد محمد الدليمي', '+9647801234567'),
    (gid2,uid2,'علي حسن الجبوري',   '+9647802345678'),
    (gid3,uid3,'خالد سعود العاني',  '+9647803456789'),
    (gid4,uid4,'محمود عمر الراوي',  '+9647804567890'),
    (gid5,uid5,'فارس جاسم الزوبعي', '+9647805678901')
  ON CONFLICT(id) DO NOTHING;

  -- ── students ─────────────────────────────────────────────────────────────────
  INSERT INTO students(full_name,section_id) VALUES ('عمر أحمد محمد',   sec4s_a) RETURNING id INTO sid1;
  INSERT INTO students(full_name,section_id) VALUES ('حيدر علي حسن',    sec4s_a) RETURNING id INTO sid2;
  INSERT INTO students(full_name,section_id) VALUES ('مصطفى خالد سعود', sec4s_b) RETURNING id INTO sid3;
  INSERT INTO students(full_name,section_id) VALUES ('يوسف محمود عمر',  sec5s_a) RETURNING id INTO sid4;
  INSERT INTO students(full_name,section_id) VALUES ('حسين فارس جاسم',  sec5s_a) RETURNING id INTO sid5;

  -- ── guardian_students ────────────────────────────────────────────────────────
  INSERT INTO guardian_students(guardian_id,student_id,relation) VALUES
    (gid1,sid1,'أب'),
    (gid2,sid2,'أب'),
    (gid3,sid3,'أب'),
    (gid4,sid4,'أب'),
    (gid5,sid5,'أب')
  ON CONFLICT DO NOTHING;

END $$;
