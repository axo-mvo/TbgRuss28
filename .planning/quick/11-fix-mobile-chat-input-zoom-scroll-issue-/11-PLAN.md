---
phase: quick-11
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/station/ChatInput.tsx
  - src/app/layout.tsx
autonomous: true
requirements: [QUICK-11]

must_haves:
  truths:
    - "Tapping the chat input on iOS Safari does NOT trigger auto-zoom"
    - "The send button remains visible and tappable when the input is focused"
    - "The page does not shift/scroll horizontally when the keyboard opens"
  artifacts:
    - path: "src/components/station/ChatInput.tsx"
      provides: "Chat input with 16px font to prevent iOS zoom"
      contains: "text-base"
    - path: "src/app/layout.tsx"
      provides: "Viewport meta preventing user scaling on mobile"
      contains: "maximum-scale=1"
  key_links:
    - from: "src/app/layout.tsx"
      to: "viewport meta"
      via: "Next.js metadata export"
      pattern: "viewport.*maximum-scale"
---

<objective>
Fix the iOS Safari auto-zoom and horizontal scroll issue that occurs when tapping the chat input field on mobile.

Purpose: On iOS Safari, any input with font-size below 16px triggers the browser's auto-zoom behavior, which shifts the page left, hides the send button off-screen, and causes a jarring snap. This makes the chat unusable on mobile phones.

Output: A chat input that stays properly sized and positioned on iOS Safari when focused, with no auto-zoom or horizontal shift.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/station/ChatInput.tsx
@src/components/station/ChatRoom.tsx
@src/app/layout.tsx
@src/app/globals.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix chat input font size and add viewport constraints</name>
  <files>src/components/station/ChatInput.tsx, src/app/layout.tsx</files>
  <action>
Two changes to fix iOS Safari auto-zoom on chat input focus:

**1. ChatInput.tsx -- Change `text-sm` to `text-base` on the input element (line 33)**

The input currently uses `text-sm` which is 14px in Tailwind. iOS Safari auto-zooms any input with font-size below 16px. Change `text-sm` to `text-base` (16px) to prevent this.

In the className string on the `<input>` element, replace `text-sm` with `text-base`. Keep all other classes identical. Do NOT change placeholder text size (the `placeholder:text-text-muted/50` class is fine as-is since placeholder inherits the input's font-size).

**2. layout.tsx -- Add viewport metadata export with maximum-scale=1**

Next.js 15 uses a `viewport` export (not a meta tag) to control the viewport. Add the following export to `src/app/layout.tsx`:

```typescript
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

This prevents iOS Safari from zooming in on any input focus. The `userScalable: false` combined with `maximumScale: 1` is the belt-and-suspenders approach. This is acceptable for this app since it is a purpose-built discussion tool (not a general content site where pinch-to-zoom matters for accessibility).

Do NOT touch ChatRoom.tsx or any other files. The fix is entirely in the two files listed.
  </action>
  <verify>
1. `npm run build` completes without errors
2. In ChatInput.tsx, the input element uses `text-base` (not `text-sm`)
3. In layout.tsx, a `viewport` export exists with `maximumScale: 1`
  </verify>
  <done>
- Chat input renders at 16px font-size (text-base), preventing iOS Safari auto-zoom
- Viewport meta tag includes maximum-scale=1 and user-scalable=no
- Build passes with no errors
- No visual regression: input still has proper height, padding, and styling
  </done>
</task>

</tasks>

<verification>
- `npm run build` passes
- ChatInput.tsx contains `text-base` class on the input element
- layout.tsx exports a `viewport` object with `maximumScale: 1`
- No other files were modified
</verification>

<success_criteria>
The chat input field no longer triggers iOS Safari auto-zoom when tapped on mobile. The send button stays visible and tappable. The page does not shift horizontally.
</success_criteria>

<output>
After completion, create `.planning/quick/11-fix-mobile-chat-input-zoom-scroll-issue-/11-SUMMARY.md`
</output>
