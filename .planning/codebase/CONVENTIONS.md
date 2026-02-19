# Coding Conventions

**Analysis Date:** 2026-02-19

## Status

**Codebase Phase:** Pre-implementation (specification phase)

This codebase contains only project specification and planning documentation. No application source code exists yet. The conventions below are recommendations for the Next.js 14 + React application specified in the PRD (`Buss2028_Fellesmote_App_PRD.md`).

---

## Recommended Naming Patterns

**Files:**
- kebab-case for all TypeScript/JavaScript files (e.g., `user-service.ts`, `group-manager.tsx`)
- PascalCase for React component files (e.g., `ChatMessage.tsx`, `GroupsList.tsx`)
- `*.test.ts` or `*.test.tsx` for test files alongside source
- `index.ts` for barrel exports from directories

**Functions:**
- camelCase for all functions (e.g., `getUserProfile`, `createInviteCode`)
- `handleEventName` for event handlers (e.g., `handleChatSubmit`, `handleTimerComplete`)
- No special prefix for async functions

**Variables:**
- camelCase for variables (e.g., `currentUser`, `timerDuration`)
- UPPER_SNAKE_CASE for constants (e.g., `MAX_GROUP_SIZE`, `TIMER_DURATION_MS`)
- Prefer const over let; use let only for values that must change

**Types:**
- PascalCase for interfaces and type aliases, no `I` prefix (e.g., `User`, not `IUser`)
- PascalCase for enum names; UPPER_CASE for enum values (e.g., `enum UserRole { ADMIN, YOUTH, PARENT }`)
- Append `Props` for React component props types (e.g., `ChatMessageProps`)

---

## Recommended Code Style

**Formatting:**
- Use Prettier with configuration in `.prettierrc`
- 100 character line length maximum
- Single quotes for strings
- Semicolons required
- 2-space indentation
- Trailing commas in multi-line objects/arrays

**Linting:**
- ESLint with `eslint.config.js` (or flat config)
- Extends `@typescript-eslint/recommended`
- Include `eslint-plugin-react` and `eslint-plugin-next` for Next.js
- Run: `npm run lint`
- No `console.log` in production code (use structured logging)

---

## Import Organization

**Order:**
1. External packages (react, next, third-party libraries)
2. Internal modules (@/services, @/lib, @/components)
3. Relative imports (./utils, ../types)
4. Type imports (import type { User })

**Grouping:**
- Blank line between each group
- Alphabetical within each group
- Type imports at end of their respective group

**Path Aliases:**
- `@/` maps to `src/`
- `@/components/` for React components
- `@/services/` for service classes/functions
- `@/lib/` for utilities and helpers
- `@/types/` for shared TypeScript types

**Example:**
```typescript
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

import { useAuth } from '@/lib/auth';
import { ChatService } from '@/services/chat-service';
import { Timer } from '@/components/timer';

import { loadConfig } from './config';

import type { User, Group } from '@/types';
```

---

## Error Handling

**Patterns:**
- Throw errors at service boundaries; catch in route handlers and top-level components
- Extend Error class for custom errors (e.g., `ValidationError`, `NotFoundError`, `UnauthorizedError`)
- Async functions use try/catch blocks; avoid `.catch()` chains
- Always log error with context before throwing in services

**Custom Error Classes:**
- Location: `src/lib/errors.ts` (create if needed)
- Examples:
  ```typescript
  export class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }

  export class NotFoundError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
    }
  }
  ```

**Error Handling Locations:**
- Route handlers: wrap in try/catch, return appropriate HTTP status
- React components: use error boundaries for render errors, try/catch in event handlers
- Services: log and throw, let caller handle

---

## Recommended Logging

**Framework:**
- Use `console` for development and simple logging
- Consider `pino` or `winston` for structured production logging
- Levels: debug, info, warn, error

**Patterns:**
- Log at service boundaries (API calls, database operations)
- Log state transitions (user login, timer start/stop, group transitions)
- Log errors with context: `console.error({ userId, action, error }, 'Operation failed')`
- Never log sensitive data (passwords, tokens, PII)

**Recommendations:**
```typescript
// Good: service boundary with context
const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(`[INFO] ${message}`, context || '');
  },
  error: (message: string, error?: Error, context?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, { error, ...context });
  }
};

// In service:
logger.info('User logged in', { userId, timestamp });
logger.error('Failed to fetch group', err, { groupId });
```

---

## Comments

**When to Comment:**
- Explain WHY, not WHAT (code shows what; comments explain business logic)
- Document non-obvious algorithms or complex flows
- Explain business rules and constraints
- Link to issues for TODO comments

**Format:**
- Single-line comments: `// explanation`
- Multi-line: use `/* */` for complex explanations
- Avoid obvious comments: "// increment counter" is unnecessary

**JSDoc/TSDoc:**
- Required for public API functions (exported from modules)
- Optional for internal functions if signature is self-explanatory
- Use `@param`, `@returns`, `@throws` tags

**TODO Comments:**
- Format: `// TODO: description` (no username/date)
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`

---

## Function Design

**Size:**
- Keep functions under 50 lines
- Extract helper functions for complex logic
- One level of abstraction per function

**Parameters:**
- Maximum 3 parameters
- For 4+ parameters, use options object:
  ```typescript
  function createGroup(options: CreateGroupOptions) {
    const { name, station, maxSize } = options;
  }
  ```
- Destructure in parameter list for clarity

**Return Values:**
- Explicit return statements
- Use early returns for guard clauses
- For expected failures (validation, not found), consider returning null or undefined rather than throwing
- For unexpected failures, throw

**Pattern Example:**
```typescript
// Good: small, single responsibility
async function validateInviteCode(code: string): Promise<boolean> {
  const record = await db.inviteCodes.findByCode(code);
  return record?.isActive && record.uses < record.maxUses;
}

// Bad: too much, multiple concerns
async function processUserRegistration(data: any): Promise<any> {
  // validation, database insert, email sending, auth creation...
}
```

---

## Module Design

**Exports:**
- Named exports preferred for functions and classes
- Default export only for React components
- Re-export public API from index files (`src/components/index.ts`, `src/services/index.ts`)

**Barrel Files (index.ts):**
- Use `index.ts` to export public API from directories
- Keep internal helpers private (don't export from index)
- Avoid circular dependencies (import from specific files if needed)

**Example structure:**
```
src/services/
  chat-service.ts (export class ChatService)
  user-service.ts (export class UserService)
  index.ts (export { ChatService, UserService })

// Usage:
import { ChatService, UserService } from '@/services';
```

---

## React-Specific Conventions

**Component Files:**
- PascalCase filenames: `ChatMessage.tsx`, `GroupsList.tsx`
- One component per file (or co-located small helpers)
- Props interface named `ComponentNameProps`

**Hooks:**
- Prefix custom hooks with `use`: `useChatMessages`, `useGroupTimer`
- Keep hooks focused on single concern
- Extract complex logic into custom hooks

**Server vs Client Components:**
- Next.js 14 App Router: assume Server Components by default
- Mark interactive components with `'use client'`
- Separate server and client logic

---

## TypeScript Conventions

**Strict Mode:**
- Enable `strict: true` in `tsconfig.json`
- No `any` types (use `unknown` if truly unknown, then narrow)
- Type all function parameters and return values

**Union Types:**
- Prefer unions over booleans for state: `status: 'idle' | 'loading' | 'error'`
- Use discriminated unions for complex state

**Naming:**
- Types for data structures: `User`, `Group`, `Message`
- Types for options: `UserServiceOptions`, `CreateUserParams`
- Never prefix types with `T` (e.g., no `TUser`)

---

## Database & Supabase Conventions

**Query Functions:**
- Naming: `query{Entity}`, `fetch{Entity}`: `queryUsers`, `fetchGroupById`
- Location: `src/services/` as methods or `src/lib/db/` as standalone functions
- Error handling: throw on database errors, log with context

**Type Safety:**
- Generate TypeScript types from Supabase schema
- Use generated types in function signatures
- Never use `any` for database records

---

## Real-Time Chat Conventions

**Message Structure:**
- Use TypeScript types to define message shape (see `@/types`)
- Timestamp in ISO format or Unix milliseconds
- Include sender userId and optional groupId

**Supabase Realtime Subscriptions:**
- Use functional approach in custom hooks
- Clean up subscriptions in useEffect cleanup
- Handle reconnection gracefully

---

*Convention recommendations: 2026-02-19*
*Update when codebase is established*
