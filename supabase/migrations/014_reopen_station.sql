-- 014_reopen_station.sql
-- Atomic station reopen function (allows reopening completed stations with extra time)

-- ============================================================
-- REOPEN_STATION FUNCTION
-- ============================================================
-- Atomically reopens a completed station session with additional time.
-- Uses FOR UPDATE row lock to prevent race conditions.
-- Enforces one-active-station-per-group constraint.
-- SECURITY DEFINER to bypass RLS for the atomicity check.
--
-- Returns JSON: {id, end_timestamp, status} on success
--               {error} on failure

CREATE OR REPLACE FUNCTION public.reopen_station(
  p_session_id UUID,
  p_extra_minutes INT
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_active_other RECORD;
BEGIN
  -- Lock the session row to prevent concurrent modifications
  SELECT * INTO v_session
  FROM station_sessions
  WHERE id = p_session_id
  FOR UPDATE;

  -- Session not found
  IF v_session IS NULL THEN
    RETURN json_build_object('error', 'Okt ikke funnet');
  END IF;

  -- Only completed stations can be reopened
  IF v_session.status != 'completed' THEN
    RETURN json_build_object('error', 'Stasjonen er ikke avsluttet');
  END IF;

  -- Validate extra minutes (must be one of the allowed values)
  IF p_extra_minutes NOT IN (2, 5, 10, 15) THEN
    RETURN json_build_object('error', 'Ugyldig tid');
  END IF;

  -- Check no OTHER station is active for this group
  SELECT id INTO v_active_other
  FROM station_sessions
  WHERE group_id = v_session.group_id
    AND status = 'active'
    AND id != p_session_id
  LIMIT 1;

  IF v_active_other IS NOT NULL THEN
    RETURN json_build_object('error', 'Gruppen har allerede en aktiv stasjon');
  END IF;

  -- Reopen: set active, new end_timestamp, clear completed_at
  UPDATE station_sessions
  SET status = 'active',
      end_timestamp = now() + (p_extra_minutes || ' minutes')::interval,
      completed_at = NULL
  WHERE id = p_session_id
  RETURNING * INTO v_session;

  RETURN json_build_object(
    'id', v_session.id,
    'end_timestamp', v_session.end_timestamp,
    'status', v_session.status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
