---
status: resolved
trigger: "frame.join is not a function crash when other user ends station"
created: 2026-02-19T00:00:00Z
updated: 2026-02-19T00:00:00Z
---

## Current Focus

hypothesis: The crash is a React 19 dev-mode bug in RSC debug info processing (buildFakeCallStack calls frame.join on non-array). Triggered by router.push from WebSocket callback context without error boundaries. The absence of error.tsx and unclean channel cleanup amplify the impact.
test: Fix the station-ended navigation flow and add error boundaries
expecting: No more full-screen crash when station is ended by another user
next_action: Apply fix - add error.tsx, improve onStationEnded callback robustness, clean up channel before navigation

## Symptoms

expected: When user A ends a station, user B should be redirected to the dashboard gracefully via the 'station-ended' broadcast event.
actual: User B's browser crashes with a full-screen "Application error: a client-side exception has occurred" and the Next.js error overlay shows "Runtime TypeError: frame.join is not a function" with 17 ignore-listed frames.
errors: Runtime TypeError: frame.join is not a function (Next.js 15.5.12 Webpack)
reproduction: Open station with 2 users. User A clicks "end station". User B's screen crashes.
started: New issue in the station-ending flow implemented in phase 04.

## Eliminated

- hypothesis: ".join()" is called in application code on a non-array
  evidence: Grep of entire src/ for ".join(" returned zero matches. No application code uses .join().
  timestamp: 2026-02-19T00:10:00Z

- hypothesis: The error comes from Supabase or another third-party library
  evidence: Grep of node_modules/@supabase for "frame.join" returned zero matches. Only Next.js/React bundled code contains frame.join.
  timestamp: 2026-02-19T00:15:00Z

- hypothesis: Server component rendering throws an error during dashboard load
  evidence: Dashboard page uses only Supabase queries that return {data, error} and never throw. Build succeeds. Server action endStation also doesn't throw.
  timestamp: 2026-02-19T00:20:00Z

## Evidence

- timestamp: 2026-02-19T00:10:00Z
  checked: Grep for .join( in src/ directory
  found: Zero matches - no application code uses .join()
  implication: The error is from framework internals, not application code

- timestamp: 2026-02-19T00:12:00Z
  checked: Grep for "frame.join" in node_modules
  found: 18 files, ALL in next/dist/compiled/react-server-dom-webpack* and next-server/app-page*.runtime.dev.js
  implication: Error is in React's RSC client debug info processing, development mode only

- timestamp: 2026-02-19T00:14:00Z
  checked: The buildFakeCallStack function in react-server-dom-webpack-client.browser.development.js:2498-2539
  found: Function iterates over stack array, calls stack[i].join("-") expecting each frame to be an array tuple [name, file, line, col, enclosingLine, enclosingCol]. If frame is not an array (e.g., string), .join() fails.
  implication: The RSC debug info contains stack frames in unexpected format

- timestamp: 2026-02-19T00:16:00Z
  checked: React version bundled with Next.js vs installed
  found: Next.js 15.5.12 bundles React "19.2.0-canary-0bdb9206-20250818", project has React 19.2.4 installed
  implication: Potential version mismatch in RSC debug info wire format between canary and stable React

- timestamp: 2026-02-19T00:18:00Z
  checked: Error boundaries in the app
  found: No error.tsx or global-error.tsx files exist anywhere in src/app/
  implication: Any error crashes the entire app with no graceful fallback

- timestamp: 2026-02-19T00:20:00Z
  checked: onStationEnded callback context
  found: router.push('/dashboard') is called from Supabase Realtime WebSocket callback (non-React context). Channel is not unsubscribed before navigation.
  implication: Navigation from WebSocket callback may interact poorly with React RSC processing. Channel stays active during navigation transition.

- timestamp: 2026-02-19T00:22:00Z
  checked: useConnectionStatus hook cleanup
  found: supabase.realtime.onHeartbeat() callback is NOT cleaned up on unmount (no unsubscribe mechanism exists). Only window event listeners are removed.
  implication: Minor leaked callback, but not direct crash cause

## Resolution

root_cause: The crash "frame.join is not a function" is a React 19 development-mode bug in the RSC client debug info processing (buildFakeCallStack in react-server-dom-webpack-client.browser.development.js:2508). It occurs when processing the RSC response during client-side navigation to /dashboard triggered by the onStationEnded callback. The callback fires from a Supabase Realtime WebSocket handler (non-React context), and the Realtime channel is not unsubscribed before initiating navigation. This combination, along with the absence of any error boundary (error.tsx), causes the dev-mode crash to propagate as a full-screen error. Contributing factor: version mismatch between bundled React canary (19.2.0-canary) and installed React (19.2.4).
fix: |
  1) In ChatRoom.tsx onStationEnded callback: unsubscribe Realtime channel before navigating, then use window.location.href='/dashboard' (full page navigation) instead of router.push to bypass RSC dev-mode crash
  2) In ChatRoom.tsx handleEndStation: unsubscribe channel after broadcasting station-ended event to prevent self-received broadcast from racing with User A's navigation
  3) Created src/app/dashboard/error.tsx error boundary to catch any future errors gracefully instead of full-screen crash
verification: TypeScript compiles clean. Next.js build succeeds. Full manual verification requires Docker/Supabase running with 2 browser sessions.
files_changed:
  - src/components/station/ChatRoom.tsx
  - src/app/dashboard/error.tsx
