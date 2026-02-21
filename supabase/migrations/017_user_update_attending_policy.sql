-- Migration 017: Allow users to update their own attending status
-- Fixes: attendance toggle not persisting because RLS blocked non-admin updates
-- Only allows updating own profile row (id = auth.uid())

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
