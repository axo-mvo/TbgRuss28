-- ============================================================
-- ALL MIGRATIONS COMBINED (001-011)
-- Paste this entire file into Supabase Dashboard SQL Editor
-- ============================================================

-- 001_schema.sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'youth', 'parent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('youth', 'parent')),
  max_uses INT DEFAULT 100,
  uses INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE parent_youth_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  youth_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, youth_id)
);

CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB DEFAULT '[]',
  tip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE station_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'active', 'completed')),
  started_at TIMESTAMPTZ,
  end_timestamp TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(station_id, group_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES station_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meeting_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_youth_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_status ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);

-- 002_rls.sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Anyone can view active invite codes"
  ON invite_codes FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Users can view own parent-youth links"
  ON parent_youth_links FOR SELECT TO authenticated
  USING (parent_id = auth.uid() OR youth_id = auth.uid());

CREATE POLICY "Authenticated users can view all groups"
  ON groups FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage groups"
  ON groups FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated users can view group members"
  ON group_members FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage group members"
  ON group_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can remove group members"
  ON group_members FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated users can view stations"
  ON stations FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view sessions for their group"
  ON station_sessions FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all sessions"
  ON station_sessions FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Group members can create sessions"
  ON station_sessions FOR INSERT TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can update sessions"
  ON station_sessions FOR UPDATE TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage sessions"
  ON station_sessions FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can view messages in their group sessions"
  ON messages FOR SELECT TO authenticated
  USING (
    session_id IN (
      SELECT ss.id FROM station_sessions ss
      JOIN group_members gm ON gm.group_id = ss.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Users can send messages in their group sessions"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (
      SELECT ss.id FROM station_sessions ss
      JOIN group_members gm ON gm.group_id = ss.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can view meeting status"
  ON meeting_status FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can update meeting status"
  ON meeting_status FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 003_functions.sql
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_updated RECORD;
BEGIN
  SELECT * INTO v_invite
  FROM invite_codes
  WHERE code = p_code;

  IF v_invite IS NULL THEN
    RETURN json_build_object('valid', false, 'role', NULL, 'error', 'Ugyldig invitasjonskode');
  END IF;

  IF NOT v_invite.active THEN
    RETURN json_build_object('valid', false, 'role', NULL, 'error', 'Invitasjonskoden er deaktivert');
  END IF;

  IF v_invite.uses >= v_invite.max_uses THEN
    RETURN json_build_object('valid', false, 'role', NULL, 'error', 'Invitasjonskoden er brukt opp');
  END IF;

  UPDATE invite_codes
  SET uses = uses + 1
  WHERE id = v_invite.id
    AND uses < max_uses
  RETURNING * INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN json_build_object('valid', false, 'role', NULL, 'error', 'Invitasjonskoden er akkurat brukt opp');
  END IF;

  RETURN json_build_object('valid', true, 'role', v_updated.role, 'error', NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 004_seed.sql
INSERT INTO stations (number, title, description, questions, tip) VALUES
(1, 'Fellesskap og Samhold',
 'Diskuter hvordan vi kan styrke fellesskapet og samholdet i russegruppen.',
 '["Hva betyr fellesskap for deg i russetiden?", "Hvordan kan vi sikre at alle foler seg inkludert?", "Hvilke aktiviteter kan styrke samholdet i gruppen?", "Hvordan handterer vi konflikter pa en god mate?"]',
 'Tenk pa konkrete eksempler fra egne erfaringer med gruppesamarbeid.'
),
(2, 'Inkludering',
 'Snakk om hvordan vi kan skape en inkluderende russetid for alle.',
 '["Hva kan vi gjore for at ingen faller utenfor?", "Hvordan kan vi vare oppmerksomme pa de som er stille eller trekker seg tilbake?", "Hvilke regler bor vi ha for a sikre inkludering?", "Hvordan kan foreldre bidra til en mer inkluderende russetid?"]',
 'Husk at inkludering handler om mer enn bare a invitere -- det handler om a fa alle til a fole seg velkomne.'
),
(3, 'Rus og Forebygging',
 'Diskuter holdninger til rus og hvordan vi kan forebygge negative opplevelser.',
 '["Hvilke forventninger har dere til rusbruk i russetiden?", "Hvordan kan vi passe pa hverandre nar det gjelder alkohol og rus?", "Hva bor vi gjore hvis noen havner i en vanskelig situasjon?", "Hvordan kan foreldre og ungdom samarbeide om trygge rammer?"]',
 'Var arlige og respektfulle. Det finnes ingen dumme svar her.'
),
(4, 'Budsjett og Okonomi',
 'Ga gjennom budsjettet og diskuter okonomiske prioriteringer.',
 '["Hva er de storste kostnadene ved russetiden?", "Hvordan kan vi holde kostnadene nede uten a ga pa kompromiss med opplevelsen?", "Bor alle bidra likt okonomisk, eller bor det vare fleksibelt?", "Hvilke utgifter er viktigst a prioritere?"]',
 'Ha gjerne konkrete tall klare. Et realistisk budsjett gir bedre planlegging.'
),
(5, 'Finansiering',
 'Diskuter muligheter for a finansiere russetiden og skaffe inntekter.',
 '["Hvilke dugnader eller inntektskilder kan vi bruke?", "Har noen erfaring med sponsorer eller samarbeidspartnere?", "Hvordan fordeler vi inntektene rettferdig?", "Hva er realistiske mal for innsamling?"]',
 'Tenk kreativt, men vurder ogsa hvor mye tid og innsats hver aktivitet krever.'
),
(6, 'Nye Regler for Russebuss',
 'Diskuter de nye reglene for russebuss og hvordan de pavirker planleggingen.',
 '["Hvilke nye regler er dere kjent med?", "Hvordan pavirker reglene planene vare?", "Hva er de storste utfordringene med de nye reglene?", "Hvordan kan vi tilpasse oss og fortsatt ha en bra russetid?"]',
 'Sjekk oppdatert informasjon fra kommunen og relevante myndigheter for a vare sikre pa gjeldende regler.'
)
ON CONFLICT (number) DO NOTHING;

INSERT INTO invite_codes (code, role, max_uses) VALUES
('UNGDOM2028', 'youth', 50),
('FORELDER2028', 'parent', 60)
ON CONFLICT (code) DO NOTHING;

INSERT INTO meeting_status (status) VALUES ('pending');

-- 005_admin_policies.sql
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can view all parent-youth links"
  ON parent_youth_links FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can create parent-youth links"
  ON parent_youth_links FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update parent-youth links"
  ON parent_youth_links FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete parent-youth links"
  ON parent_youth_links FOR DELETE TO authenticated
  USING (public.is_admin());

-- 006_group_constraints.sql
CREATE OR REPLACE FUNCTION public.check_parent_child_separation(
  p_group_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_conflict BOOLEAN := false;
  v_conflict_name TEXT;
BEGIN
  SELECT true, p.full_name INTO v_conflict, v_conflict_name
  FROM parent_youth_links pyl
  JOIN group_members gm ON gm.user_id = pyl.youth_id AND gm.group_id = p_group_id
  JOIN profiles p ON p.id = pyl.youth_id
  WHERE pyl.parent_id = p_user_id
  LIMIT 1;

  IF v_conflict THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Forelder kan ikke vaere i samme gruppe som sitt barn (' || v_conflict_name || ')');
  END IF;

  SELECT true, p.full_name INTO v_conflict, v_conflict_name
  FROM parent_youth_links pyl
  JOIN group_members gm ON gm.user_id = pyl.parent_id AND gm.group_id = p_group_id
  JOIN profiles p ON p.id = pyl.parent_id
  WHERE pyl.youth_id = p_user_id
  LIMIT 1;

  IF v_conflict THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Ungdom kan ikke vaere i samme gruppe som sin forelder (' || v_conflict_name || ')');
  END IF;

  RETURN json_build_object('allowed', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 007_station_chat.sql
CREATE POLICY "Group members can use station channels"
ON "realtime"."messages"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM station_sessions ss
    JOIN group_members gm ON gm.group_id = ss.group_id
    WHERE gm.user_id = (SELECT auth.uid())
      AND 'station:' || ss.id::text = (SELECT realtime.topic())
      AND realtime.messages.extension IN ('broadcast', 'presence')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM station_sessions ss
    JOIN group_members gm ON gm.group_id = ss.group_id
    WHERE gm.user_id = (SELECT auth.uid())
      AND 'station:' || ss.id::text = (SELECT realtime.topic())
      AND realtime.messages.extension IN ('broadcast', 'presence')
  )
);

CREATE OR REPLACE FUNCTION public.open_station(
  p_station_id UUID,
  p_group_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_active_other RECORD;
BEGIN
  SELECT * INTO v_session
  FROM station_sessions
  WHERE station_id = p_station_id
    AND group_id = p_group_id
  FOR UPDATE;

  IF v_session IS NOT NULL AND v_session.status = 'completed' THEN
    RETURN json_build_object('error', 'Stasjonen er allerede fullfort');
  END IF;

  IF v_session IS NOT NULL AND v_session.status = 'active' THEN
    RETURN json_build_object(
      'id', v_session.id,
      'end_timestamp', v_session.end_timestamp,
      'status', v_session.status
    );
  END IF;

  SELECT id INTO v_active_other
  FROM station_sessions
  WHERE group_id = p_group_id
    AND status = 'active'
    AND station_id != p_station_id
  LIMIT 1;

  IF v_active_other IS NOT NULL THEN
    RETURN json_build_object('error', 'Gruppen har allerede en aktiv stasjon');
  END IF;

  INSERT INTO station_sessions (station_id, group_id, status, started_at, end_timestamp)
  VALUES (
    p_station_id,
    p_group_id,
    'active',
    now(),
    now() + interval '15 minutes'
  )
  ON CONFLICT (station_id, group_id) DO UPDATE SET
    status = 'active',
    started_at = COALESCE(station_sessions.started_at, now()),
    end_timestamp = COALESCE(station_sessions.end_timestamp, now() + interval '15 minutes')
  RETURNING * INTO v_session;

  RETURN json_build_object(
    'id', v_session.id,
    'end_timestamp', v_session.end_timestamp,
    'status', v_session.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 008_complete_station.sql
CREATE OR REPLACE FUNCTION public.complete_station(
  p_session_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
BEGIN
  SELECT * INTO v_session
  FROM station_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF v_session IS NULL THEN
    RETURN json_build_object('error', 'Okt ikke funnet');
  END IF;

  IF v_session.status != 'active' THEN
    RETURN json_build_object('success', true);
  END IF;

  UPDATE station_sessions
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_session_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 009_view_station_and_realtime.sql
ALTER PUBLICATION supabase_realtime ADD TABLE station_sessions;

CREATE OR REPLACE FUNCTION public.view_station(
  p_station_id UUID,
  p_group_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
BEGIN
  INSERT INTO station_sessions (station_id, group_id, status, started_at, end_timestamp)
  VALUES (
    p_station_id,
    p_group_id,
    'available',
    NULL,
    NULL
  )
  ON CONFLICT (station_id, group_id) DO NOTHING;

  SELECT id, status, end_timestamp INTO v_session
  FROM station_sessions
  WHERE station_id = p_station_id
    AND group_id = p_group_id;

  IF v_session IS NULL THEN
    RETURN json_build_object('error', 'Kunne ikke opprette okt');
  END IF;

  RETURN json_build_object(
    'id', v_session.id,
    'status', v_session.status,
    'end_timestamp', v_session.end_timestamp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 010_realtime_replica_identity.sql
-- Fix: REPLICA IDENTITY FULL required so Supabase Realtime can evaluate
-- the group_id filter and RLS policies on UPDATE events.
ALTER TABLE station_sessions REPLICA IDENTITY FULL;

-- 011_parent_invite_codes.sql
-- Add unique VOKSEN### invite codes for youth to share with parents
ALTER TABLE profiles ADD COLUMN parent_invite_code TEXT UNIQUE;

DO $$
DECLARE
  r RECORD;
  counter INT := 100;
BEGIN
  FOR r IN
    SELECT id FROM profiles WHERE role = 'youth' ORDER BY created_at
  LOOP
    UPDATE profiles SET parent_invite_code = 'VOKSEN' || counter WHERE id = r.id;
    counter := counter + 1;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION assign_parent_invite_code()
RETURNS TRIGGER AS $$
DECLARE
  max_num INT;
BEGIN
  IF NEW.role = 'youth' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(parent_invite_code FROM 7) AS INT)), 99)
    INTO max_num
    FROM profiles
    WHERE parent_invite_code IS NOT NULL
      AND parent_invite_code LIKE 'VOKSEN%';

    NEW.parent_invite_code := 'VOKSEN' || (max_num + 1);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_assign_parent_invite_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_parent_invite_code();

CREATE INDEX idx_profiles_parent_invite_code
  ON profiles(parent_invite_code)
  WHERE parent_invite_code IS NOT NULL;

-- 020_meetings_migration.sql
-- Multi-meeting schema migration: transforms v1.0 single-meeting schema into v1.1 multi-meeting schema.

BEGIN;

-- STEP 1: Create meetings table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'completed')),
  date DATE,
  time TIME,
  venue TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- STEP 2: Partial unique index — only one upcoming meeting at a time (MEET-03)
CREATE UNIQUE INDEX idx_one_upcoming_meeting
  ON meetings ((true))
  WHERE status = 'upcoming';

-- STEP 3: Add meeting_id FK columns (nullable first for backfill)
ALTER TABLE stations ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;

-- STEP 4: Backfill existing data with "Fellesmote #1"
DO $$
DECLARE
  v_meeting_id UUID;
BEGIN
  INSERT INTO meetings (title, status, date)
  VALUES ('Fellesmøte #1', 'completed', '2026-02-19')
  RETURNING id INTO v_meeting_id;

  UPDATE stations SET meeting_id = v_meeting_id;
  UPDATE groups SET meeting_id = v_meeting_id;
END $$;

-- STEP 5: Enforce NOT NULL after backfill
ALTER TABLE stations ALTER COLUMN meeting_id SET NOT NULL;
ALTER TABLE groups ALTER COLUMN meeting_id SET NOT NULL;

-- STEP 6: Replace global station number uniqueness with per-meeting uniqueness
ALTER TABLE stations DROP CONSTRAINT stations_number_key;
CREATE UNIQUE INDEX idx_stations_meeting_number ON stations(meeting_id, number);

-- STEP 7: RLS policies for meetings table
CREATE POLICY "Authenticated users can view all meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage meetings"
  ON meetings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- STEP 8: Drop obsolete meeting_status table (zero references in app code)
DROP TABLE IF EXISTS meeting_status;

-- STEP 9: Performance indexes
CREATE INDEX idx_stations_meeting_id ON stations(meeting_id);
CREATE INDEX idx_groups_meeting_id ON groups(meeting_id);

COMMIT;