-- 013_dashboard_realtime_policy.sql
-- Allow private realtime channels for dashboard postgres_changes subscriptions.
-- Channel name pattern: 'dashboard:{groupId}'
-- Scoped: user must be a member of the group matching the channel topic.
--
-- Note: we do NOT filter on realtime.messages.extension because the
-- internal extension value for postgres_changes differs from 'postgres_changes'.
-- Topic scoping is sufficient — users can only subscribe to their own group's channel.

CREATE POLICY "Group members can subscribe to dashboard channels"
ON "realtime"."messages"
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.user_id = (SELECT auth.uid())
      AND 'dashboard:' || gm.group_id::text = (SELECT realtime.topic())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.user_id = (SELECT auth.uid())
      AND 'dashboard:' || gm.group_id::text = (SELECT realtime.topic())
  )
);
