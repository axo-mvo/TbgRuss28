-- Migration 025: Add is_admin boolean flag to profiles
-- Purpose: Decouple admin access from the role column so youth/parent members
--          can also be admins while retaining their participant identity.

-- 1. Add is_admin column
ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrate existing admin users: set is_admin=true, change role to 'youth'
--    (All current admins in this app are youth organizers)
UPDATE profiles SET is_admin = true, role = 'youth' WHERE role = 'admin';

-- 3. Update the RLS helper function to check is_admin instead of role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 4. Add partial index for fast admin lookups
CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Note: The CHECK constraint on role still allows 'admin' for backward compatibility:
--   CHECK (role IN ('admin', 'youth', 'parent'))
-- But 'admin' will no longer be used for new users. Admin access is controlled by is_admin.
