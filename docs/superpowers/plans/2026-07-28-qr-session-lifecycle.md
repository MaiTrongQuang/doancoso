# QR Session Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent QR page views from occupying tables and create a dining session only when a customer successfully submits the first order.

**Architecture:** Keep QR page loading read-only. Move session creation into the existing locked order transaction and isolate the session decision in a small pure helper so stale-session behavior is testable without database mocks. Clean only empty open sessions in the current database after the code change.

**Tech Stack:** Next.js App Router 16, Prisma 6, PostgreSQL/Supabase, TypeScript, `tsx` assertion tests.

---

### Task 1: Add the session-resolution contract

**Files:**
- Create: `lib/customer-order-session.ts`
- Test: `lib/customer-order-session.test.ts`

- [ ] Write the failing test for these cases:

```ts
assert.deepEqual(resolveCustomerOrderSession(null, null), { kind: "CREATE" });
assert.deepEqual(resolveCustomerOrderSession(null, 7), {
  kind: "USE",
  sessionId: 7,
});
assert.deepEqual(resolveCustomerOrderSession(7, 7), {
  kind: "USE",
  sessionId: 7,
});
assert.deepEqual(resolveCustomerOrderSession(7, 8), { kind: "CONFLICT" });
assert.deepEqual(resolveCustomerOrderSession(7, null), { kind: "CONFLICT" });
```

- [ ] Run `npx tsx lib/customer-order-session.test.ts` and confirm it fails because the helper does not exist.
- [ ] Implement the smallest pure resolver returning `CREATE`, `USE`, or `CONFLICT`.
- [ ] Run the focused test again and confirm it passes.

### Task 2: Make QR page access read-only

**Files:**
- Modify: `app/order/table/[tableId]/page.tsx`

- [ ] Remove the transaction write path that creates `diningSession` and updates `cafeTable.status`.
- [ ] Keep the QR token, expiry, reserved-table, table, and current open-session reads.
- [ ] Return `activeSessionId: null` when a customer opens a valid unused table QR.
- [ ] Verify the page module has no `create`, `update`, or `queryRaw` call for session/table writes.

### Task 3: Create the session during first order submission

**Files:**
- Modify: `app/api/orders/route.ts`

- [ ] Import the pure resolver.
- [ ] In the existing row-locked transaction, re-read the table's current open session and resolve the requested session id.
- [ ] Create a new `OPEN` dining session when the resolver returns `CREATE`; otherwise reuse the resolved session id.
- [ ] Return the existing stale-session conflict message for `CONFLICT`.
- [ ] Assign the resolved session id to the order and keep the existing order status history, `CONFIRMED` transition, and `OCCUPIED` update.
- [ ] Remove the pre-transaction rejection that requires an already-open session, while retaining QR validity and reserved-table checks.
- [ ] Run focused tests and `npm run typecheck`.

### Task 4: Clean empty phantom sessions

**Files:**
- No committed source changes.

- [ ] Query open sessions for tables 2–5 and verify each has zero orders.
- [ ] In one transaction, close only those empty sessions and set those tables to `AVAILABLE`.
- [ ] Verify table 1's session and orders are unchanged.

### Task 5: Full verification

**Files:**
- No additional files.

- [ ] Run `npx tsx lib/customer-order-session.test.ts`.
- [ ] Run existing focused tests for QR, table sessions, customer order submission, order workflow, and payments.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and inspect `git diff` for unintended changes.
