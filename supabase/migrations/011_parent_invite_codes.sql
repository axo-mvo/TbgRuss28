-- 011_parent_invite_codes.sql
-- Add unique VOKSEN### invite codes for youth to share with parents

-- 1. Add parent_invite_code column (nullable: only youth get codes)
ALTER TABLE profiles ADD COLUMN parent_invite_code TEXT UNIQUE;

-- 2. Backfill codes for all existing youth profiles
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

-- 3. Trigger function to auto-assign codes for new youth
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

-- 4. Create the trigger
CREATE TRIGGER trg_assign_parent_invite_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION assign_parent_invite_code();

-- 5. Index for fast lookup during registration
CREATE INDEX idx_profiles_parent_invite_code
  ON profiles(parent_invite_code)
  WHERE parent_invite_code IS NOT NULL;
