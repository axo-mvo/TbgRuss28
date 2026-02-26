-- 027_meeting_audience.sql
-- Add audience targeting to meetings: allows admins to create meetings for specific groups
-- (everyone, youth only, parents only) with role-based visibility filtering.
--
-- Steps:
--   1. Add audience column with CHECK constraint
--   2. Drop single-upcoming-meeting unique index (multiple upcoming now allowed)
--   3. Add performance index on audience
--   4. Update RLS on meeting_attendance for audience-aware INSERT/UPDATE

BEGIN;

-- ============================================================
-- STEP 1: Add audience column to meetings
-- ============================================================

ALTER TABLE meetings ADD COLUMN audience TEXT NOT NULL DEFAULT 'everyone'
  CHECK (audience IN ('everyone', 'youth', 'parent'));

-- ============================================================
-- STEP 2: Drop partial unique index enforcing single upcoming meeting
-- Multiple upcoming meetings are now allowed
-- ============================================================

DROP INDEX IF EXISTS idx_one_upcoming_meeting;

-- ============================================================
-- STEP 3: Performance index on audience for filtering
-- ============================================================

CREATE INDEX idx_meetings_audience ON meetings(audience);

-- ============================================================
-- STEP 4: Update RLS on meeting_attendance for audience targeting
-- Existing INSERT policy "Users can manage own attendance" only checks user_id = auth.uid().
-- We replace it with one that also verifies the meeting targets the user's role.
-- Same for UPDATE policy.
-- Note: The app uses admin client for attendance upserts, so these are defense-in-depth.
-- ============================================================

-- Drop existing INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users can manage own attendance" ON meeting_attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON meeting_attendance;

-- New INSERT policy: user can only attend meetings targeting their role
CREATE POLICY "Users can insert attendance for targeted meetings"
  ON meeting_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.id = auth.uid()
      WHERE m.id = meeting_id
      AND (m.audience = 'everyone' OR m.audience = p.role)
    )
  );

-- New UPDATE policy: same audience check
CREATE POLICY "Users can update attendance for targeted meetings"
  ON meeting_attendance FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.id = auth.uid()
      WHERE m.id = meeting_id
      AND (m.audience = 'everyone' OR m.audience = p.role)
    )
  );

COMMIT;
