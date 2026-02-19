-- 009_view_station_and_realtime.sql
-- Adds station_sessions to Realtime publication and creates view_station function.

-- ============================================================
-- REALTIME PUBLICATION FOR STATION_SESSIONS
-- ============================================================
-- Enables Postgres Changes events for station_sessions so dashboard
-- clients can subscribe and receive live status updates.

ALTER PUBLICATION supabase_realtime ADD TABLE station_sessions;

-- ============================================================
-- VIEW_STATION FUNCTION
-- ============================================================
-- Ensures a session row exists for a station+group pair WITHOUT starting the timer.
-- If session already exists (any status), returns it as-is.
-- If no session exists, inserts a new row with status='available', no timer.
-- SECURITY DEFINER to bypass RLS for atomic read-or-create.
--
-- Returns JSON: {id, status, end_timestamp} on success
--               {error} on failure

CREATE OR REPLACE FUNCTION public.view_station(
  p_station_id UUID,
  p_group_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Try to insert a new available session (no timer started)
  INSERT INTO station_sessions (station_id, group_id, status, started_at, end_timestamp)
  VALUES (
    p_station_id,
    p_group_id,
    'available',
    NULL,
    NULL
  )
  ON CONFLICT (station_id, group_id) DO NOTHING;

  -- Select the row (either newly inserted or already existing)
  SELECT id, status, end_timestamp INTO v_session
  FROM station_sessions
  WHERE station_id = p_station_id
    AND group_id = p_group_id;

  IF v_session IS NULL THEN
    RETURN json_build_object('error', 'Kunne ikke opprette okt');
  END IF;

  RETURN json_build_object(
    'id', v_session.id,
    'status', v_session.status,
    'end_timestamp', v_session.end_timestamp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
