# Testing Patterns

**Analysis Date:** 2026-02-19

## Status

**Codebase Phase:** Pre-implementation (specification phase)

This codebase contains only project specification and planning documentation. No application source code or tests exist yet. The testing framework and patterns below are recommendations for the Next.js 14 + React application specified in the PRD (`Buss2028_Fellesmote_App_PRD.md`).

---

## Recommended Test Framework

**Runner:**
- Vitest (modern, fast, Next.js compatible)
- Alternative: Jest with Next.js preset
- Config: `vitest.config.ts` in project root

**Assertion Library:**
- Vitest built-in `expect`
- Matchers: `toBe`, `toEqual`, `toThrow`, `toMatchObject`

**React Testing:**
- `@testing-library/react` for component testing
- Prefer `render` and query methods over direct DOM manipulation
- Test user interactions, not implementation

**Run Commands (recommended):**
```bash
npm test                              # Run all tests
npm test -- --watch                   # Watch mode
npm test -- src/services/chat.test.ts # Single file
npm run test:coverage                 # Coverage report
```

---

## Test File Organization

**Location:**
- `*.test.ts` or `*.test.tsx` alongside source files (collocated)
- Do NOT create separate `tests/` or `__tests__/` directory
- Example:
  ```
  src/
    lib/
      auth.ts
      auth.test.ts
    services/
      chat-service.ts
      chat-service.test.ts
    components/
      ChatMessage.tsx
      ChatMessage.test.tsx
  ```

**Naming:**
- Unit tests: `module-name.test.ts`
- Integration tests: `feature-name.integration.test.ts` (when needed)
- E2E tests: `e2e/` directory at project root (separate from unit tests)

---

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('ChatService', () => {
  describe('sendMessage', () => {
    let mockDb: any;

    beforeEach(() => {
      // Reset mocks for each test
      mockDb = {
        messages: { insert: vi.fn() }
      };
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should send message to group', async () => {
      // arrange
      const message = { text: 'Hello', userId: 'user1', groupId: 'group1' };
      mockDb.messages.insert.mockResolvedValue({ id: 'msg1', ...message });

      // act
      const result = await sendMessage(message);

      // assert
      expect(result.id).toBe('msg1');
      expect(mockDb.messages.insert).toHaveBeenCalledWith(message);
    });

    it('should reject empty message', async () => {
      // arrange
      const message = { text: '', userId: 'user1', groupId: 'group1' };

      // act & assert
      await expect(sendMessage(message)).rejects.toThrow('Message cannot be empty');
    });
  });
});
```

**Patterns:**
- Use `beforeEach` for per-test setup (not `beforeAll`)
- Use `afterEach` to clean up mocks: `vi.clearAllMocks()`
- Explicit "arrange/act/assert" comments in complex tests
- One primary assertion focus per test (multiple expects OK)
- Test both happy path and error cases

---

## Mocking Strategy

**Framework:**
- Vitest built-in mocking (`vi`)
- Module mocking via `vi.mock()` at top of test file

**Mock Pattern:**

```typescript
import { vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { ChatService } from './chat-service';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn()
}));

describe('ChatService', () => {
  let mockClient: any;
  let service: ChatService;

  beforeEach(() => {
    // Create mock client
    mockClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null })
    };

    vi.mocked(createClient).mockReturnValue(mockClient);
    service = new ChatService();
  });

  it('sends message via Supabase', async () => {
    await service.sendMessage('Hello', 'user1', 'group1');

    expect(mockClient.from).toHaveBeenCalledWith('messages');
    expect(mockClient.insert).toHaveBeenCalled();
  });
});
```

**What to Mock:**
- External API calls (Supabase, third-party services)
- File system operations (if any)
- Environment variables
- Time/dates (use `vi.useFakeTimers()`)
- Network requests

**What NOT to Mock:**
- Pure utility functions
- Internal business logic
- Database queries (unless testing in isolation; integration tests use real data)
- Internal components (in component tests)

---

## Fixtures and Factories

**Test Data Pattern:**

```typescript
// Factory functions in test file
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'youth' as const,
    createdAt: new Date(),
    ...overrides
  };
}

function createTestMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'msg-1',
    text: 'Test message',
    userId: 'test-user-1',
    groupId: 'group-1',
    createdAt: new Date(),
    ...overrides
  };
}

// Usage in tests
describe('ChatService', () => {
  it('processes message', () => {
    const user = createTestUser({ role: 'parent' });
    const message = createTestMessage({ userId: user.id });
    // test with user and message
  });
});
```

**Location:**
- Factory functions: define in test file near usage
- Shared fixtures: create `tests/fixtures/` directory for large shared data
- Keep fixtures simple; factories for flexibility

---

## Component Testing

**React Component Pattern:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatMessage } from './ChatMessage';

describe('ChatMessage', () => {
  it('renders message text', () => {
    render(<ChatMessage text="Hello" userId="user1" timestamp={new Date()} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('calls callback when delete button clicked', async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();

    render(
      <ChatMessage
        text="Hello"
        userId="user1"
        timestamp={new Date()}
        onDelete={onDelete}
      />
    );

    await user.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it('handles server component data', () => {
    // For async server components, test with mock data
    const messageData = { text: 'Test', userId: 'user1', timestamp: new Date() };
    render(<ChatMessage {...messageData} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

**Patterns:**
- Use `@testing-library/react` for rendering
- Query by role/label/text (accessibility-focused)
- Use `userEvent` for interactions (not `fireEvent`)
- Test visible behavior, not implementation

---

## API Route Testing

**Next.js Route Handler Pattern:**

```typescript
// src/app/api/chat/send/route.test.ts
import { POST } from './route';

describe('POST /api/chat/send', () => {
  it('sends message successfully', async () => {
    const request = new Request('http://localhost/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        text: 'Hello',
        userId: 'user1',
        groupId: 'group1'
      })
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBeDefined();
  });

  it('returns 400 on empty message', async () => {
    const request = new Request('http://localhost/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ text: '', userId: 'user1', groupId: 'group1' })
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

---

## Supabase Testing

**Realtime Subscription Testing:**

```typescript
import { vi } from 'vitest';
import { useMessages } from './use-messages';

// Mock Supabase in setup
vi.mock('@supabase/supabase-js');

describe('useMessages hook', () => {
  it('subscribes to realtime messages', () => {
    // Setup mock Supabase client with realtime mock
    const mockSubscription = {
      unsubscribe: vi.fn()
    };

    // Mock implementation expects realtime to be called
    // and return a subscription

    const { result } = renderHook(() => useMessages('group1'));

    expect(result.current.messages).toBeDefined();

    // Cleanup
    expect(mockSubscription.unsubscribe).toBeCalled();
  });
});
```

---

## Coverage

**Recommendations:**
- No enforced minimum coverage target
- Aim for 70%+ coverage on critical paths:
  - Services (business logic)
  - API routes
  - Complex components
- Skip coverage for:
  - Config files
  - Test files themselves
  - Simple presentational components
  - Generated code

**View Coverage:**
```bash
npm run test:coverage
open coverage/index.html  # View HTML report
```

**Configuration (vitest.config.ts):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/index.ts'  // barrel files
      ]
    }
  }
});
```

---

## Test Types

**Unit Tests:**
- Scope: Single function or service method in isolation
- Mocking: Mock all external dependencies (Supabase, APIs)
- Speed: Each test <200ms
- Examples: `chat-service.test.ts`, `validators.test.ts`
- Location: `src/services/`, `src/lib/`

**Integration Tests:**
- Scope: Multiple services/modules working together
- Mocking: Mock external boundaries (Supabase, external APIs)
- Real data: Use test data or fixtures
- Setup: May need test database or seed data
- Examples: `group-creation.integration.test.ts` (tests group creation + user linking)
- Naming: `*.integration.test.ts`

**E2E Tests:**
- Framework: Playwright (recommended for Next.js)
- Scope: Full user flows (login → join group → send message → view results)
- Setup: Separate `e2e/` directory
- Speed: Run less frequently (not on every commit)
- Examples: `e2e/user-registration.spec.ts`, `e2e/group-chat-flow.spec.ts`
- Not used for unit testing APIs; use for actual browser interaction

**Component Tests:**
- Use React Testing Library
- Test user interactions and visible output
- Mock API calls, real timers

---

## Common Patterns

**Async Testing:**
```typescript
it('should fetch messages', async () => {
  const messages = await fetchMessages('group1');
  expect(messages).toHaveLength(2);
});

it('should handle async error', async () => {
  await expect(fetchMessages('invalid')).rejects.toThrow();
});
```

**Error Testing:**
```typescript
it('should throw on invalid input', () => {
  expect(() => validateEmail('invalid')).toThrow('Invalid email');
});

it('should reject on API failure', async () => {
  mockApi.mockRejectedValue(new Error('Network error'));
  await expect(fetchData()).rejects.toThrow('Network error');
});
```

**Testing Realtime Events:**
```typescript
it('handles incoming messages', async () => {
  // Subscribe to messages
  const { result } = renderHook(() => useMessages('group1'));

  // Simulate incoming message (mock Supabase realtime)
  act(() => {
    // Trigger message event
    simulateRealtimeEvent({ type: 'INSERT', payload: newMessage });
  });

  expect(result.current.messages).toContain(newMessage);
});
```

**Testing Timers:**
```typescript
import { vi } from 'vitest';

it('starts 15 minute countdown', () => {
  vi.useFakeTimers();
  const onComplete = vi.fn();

  render(<Timer duration={15 * 60} onComplete={onComplete} />);

  // Fast-forward 15 minutes
  vi.advanceTimersByTime(15 * 60 * 1000);

  expect(onComplete).toHaveBeenCalled();
  vi.useRealTimers();
});
```

---

## Test Setup & Utilities

**Recommended test utilities (create `src/test-utils.ts`):**

```typescript
import { ReactElement } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';

// Custom render that wraps with providers if needed
function render(ui: ReactElement, options?: RenderOptions) {
  return rtlRender(ui, { ...options });
}

export * from '@testing-library/react';
export { render };
```

**Mock Supabase Client (create `src/lib/__mocks__/supabase.ts`):**

```typescript
import { vi } from 'vitest';

export const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockResolvedValue({ data: [], error: null }),
  update: vi.fn().mockResolvedValue({ data: [], error: null }),
  delete: vi.fn().mockResolvedValue({ data: [], error: null }),
  on: vi.fn().mockReturnValue({ subscribe: vi.fn() })
};
```

---

## Pre-Implementation Checklist

Before implementing features, ensure:
- [ ] Test framework installed (Vitest or Jest)
- [ ] React Testing Library installed
- [ ] Supabase client mocking setup
- [ ] `npm test` command configured in `package.json`
- [ ] Test coverage configured
- [ ] Test utilities created (`test-utils.ts`)
- [ ] ESLint and Prettier configured

---

*Testing recommendations: 2026-02-19*
*Update when tests are written*
