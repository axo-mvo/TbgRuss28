-- =============================================================
-- REALTIME DIAGNOSTIC — single query, all checks
-- Run in Supabase Dashboard → SQL Editor
-- =============================================================

SELECT * FROM (

  -- 1. REPLICA IDENTITY
  SELECT '1. REPLICA IDENTITY' AS check_name,
    CASE relreplident
      WHEN 'f' THEN 'FULL ✅'
      WHEN 'd' THEN 'DEFAULT (pk only) ❌'
      WHEN 'n' THEN 'NOTHING ❌'
      WHEN 'i' THEN 'INDEX ❌'
    END AS result
  FROM pg_class WHERE relname = 'station_sessions'

  UNION ALL

  -- 2. PUBLICATION MEMBERSHIP
  SELECT '2. PUBLICATION' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'station_sessions'
    ) THEN 'In supabase_realtime ✅'
      ELSE 'NOT in publication ❌'
    END AS result

  UNION ALL

  -- 3. RLS ENABLED
  SELECT '3. RLS ENABLED' AS check_name,
    CASE WHEN relrowsecurity THEN 'Yes ✅' ELSE 'No ❌' END AS result
  FROM pg_class WHERE relname = 'station_sessions'

  UNION ALL

  -- 4. RLS SELECT POLICY EXISTS
  SELECT '4. RLS SELECT POLICY' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_policy
      WHERE polrelid = 'station_sessions'::regclass AND polcmd = 'r'
    ) THEN 'Exists ✅' ELSE 'Missing ❌' END AS result

  UNION ALL

  -- 5. PUBLICATION PUBLISHES UPDATES
  SELECT '5. PUB UPDATES' AS check_name,
    CASE WHEN pubupdate THEN 'Yes ✅' ELSE 'No ❌' END AS result
  FROM pg_publication WHERE pubname = 'supabase_realtime'

  UNION ALL

  -- 6. WAL LEVEL
  SELECT '6. WAL LEVEL' AS check_name,
    CASE WHEN setting = 'logical' THEN 'logical ✅' ELSE setting || ' ❌' END AS result
  FROM pg_settings WHERE name = 'wal_level'

  UNION ALL

  -- 7. SESSION COUNTS
  SELECT '7. SESSIONS' AS check_name,
    'total=' || COUNT(*)
    || ' avail=' || COUNT(*) FILTER (WHERE status = 'available')
    || ' active=' || COUNT(*) FILTER (WHERE status = 'active')
    || ' done=' || COUNT(*) FILTER (WHERE status = 'completed') AS result
  FROM station_sessions

  UNION ALL

  -- 8. REALTIME EXTENSION ENABLED
  SELECT '8. REALTIME EXT' AS check_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'supabase_realtime' OR extname = 'pg_net'
    ) THEN 'Present ✅' ELSE 'Not found ⚠️' END AS result

  UNION ALL

  -- 9. RLS POLICY COUNT (all commands)
  SELECT '9. POLICY COUNT' AS check_name,
    COUNT(*)::text || ' policies on station_sessions' AS result
  FROM pg_policy WHERE polrelid = 'station_sessions'::regclass

) checks
ORDER BY check_name;
