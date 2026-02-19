-- 003_functions.sql
-- Database functions for Buss 2028 Fellesmote app

-- validate_invite_code: Atomically validates and increments invite code usage
-- Returns JSON: {valid: boolean, role: text, error: text}
-- SECURITY DEFINER: runs with table owner privileges to bypass RLS for atomic update
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_updated RECORD;
BEGIN
  -- Find the invite code
  SELECT * INTO v_invite
  FROM invite_codes
  WHERE code = p_code;

  -- Code does not exist
  IF v_invite IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'role', NULL,
      'error', 'Ugyldig invitasjonskode'
    );
  END IF;

  -- Code is deactivated
  IF NOT v_invite.active THEN
    RETURN json_build_object(
      'valid', false,
      'role', NULL,
      'error', 'Invitasjonskoden er deaktivert'
    );
  END IF;

  -- Code has reached max uses
  IF v_invite.uses >= v_invite.max_uses THEN
    RETURN json_build_object(
      'valid', false,
      'role', NULL,
      'error', 'Invitasjonskoden er brukt opp'
    );
  END IF;

  -- Atomically increment uses (handles race condition)
  -- The WHERE clause ensures we only increment if uses < max_uses
  UPDATE invite_codes
  SET uses = uses + 1
  WHERE id = v_invite.id
    AND uses < max_uses
  RETURNING * INTO v_updated;

  -- If no rows updated, another user claimed the last spot
  IF v_updated IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'role', NULL,
      'error', 'Invitasjonskoden er akkurat brukt opp'
    );
  END IF;

  -- Success
  RETURN json_build_object(
    'valid', true,
    'role', v_updated.role,
    'error', NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
