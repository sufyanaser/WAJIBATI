-- ─────────────────────────────────────────────────────────────────────────────
-- School data: اعدادية الرميلة للبنين — full subjects, teachers, sections, timetable
-- School data: replace teacher names with actual staff before production
-- Idempotent: safe to run multiple times
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. Missing subject: التربية الوطنية ──────────────────────────────────────
INSERT INTO public.subjects (name, sort)
VALUES ('التربية الوطنية', 16)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Placeholder teachers for subjects not yet covered ──────────────────────
-- Demo seed already inserted teachers for: الرياضيات، اللغة العربية، اللغة الإنكليزية،
--   الفيزياء، الكيمياء، الأحياء، التربية الإسلامية
-- We add placeholder teachers for the rest:
INSERT INTO public.teachers (full_name, subject_id)
SELECT t.name, s.id
FROM (VALUES
  ('أ. فلان — التاريخ',              'التاريخ'),
  ('أ. فلان — الجغرافية',            'الجغرافية'),
  ('أ. فلان — الاقتصاد',             'الاقتصاد'),
  ('أ. فلان — الفلسفة وعلم النفس',   'الفلسفة وعلم النفس'),
  ('أ. فلان — التربية الوطنية',       'التربية الوطنية'),
  ('أ. فلان — الحاسوب',              'الحاسوب'),
  ('أ. فلان — التربية الرياضية',     'التربية الرياضية'),
  ('أ. فلان — جرائم البعث',          'جرائم البعث')
) AS t(name, subj)
JOIN public.subjects s ON s.name = t.subj
WHERE NOT EXISTS (
  SELECT 1 FROM public.teachers WHERE subject_id = s.id LIMIT 1
);

-- ── 3. Missing sections for current academic year ──────────────────────────────
DO $$
DECLARE
  yr    CONSTANT SMALLINT := 1;   -- academic_year id for 2026-2027
  s5a   SMALLINT;
  s5ad  SMALLINT;
  s6s   SMALLINT;
  s6ad  SMALLINT;
BEGIN
  SELECT id INTO s5a  FROM stages WHERE name='الخامس' AND branch='علمي';
  SELECT id INTO s5ad FROM stages WHERE name='الخامس' AND branch='أدبي';
  SELECT id INTO s6s  FROM stages WHERE name='السادس' AND branch='علمي';
  SELECT id INTO s6ad FROM stages WHERE name='السادس' AND branch='أدبي';

  INSERT INTO sections (year_id, stage_id, letter) VALUES
    (yr, s5ad, 'أ'),   -- الخامس أدبي أ
    (yr, s6s,  'ب'),   -- السادس علمي ب
    (yr, s6ad, 'أ')    -- السادس أدبي أ
  ON CONFLICT (year_id, stage_id, letter) DO NOTHING;
END $$;

-- ── 4. Full timetable for all sections × 5 weekdays × 6 periods ───────────────
-- Science (علمي) weekly pattern — realistic Iraqi secondary schedule:
--  Day\Period  1              2             3             4             5              6
--  الأحد  0   التربية إسل   ل.عربية       رياضيات       ل.إنكليزية    فيزياء         كيمياء
--  الاثنين 1  ل.عربية        رياضيات       ل.إنكليزية    فيزياء        كيمياء         تربية إسل
--  الثلاثاء 2 رياضيات        ل.إنكليزية    فيزياء        كيمياء        أحياء          تربية وطنية
--  الأربعاء 3 ل.إنكليزية     فيزياء        كيمياء        أحياء         تاريخ          حاسوب
--  الخميس 4  أحياء           تاريخ         ت.رياضية      رياضيات       ل.عربية        تربية إسل
--
-- Arts (أدبي) weekly pattern:
--  Day\Period  1             2             3             4              5              6
--  الأحد  0   تربية إسل     ل.عربية       رياضيات       ل.إنكليزية    تاريخ           جغرافية
--  الاثنين 1  ل.عربية        رياضيات       ل.إنكليزية    تاريخ         جغرافية         تربية إسل
--  الثلاثاء 2 رياضيات        ل.إنكليزية    تاريخ         جغرافية       اقتصاد          تربية وطنية
--  الأربعاء 3 ل.إنكليزية     تاريخ         جغرافية       اقتصاد        فلسفة وعلم نفس  جرائم البعث
--  الخميس 4  فلسفة وعلم نفس  اقتصاد        ت.رياضية      رياضيات       ل.عربية         تربية إسل

DO $$
DECLARE
  -- subject IDs
  sub_islam   SMALLINT; sub_ar   SMALLINT; sub_en   SMALLINT; sub_math SMALLINT;
  sub_phy     SMALLINT; sub_chem SMALLINT; sub_bio  SMALLINT; sub_hist SMALLINT;
  sub_geo     SMALLINT; sub_econ SMALLINT; sub_phil SMALLINT; sub_watan SMALLINT;
  sub_comp    SMALLINT; sub_pe   SMALLINT; sub_baath SMALLINT;

  -- teacher IDs (first teacher per subject)
  t_islam   INT; t_ar    INT; t_en    INT; t_math  INT;
  t_phy     INT; t_chem  INT; t_bio   INT; t_hist  INT;
  t_geo     INT; t_econ  INT; t_phil  INT; t_watan INT;
  t_comp    INT; t_pe   INT; t_baath INT;

  sec_id    INT;

  -- science timetable: [weekday][period] = subject_id
  sci_subj  SMALLINT[5][6];
  sci_teach INT[5][6];
  -- arts timetable
  art_subj  SMALLINT[5][6];
  art_teach INT[5][6];

  d SMALLINT; p SMALLINT;
BEGIN
  -- Declaring dimensions does not allocate PostgreSQL arrays. Initialise them
  -- before assigning individual [weekday][period] cells.
  sci_subj  := array_fill(null::smallint, ARRAY[5,6]);
  sci_teach := array_fill(null::int, ARRAY[5,6]);
  art_subj  := array_fill(null::smallint, ARRAY[5,6]);
  art_teach := array_fill(null::int, ARRAY[5,6]);

  -- resolve subject IDs
  SELECT id INTO sub_islam FROM subjects WHERE name='التربية الإسلامية';
  SELECT id INTO sub_ar    FROM subjects WHERE name='اللغة العربية';
  SELECT id INTO sub_en    FROM subjects WHERE name='اللغة الإنكليزية';
  SELECT id INTO sub_math  FROM subjects WHERE name='الرياضيات';
  SELECT id INTO sub_phy   FROM subjects WHERE name='الفيزياء';
  SELECT id INTO sub_chem  FROM subjects WHERE name='الكيمياء';
  SELECT id INTO sub_bio   FROM subjects WHERE name='الأحياء';
  SELECT id INTO sub_hist  FROM subjects WHERE name='التاريخ';
  SELECT id INTO sub_geo   FROM subjects WHERE name='الجغرافية';
  SELECT id INTO sub_econ  FROM subjects WHERE name='الاقتصاد';
  SELECT id INTO sub_phil  FROM subjects WHERE name='الفلسفة وعلم النفس';
  SELECT id INTO sub_watan FROM subjects WHERE name='التربية الوطنية';
  SELECT id INTO sub_comp  FROM subjects WHERE name='الحاسوب';
  SELECT id INTO sub_pe    FROM subjects WHERE name='التربية الرياضية';
  SELECT id INTO sub_baath FROM subjects WHERE name='جرائم البعث';

  -- resolve first teacher per subject
  SELECT id INTO t_islam FROM teachers WHERE subject_id=sub_islam LIMIT 1;
  SELECT id INTO t_ar    FROM teachers WHERE subject_id=sub_ar    LIMIT 1;
  SELECT id INTO t_en    FROM teachers WHERE subject_id=sub_en    LIMIT 1;
  SELECT id INTO t_math  FROM teachers WHERE subject_id=sub_math  LIMIT 1;
  SELECT id INTO t_phy   FROM teachers WHERE subject_id=sub_phy   LIMIT 1;
  SELECT id INTO t_chem  FROM teachers WHERE subject_id=sub_chem  LIMIT 1;
  SELECT id INTO t_bio   FROM teachers WHERE subject_id=sub_bio   LIMIT 1;
  SELECT id INTO t_hist  FROM teachers WHERE subject_id=sub_hist  LIMIT 1;
  SELECT id INTO t_geo   FROM teachers WHERE subject_id=sub_geo   LIMIT 1;
  SELECT id INTO t_econ  FROM teachers WHERE subject_id=sub_econ  LIMIT 1;
  SELECT id INTO t_phil  FROM teachers WHERE subject_id=sub_phil  LIMIT 1;
  SELECT id INTO t_watan FROM teachers WHERE subject_id=sub_watan LIMIT 1;
  SELECT id INTO t_comp  FROM teachers WHERE subject_id=sub_comp  LIMIT 1;
  SELECT id INTO t_pe    FROM teachers WHERE subject_id=sub_pe    LIMIT 1;
  SELECT id INTO t_baath FROM teachers WHERE subject_id=sub_baath LIMIT 1;

  -- ── Science timetable matrix [1-indexed weekday 1..5, period 1..6] ──
  -- weekday index: 1=الأحد, 2=الاثنين, 3=الثلاثاء, 4=الأربعاء, 5=الخميس
  -- period: 1..6
  sci_subj[1][1]:=sub_islam; sci_subj[1][2]:=sub_ar;   sci_subj[1][3]:=sub_math;
  sci_subj[1][4]:=sub_en;    sci_subj[1][5]:=sub_phy;   sci_subj[1][6]:=sub_chem;

  sci_subj[2][1]:=sub_ar;    sci_subj[2][2]:=sub_math;  sci_subj[2][3]:=sub_en;
  sci_subj[2][4]:=sub_phy;   sci_subj[2][5]:=sub_chem;  sci_subj[2][6]:=sub_islam;

  sci_subj[3][1]:=sub_math;  sci_subj[3][2]:=sub_en;    sci_subj[3][3]:=sub_phy;
  sci_subj[3][4]:=sub_chem;  sci_subj[3][5]:=sub_bio;   sci_subj[3][6]:=sub_watan;

  sci_subj[4][1]:=sub_en;    sci_subj[4][2]:=sub_phy;   sci_subj[4][3]:=sub_chem;
  sci_subj[4][4]:=sub_bio;   sci_subj[4][5]:=sub_hist;  sci_subj[4][6]:=sub_comp;

  sci_subj[5][1]:=sub_bio;   sci_subj[5][2]:=sub_hist;  sci_subj[5][3]:=sub_pe;
  sci_subj[5][4]:=sub_math;  sci_subj[5][5]:=sub_ar;    sci_subj[5][6]:=sub_islam;

  -- teacher matrix for science
  sci_teach[1][1]:=t_islam; sci_teach[1][2]:=t_ar;   sci_teach[1][3]:=t_math;
  sci_teach[1][4]:=t_en;    sci_teach[1][5]:=t_phy;   sci_teach[1][6]:=t_chem;

  sci_teach[2][1]:=t_ar;    sci_teach[2][2]:=t_math;  sci_teach[2][3]:=t_en;
  sci_teach[2][4]:=t_phy;   sci_teach[2][5]:=t_chem;  sci_teach[2][6]:=t_islam;

  sci_teach[3][1]:=t_math;  sci_teach[3][2]:=t_en;    sci_teach[3][3]:=t_phy;
  sci_teach[3][4]:=t_chem;  sci_teach[3][5]:=t_bio;   sci_teach[3][6]:=t_watan;

  sci_teach[4][1]:=t_en;    sci_teach[4][2]:=t_phy;   sci_teach[4][3]:=t_chem;
  sci_teach[4][4]:=t_bio;   sci_teach[4][5]:=t_hist;  sci_teach[4][6]:=t_comp;

  sci_teach[5][1]:=t_bio;   sci_teach[5][2]:=t_hist;  sci_teach[5][3]:=t_pe;
  sci_teach[5][4]:=t_math;  sci_teach[5][5]:=t_ar;    sci_teach[5][6]:=t_islam;

  -- ── Arts timetable matrix ──
  art_subj[1][1]:=sub_islam; art_subj[1][2]:=sub_ar;   art_subj[1][3]:=sub_math;
  art_subj[1][4]:=sub_en;    art_subj[1][5]:=sub_hist;  art_subj[1][6]:=sub_geo;

  art_subj[2][1]:=sub_ar;    art_subj[2][2]:=sub_math;  art_subj[2][3]:=sub_en;
  art_subj[2][4]:=sub_hist;  art_subj[2][5]:=sub_geo;   art_subj[2][6]:=sub_islam;

  art_subj[3][1]:=sub_math;  art_subj[3][2]:=sub_en;    art_subj[3][3]:=sub_hist;
  art_subj[3][4]:=sub_geo;   art_subj[3][5]:=sub_econ;  art_subj[3][6]:=sub_watan;

  art_subj[4][1]:=sub_en;    art_subj[4][2]:=sub_hist;  art_subj[4][3]:=sub_geo;
  art_subj[4][4]:=sub_econ;  art_subj[4][5]:=sub_phil;  art_subj[4][6]:=sub_baath;

  art_subj[5][1]:=sub_phil;  art_subj[5][2]:=sub_econ;  art_subj[5][3]:=sub_pe;
  art_subj[5][4]:=sub_math;  art_subj[5][5]:=sub_ar;    art_subj[5][6]:=sub_islam;

  art_teach[1][1]:=t_islam; art_teach[1][2]:=t_ar;   art_teach[1][3]:=t_math;
  art_teach[1][4]:=t_en;    art_teach[1][5]:=t_hist;  art_teach[1][6]:=t_geo;

  art_teach[2][1]:=t_ar;    art_teach[2][2]:=t_math;  art_teach[2][3]:=t_en;
  art_teach[2][4]:=t_hist;  art_teach[2][5]:=t_geo;   art_teach[2][6]:=t_islam;

  art_teach[3][1]:=t_math;  art_teach[3][2]:=t_en;    art_teach[3][3]:=t_hist;
  art_teach[3][4]:=t_geo;   art_teach[3][5]:=t_econ;  art_teach[3][6]:=t_watan;

  art_teach[4][1]:=t_en;    art_teach[4][2]:=t_hist;  art_teach[4][3]:=t_geo;
  art_teach[4][4]:=t_econ;  art_teach[4][5]:=t_phil;  art_teach[4][6]:=t_baath;

  art_teach[5][1]:=t_phil;  art_teach[5][2]:=t_econ;  art_teach[5][3]:=t_pe;
  art_teach[5][4]:=t_math;  art_teach[5][5]:=t_ar;    art_teach[5][6]:=t_islam;

  -- ── Loop: science sections ──
  FOR sec_id IN
    SELECT sec.id
    FROM sections sec
    JOIN stages st ON st.id = sec.stage_id
    WHERE st.branch = 'علمي' AND sec.active = true
  LOOP
    FOR d IN 1..5 LOOP
      FOR p IN 1..6 LOOP
        INSERT INTO timetable (section_id, weekday, period, subject_id, teacher_id)
        VALUES (sec_id, d-1, p, sci_subj[d][p], sci_teach[d][p])
        ON CONFLICT (section_id, weekday, period) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;

  -- ── Loop: arts sections ──
  FOR sec_id IN
    SELECT sec.id
    FROM sections sec
    JOIN stages st ON st.id = sec.stage_id
    WHERE st.branch = 'أدبي' AND sec.active = true
  LOOP
    FOR d IN 1..5 LOOP
      FOR p IN 1..6 LOOP
        INSERT INTO timetable (section_id, weekday, period, subject_id, teacher_id)
        VALUES (sec_id, d-1, p, art_subj[d][p], art_teach[d][p])
        ON CONFLICT (section_id, weekday, period) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;

END $$;

COMMIT;
