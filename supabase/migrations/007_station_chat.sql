-- 007_station_chat.sql
-- RLS for Supabase Realtime private channels and atomic station opening function

-- ============================================================
-- REALTIME CHANNEL AUTHORIZATION
-- ============================================================
-- Private Broadcast channels require RLS on realtime.messages.
-- This policy allows group members to send/receive on channels
-- named 'station:{sessionId}' if they belong to the session's group.

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

-- ============================================================
-- OPEN_STATION FUNCTION
-- ============================================================
-- Atomically opens a station for a group.
-- Uses INSERT ... ON CONFLICT on UNIQUE(station_id, group_id).
-- Enforces one-active-station-per-group constraint.
-- SECURITY DEFINER to bypass RLS for the atomicity check.
--
-- Returns JSON: {id, end_timestamp, status} on success
--               {error} on failure

CREATE OR REPLACE FUNCTION public.open_station(
  p_station_id UUID,
  p_group_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_active_other RECORD;
BEGIN
  -- Step 1: Check if this station+group already has a session
  SELECT * INTO v_session
  FROM station_sessions
  WHERE station_id = p_station_id
    AND group_id = p_group_id
  FOR UPDATE; -- Lock the row to prevent concurrent modifications

  -- Case A: Session exists and is completed -> return error
  IF v_session IS NOT NULL AND v_session.status = 'completed' THEN
    RETURN json_build_object(
      'error', 'Stasjonen er allerede fullfort'
    );
  END IF;

  -- Case B: Session exists and is already active -> return existing session
  IF v_session IS NOT NULL AND v_session.status = 'active' THEN
    RETURN json_build_object(
      'id', v_session.id,
      'end_timestamp', v_session.end_timestamp,
      'status', v_session.status
    );
  END IF;

  -- Step 2: Check no OTHER station is active for this group
  SELECT id INTO v_active_other
  FROM station_sessions
  WHERE group_id = p_group_id
    AND status = 'active'
    AND station_id != p_station_id
  LIMIT 1;

  IF v_active_other IS NOT NULL THEN
    RETURN json_build_object(
      'error', 'Gruppen har allerede en aktiv stasjon'
    );
  END IF;

  -- Step 3: Create or activate the session
  -- Uses upsert: if row exists (available), update to active; if not, insert
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
