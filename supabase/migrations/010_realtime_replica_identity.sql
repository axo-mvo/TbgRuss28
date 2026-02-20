-- 010_realtime_replica_identity.sql
-- Fix: Enable REPLICA IDENTITY FULL on station_sessions so that
-- Supabase Realtime postgres_changes can evaluate filters and RLS
-- policies on UPDATE events.
--
-- Without this, UPDATE WAL records only contain the primary key (id)
-- in the old record. The dashboard subscription filters on group_id
-- (a non-PK column), so the Realtime server silently drops all
-- UPDATE events — breaking live station status updates.

ALTER TABLE station_sessions REPLICA IDENTITY FULL;
