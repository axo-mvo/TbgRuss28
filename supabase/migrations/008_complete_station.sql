-- 008_complete_station.sql
-- Atomic station completion function (idempotent, race-safe)

-- ============================================================
-- COMPLETE_STATION FUNCTION
-- ============================================================
-- Atomically completes a station session.
-- Uses FOR UPDATE row lock to prevent race conditions.
-- Idempotent: calling on an already-completed session returns success.
-- SECURITY DEFINER to bypass RLS for the atomicity check.
--
-- Returns JSON: {success: true} on success
--               {error} on failure

CREATE OR REPLACE FUNCTION public.complete_station(
  p_session_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
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

  -- Already completed (or any non-active status) -> return success (idempotent)
  IF v_session.status != 'active' THEN
    RETURN json_build_object('success', true);
  END IF;

  -- Transition from active to completed
  UPDATE station_sessions
  SET status = 'completed',
      completed_at = now()
  WHERE id = p_session_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
