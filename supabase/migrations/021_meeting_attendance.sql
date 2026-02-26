-- 021_meeting_attendance.sql
-- Per-meeting attendance tracking: replaces global profiles.attending boolean
-- with a meeting_attendance junction table for meeting-scoped attendance.
--
-- Note: profiles.attending column NOT dropped -- deprecated, will be removed in future cleanup.

BEGIN;

-- ============================================================
-- STEP 1: Create meeting_attendance table
-- ============================================================

CREATE TABLE meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  attending BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: RLS policies
-- ============================================================

-- All authenticated users can view meeting attendance (dashboard counts)
CREATE POLICY "Authenticated users can view meeting attendance"
  ON meeting_attendance FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own attendance
CREATE POLICY "Users can manage own attendance"
  ON meeting_attendance FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own attendance
CREATE POLICY "Users can update own attendance"
  ON meeting_attendance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
  ON meeting_attendance FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- STEP 3: Performance indexes
-- ============================================================

CREATE INDEX idx_meeting_attendance_meeting_id ON meeting_attendance(meeting_id);
CREATE INDEX idx_meeting_attendance_user_id ON meeting_attendance(user_id);

-- ============================================================
-- STEP 4: Backfill existing profiles.attending data
-- Migrate to most recent non-completed meeting (if one exists)
-- ============================================================

DO $$
DECLARE
  v_meeting_id UUID;
BEGIN
  -- Find the most recent non-completed meeting
  SELECT id INTO v_meeting_id
  FROM meetings
  WHERE status IN ('upcoming', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Only backfill if a non-completed meeting exists
  IF v_meeting_id IS NOT NULL THEN
    INSERT INTO meeting_attendance (meeting_id, user_id, attending)
    SELECT v_meeting_id, id, attending
    FROM profiles
    WHERE attending IS NOT NULL;
  END IF;
END $$;

COMMIT;
