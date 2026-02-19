---
phase: quick-2
plan: 02
status: complete
started: 2026-02-19
completed: 2026-02-19
duration: ~1min
tasks_completed: 1
tasks_total: 1
---

# Summary: Fix chat messages not appearing

## Root Cause

`ChatRoom.handleSend` broadcast the message via `sendBroadcast()` and relied on Supabase Broadcast's `self: true` option to echo the message back to the sender's `on('broadcast')` handler which adds it to local state. When Broadcast falls back to REST delivery (console warning: "send() is automatically falling back to REST API"), the self-receive doesn't work reliably, so the sender's message never appears in their chat.

## Fix

Added `setMessages((prev) => [...prev, optimisticMessage])` before `sendBroadcast()` in `ChatRoom.tsx:handleSend`. The sender now sees their message instantly via local state. The broadcast handler already deduplicates by message ID, so when the self-echo arrives it just updates status from 'pending' to 'sent'.

## Key Files Modified

- `src/components/station/ChatRoom.tsx` — Added optimistic local state update before broadcast

## Commits

| Hash | Message |
|------|---------|
| 0a2abbd | fix(chat): add optimistic message to local state before broadcast |
