-- 002_rls.sql
-- Row Level Security policies for all tables

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES
-- ============================================================

-- Authenticated users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin can read all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- INSERT via service role only (registration uses admin client)
-- No INSERT policy needed for authenticated -- admin client bypasses RLS

-- ============================================================
-- INVITE_CODES
-- ============================================================

-- Anyone (anon + authenticated) can read active invite codes
-- Needed for registration form validation
CREATE POLICY "Anyone can view active invite codes"
  ON invite_codes FOR SELECT
  TO anon, authenticated
  USING (active = true);

-- UPDATE via service role only (atomic increment in validate_invite_code function)

-- ============================================================
-- PARENT_YOUTH_LINKS
-- ============================================================

-- Authenticated users can view their own links (as parent or youth)
CREATE POLICY "Users can view own parent-youth links"
  ON parent_youth_links FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid() OR youth_id = auth.uid());

-- INSERT via service role only (registration uses admin client)

-- ============================================================
-- GROUPS
-- ============================================================

-- Authenticated users can read all groups (needed for dashboard)
CREATE POLICY "Authenticated users can view all groups"
  ON groups FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE/DELETE admin only
CREATE POLICY "Admins can manage groups"
  ON groups FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- GROUP_MEMBERS
-- ============================================================

-- Authenticated users can read all group members (needed to check membership)
CREATE POLICY "Authenticated users can view group members"
  ON group_members FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/DELETE admin only
CREATE POLICY "Admins can manage group members"
  ON group_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can remove group members"
  ON group_members FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- STATIONS
-- ============================================================

-- Authenticated users can read all stations
CREATE POLICY "Authenticated users can view stations"
  ON stations FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- STATION_SESSIONS
-- ============================================================

-- Authenticated users can view sessions for their group
CREATE POLICY "Users can view sessions for their group"
  ON station_sessions FOR SELECT
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Admins can view all sessions
CREATE POLICY "Admins can view all sessions"
  ON station_sessions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Group members can create/update sessions for their group
CREATE POLICY "Group members can create sessions"
  ON station_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can update sessions"
  ON station_sessions FOR UPDATE
  TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- Admins can manage all sessions
CREATE POLICY "Admins can manage sessions"
  ON station_sessions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================
-- MESSAGES
-- ============================================================

-- Users can read messages for sessions in their group
CREATE POLICY "Users can view messages in their group sessions"
  ON messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT ss.id FROM station_sessions ss
      JOIN group_members gm ON gm.group_id = ss.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- Admins can read all messages
CREATE POLICY "Admins can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Users can insert messages for sessions in their group
CREATE POLICY "Users can send messages in their group sessions"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND session_id IN (
      SELECT ss.id FROM station_sessions ss
      JOIN group_members gm ON gm.group_id = ss.group_id
      WHERE gm.user_id = auth.uid()
    )
  );

-- ============================================================
-- MEETING_STATUS
-- ============================================================

-- Authenticated users can read meeting status
CREATE POLICY "Authenticated users can view meeting status"
  ON meeting_status FOR SELECT
  TO authenticated
  USING (true);

-- Admin can update meeting status
CREATE POLICY "Admins can update meeting status"
  ON meeting_status FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
