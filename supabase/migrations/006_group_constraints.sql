-- 006_group_constraints.sql
-- Postgres function to enforce parent-child separation in groups

-- check_parent_child_separation: Checks if adding user_id to group_id
-- would place a parent and their linked child in the same group.
-- Returns JSON: {allowed: boolean, reason: text|null}
CREATE OR REPLACE FUNCTION public.check_parent_child_separation(
  p_group_id UUID,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_conflict BOOLEAN := false;
  v_conflict_name TEXT;
BEGIN
  -- Check 1: Is this user a parent with a linked child already in the group?
  SELECT true, p.full_name INTO v_conflict, v_conflict_name
  FROM parent_youth_links pyl
  JOIN group_members gm ON gm.user_id = pyl.youth_id AND gm.group_id = p_group_id
  JOIN profiles p ON p.id = pyl.youth_id
  WHERE pyl.parent_id = p_user_id
  LIMIT 1;

  IF v_conflict THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Forelder kan ikke vaere i samme gruppe som sitt barn (' || v_conflict_name || ')');
  END IF;

  -- Check 2: Is this user a youth with a linked parent already in the group?
  SELECT true, p.full_name INTO v_conflict, v_conflict_name
  FROM parent_youth_links pyl
  JOIN group_members gm ON gm.user_id = pyl.parent_id AND gm.group_id = p_group_id
  JOIN profiles p ON p.id = pyl.parent_id
  WHERE pyl.youth_id = p_user_id
  LIMIT 1;

  IF v_conflict THEN
    RETURN json_build_object('allowed', false, 'reason',
      'Ungdom kan ikke vaere i samme gruppe som sin forelder (' || v_conflict_name || ')');
  END IF;

  RETURN json_build_object('allowed', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
