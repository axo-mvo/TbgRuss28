-- 020_meetings_migration.sql
-- Multi-meeting schema migration: transforms v1.0 single-meeting schema into v1.1 multi-meeting schema.
--
-- Steps:
--   1. Create meetings table with status CHECK constraint
--   2. Add partial unique index enforcing only one upcoming meeting (MEET-03)
--   3. Add meeting_id FK columns (nullable) to stations and groups
--   4. Backfill: create "Fellesmote #1" as completed meeting, link all existing data (MEET-05)
--   5. Enforce NOT NULL on meeting_id columns after backfill
--   6. Replace stations.number UNIQUE with per-meeting compound UNIQUE (meeting_id, number)
--   7. Add RLS policies for meetings table
--   8. Drop obsolete meeting_status table
--   9. Add performance indexes on meeting_id columns

BEGIN;

-- ============================================================
-- STEP 1: Create meetings table
-- ============================================================

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

-- ============================================================
-- STEP 2: Partial unique index — only one upcoming meeting at a time (MEET-03)
-- ============================================================

CREATE UNIQUE INDEX idx_one_upcoming_meeting
  ON meetings ((true))
  WHERE status = 'upcoming';

-- ============================================================
-- STEP 3: Add meeting_id FK columns (nullable first for backfill)
-- ============================================================

ALTER TABLE stations ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;
ALTER TABLE groups ADD COLUMN meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 4: Backfill existing data with "Fellesmote #1" (MEET-05)
-- ============================================================

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

-- ============================================================
-- STEP 5: Enforce NOT NULL after backfill
-- ============================================================

ALTER TABLE stations ALTER COLUMN meeting_id SET NOT NULL;
ALTER TABLE groups ALTER COLUMN meeting_id SET NOT NULL;

-- ============================================================
-- STEP 6: Replace global station number uniqueness with per-meeting uniqueness
-- ============================================================

ALTER TABLE stations DROP CONSTRAINT stations_number_key;
CREATE UNIQUE INDEX idx_stations_meeting_number ON stations(meeting_id, number);

-- ============================================================
-- STEP 7: RLS policies for meetings table
-- ============================================================

-- All authenticated users can view meetings (needed for dashboard, station selector)
CREATE POLICY "Authenticated users can view all meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can create, update, delete meetings
CREATE POLICY "Admins can manage meetings"
  ON meetings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- STEP 8: Drop obsolete meeting_status table (zero references in app code)
-- ============================================================

DROP TABLE IF EXISTS meeting_status;

-- ============================================================
-- STEP 9: Performance indexes
-- ============================================================

CREATE INDEX idx_stations_meeting_id ON stations(meeting_id);
CREATE INDEX idx_groups_meeting_id ON groups(meeting_id);

COMMIT;
