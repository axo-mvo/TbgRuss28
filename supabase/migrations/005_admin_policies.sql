-- 005_admin_policies.sql
-- Additional RLS policies for admin CRUD operations on profiles and parent_youth_links

-- ============================================================
-- PROFILES - Admin UPDATE/DELETE
-- ============================================================

-- Admin can UPDATE profiles (role changes)
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin can DELETE profiles
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- PARENT_YOUTH_LINKS - Admin full access
-- ============================================================

-- Admin can SELECT all parent_youth_links
CREATE POLICY "Admins can view all parent-youth links"
  ON parent_youth_links FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admin can INSERT parent_youth_links
CREATE POLICY "Admins can create parent-youth links"
  ON parent_youth_links FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admin can UPDATE parent_youth_links
CREATE POLICY "Admins can update parent-youth links"
  ON parent_youth_links FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin can DELETE parent_youth_links
CREATE POLICY "Admins can delete parent-youth links"
  ON parent_youth_links FOR DELETE
  TO authenticated
  USING (public.is_admin());
