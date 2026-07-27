# POS Order Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the POS follow the lecturer's order lifecycle, enforce role-based transitions, protect QR table sessions, and make order/payment operations auditable and idempotent.

**Architecture:** Keep the existing Next.js App Router and Prisma structure. Add explicit workflow helpers and audit models, then route every transition and payment event through transactional server-side functions. Preserve the current `STAFF` role as a compatibility role while exposing separate barista/server permissions through the authorization helper.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 6, PostgreSQL, existing cookie/JWT authentication, SePay webhook integration.

---

### Task 1: Lock the target workflow in pure domain helpers

**Files:**
- Modify: `lib/order-status-flow.ts`
- Modify: `lib/table-session-flow.ts`
- Test: `lib/order-status-flow.test.ts`
- Test: `lib/table-session-flow.test.ts`

- [ ] **Step 1: Write failing tests** for `READY`, `AWAITING_PAYMENT`, `COMPLETED`, role permissions, and a separate `SERVED -> AWAITING_PAYMENT -> COMPLETED` path.

- [ ] **Step 2: Run the focused tests** with `npx tsx --test lib/order-status-flow.test.ts lib/table-session-flow.test.ts` and confirm the new assertions fail against the current six-state implementation.

- [ ] **Step 3: Implement the canonical transition map** and compatibility labels. Do not auto-convert `SERVED` to `PAID`; payment completion must be an explicit transition.

- [ ] **Step 4: Run the focused tests again** and confirm all workflow assertions pass.

### Task 2: Add audit/history and payment-event data models

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<generated-order-lifecycle-migration>/migration.sql`
- Test: `lib/order-status-history.test.ts`

- [ ] **Step 1: Write failing model/helper tests** for a status-history record and duplicate payment-event identity.

- [ ] **Step 2: Extend Prisma models** with order status history, payment transactions, QR configuration, and audit logs. Add explicit enums for `READY`, `AWAITING_PAYMENT`, `COMPLETED`, payment-event state, and optional `BARISTA`/`SERVER` roles while keeping `STAFF`.

- [ ] **Step 3: Add database constraints/indexes** for positive quantities and amounts, unique provider transaction ids, one invoice per order, and fast open-session/history lookups. Use migration SQL for PostgreSQL check/partial indexes that Prisma cannot express directly.

- [ ] **Step 4: Generate Prisma client and run the model tests**. If the configured database is unavailable, run `npx prisma validate` and `npx prisma generate`, and report the unavailable migration separately.

### Task 3: Centralize transactional status transitions and authorization

**Files:**
- Create: `lib/order-workflow.ts`
- Modify: `lib/server-auth.ts`
- Modify: `app/api/orders/[id]/status/route.ts`
- Modify: `app/api/orders/[id]/route.ts`
- Test: `lib/order-workflow.test.ts`

- [ ] **Step 1: Write failing tests** for role/state combinations: barista preparation, server service, cashier completion, admin override, and cancellation after kitchen receipt.

- [ ] **Step 2: Add a workflow service** that locks the order row, rechecks its current state, checks the actor role, writes `OrderStatusHistory`, writes `AuditLog` for overrides/cancellations, and updates the order in one transaction.

- [ ] **Step 3: Replace the route's pre-read/unconditional update** with the workflow service and return `409` for stale/concurrent transitions.

- [ ] **Step 4: Run the workflow tests** and typecheck the modified route.

### Task 4: Align customer order submission with the active QR session

**Files:**
- Create: `lib/table-qr.ts`
- Modify: `prisma/schema.prisma`
- Modify: `app/api/orders/route.ts`
- Modify: `app/order/table/[tableId]/page.tsx`
- Modify: `components/orders/customer-order.tsx`
- Test: `lib/table-qr.test.ts`
- Test: `lib/customer-order-submit.test.ts`

- [ ] **Step 1: Write failing tests** for tampered table ids, closed-session QR links, unavailable products, and retrying the same idempotency key.

- [ ] **Step 2: Generate a random QR token per table/session**, store only its hash, and make the customer page/API resolve the table from the token instead of trusting a client table id.

- [ ] **Step 3: Require an active/open dining session for customer submission**, reject old tokens after close, and use an `Idempotency-Key` to return the original order on retry.

- [ ] **Step 4: Preserve separate orders for concurrent guests** while locking the table row so only one open dining session exists.

- [ ] **Step 5: Run the QR and customer submission tests** and update the customer confirmation text to show the order number and current workflow state.

### Task 5: Move cash/QR payment to the served-order stage

**Files:**
- Modify: `app/api/payments/sepay/create/route.ts`
- Modify: `app/api/payments/sepay/webhook/route.ts`
- Modify: `lib/sepay-payment.ts`
- Modify: `components/invoices/cashier-order-payment.tsx`
- Test: `lib/sepay-payment.test.ts`
- Test: `lib/cashier-payment-state.test.ts`

- [ ] **Step 1: Write failing tests** for payment eligibility, duplicate callback events, double payment, and completion only after `AWAITING_PAYMENT`.

- [ ] **Step 2: Allow payment creation only for served/awaiting-payment orders** and create the invoice only after a valid payment confirmation.

- [ ] **Step 3: Persist every provider event by provider plus provider transaction id**, make repeated callbacks no-ops, and retain conflicting second payments for reconciliation.

- [ ] **Step 4: Update cashier UI labels/actions** so it shows served orders awaiting payment and no longer sends a paid order directly to the kitchen.

- [ ] **Step 5: Run payment tests and verify the webhook route typechecks.**

### Task 6: Add item-level option and status boundaries without overclaiming

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `lib/order-item-options.ts`
- Modify: `app/api/orders/route.ts`
- Modify: `components/orders/customer-order.tsx`
- Test: `lib/order-item-options.test.ts`

- [ ] **Step 1: Write failing tests** proving sugar/ice/note are preserved in the order snapshot and unsupported topping/size values are rejected rather than silently priced.

- [ ] **Step 2: Add an explicit item status field and snapshot fields** needed by the kitchen queue. Keep topping/size/add-on out of scope unless a separate priced-option model is added.

- [ ] **Step 3: Update validation and serializers** so item status cannot bypass the parent order workflow and historical prices remain stable.

- [ ] **Step 4: Run option tests and update the staff queue to use the explicit item/order boundary.**

### Task 7: Add the lecturer's failure and concurrency regression suite

**Files:**
- Create: `lib/pos-regression.test.ts`
- Modify: `lib/order-status-flow.test.ts`
- Modify: `lib/sepay-payment.test.ts`
- Modify: `lib/customer-order-submit.test.ts`

- [ ] **Step 1: Add tests** for two simultaneous guests, stale unavailable products, post-kitchen cancellation, repeated callback, network retry, double payment, table move/merge invariants, QR tampering/closed session, and role boundaries.

- [ ] **Step 2: Run each regression test in isolation** and confirm failures identify missing behavior rather than test setup errors.

- [ ] **Step 3: Run the complete test suite, lint, typecheck, Prisma validation, and production build.**

### Task 8: Review report-facing behavior and migration safety

**Files:**
- Modify: `README.md` or project documentation if present
- Modify: affected UI status labels and empty/error states

- [ ] **Step 1: Search the repository** for old labels and transitions (`PENDING`, `CONFIRMED`, `SERVED`, `PAID`) and update user-facing workflow text to the new state vocabulary.

- [ ] **Step 2: Verify legacy data handling** for existing orders and tables before running the migration against a real database.

- [ ] **Step 3: Run the final verification commands and inspect `git diff` for unrelated changes.**

