-- 012_randomize_invite_codes.sql
-- Change parent invite codes from sequential (TBG100, TBG101)
-- to randomized format: TBG[2 random digits][2 sequence digits]
-- e.g. TBG7301, TBG4102, TBG9203

-- 1. Update trigger function to generate randomized codes
CREATE OR REPLACE FUNCTION assign_parent_invite_code()
RETURNS TRIGGER AS $$
DECLARE
  next_seq INT;
  random_prefix INT;
  new_code TEXT;
BEGIN
  IF NEW.role = 'youth' THEN
    -- Get next sequence number (01, 02, 03, ...)
    SELECT COALESCE(COUNT(*), 0) + 1
    INTO next_seq
    FROM profiles
    WHERE parent_invite_code IS NOT NULL;

    -- Generate unique code with retry loop (in case of collision)
    LOOP
      random_prefix := floor(random() * 90 + 10)::INT; -- 10-99
      new_code := 'TBG' || random_prefix || LPAD(next_seq::TEXT, 2, '0');

      -- Check uniqueness
      IF NOT EXISTS (SELECT 1 FROM profiles WHERE parent_invite_code = new_code) THEN
        NEW.parent_invite_code := new_code;
        EXIT;
      END IF;

      -- Collision: try again with different random prefix
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Re-assign existing youth codes with new format
DO $$
DECLARE
  r RECORD;
  seq INT := 1;
  random_prefix INT;
  new_code TEXT;
  done BOOLEAN;
BEGIN
  FOR r IN
    SELECT id FROM profiles WHERE role = 'youth' ORDER BY created_at
  LOOP
    done := false;
    WHILE NOT done LOOP
      random_prefix := floor(random() * 90 + 10)::INT;
      new_code := 'TBG' || random_prefix || LPAD(seq::TEXT, 2, '0');

      IF NOT EXISTS (SELECT 1 FROM profiles WHERE parent_invite_code = new_code AND id != r.id) THEN
        UPDATE profiles SET parent_invite_code = new_code WHERE id = r.id;
        done := true;
      END IF;
    END LOOP;

    seq := seq + 1;
  END LOOP;
END $$;
