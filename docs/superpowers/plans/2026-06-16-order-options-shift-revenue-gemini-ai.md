# Order Options, Shift Revenue, Gemini AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add customer sugar/ice options, fixed monthly shift revenue, and Gemini AI for admin/customer assistance.

**Architecture:** Keep order options in the existing item note surface to avoid migration risk. Add pure helpers for option formatting, shift aggregation, and AI prompt/response parsing, then wire them into existing route handlers and client components. Gemini calls are server-side REST requests using `GEMINI_API_KEY`.

**Tech Stack:** Next.js App Router route handlers, React client components, Prisma, TypeScript, Gemini REST `generateContent`.

---

### Task 1: Order Option Helpers And Cart UI

**Files:**
- Create: `lib/order-item-options.ts`
- Test: `lib/order-item-options.test.ts`
- Modify: `components/orders/customer-order.tsx`

- [ ] Write failing tests for option levels, cake exclusion, and formatted notes.
- [ ] Run `npx tsx lib/order-item-options.test.ts` and confirm it fails because the helper does not exist.
- [ ] Implement helper constants and formatting.
- [ ] Add sugar/ice state and chip controls to the cart item UI.
- [ ] Submit formatted item notes through the existing `POST /api/orders` payload.
- [ ] Run `npx tsx lib/order-item-options.test.ts`.

### Task 2: Monthly Shift Revenue

**Files:**
- Create: `lib/shift-revenue.ts`
- Test: `lib/shift-revenue.test.ts`
- Modify: `lib/dashboard-summary.ts`
- Modify: `app/api/dashboard/summary/route.ts`
- Modify: `app/admin/dashboard/dashboard-content.tsx`

- [ ] Write failing tests for Vietnam month range and the six fixed shift buckets.
- [ ] Run `npx tsx lib/shift-revenue.test.ts` and confirm it fails.
- [ ] Implement pure shift aggregation helpers.
- [ ] Query paid invoices for the selected month and append `shiftRevenue` to dashboard summary.
- [ ] Add a month picker and shift revenue panel to admin dashboard.
- [ ] Run dashboard and shift tests.

### Task 3: Gemini Server Helpers And Admin AI

**Files:**
- Create: `lib/gemini.ts`
- Create: `lib/ai-insights.ts`
- Test: `lib/ai-insights.test.ts`
- Create: `app/api/ai/admin-insights/route.ts`
- Modify: `app/admin/dashboard/dashboard-content.tsx`
- Modify: `.env`
- Modify: `.env.example`

- [ ] Write failing tests for JSON extraction and admin prompt shape.
- [ ] Run `npx tsx lib/ai-insights.test.ts` and confirm it fails.
- [ ] Implement Gemini REST helper and admin prompt/parse helpers.
- [ ] Add admin route protected by `ADMIN`.
- [ ] Add dashboard button/panel to request AI insight.
- [ ] Add `GEMINI_API_KEY` to local `.env` and non-secret `GEMINI_MODEL` to `.env.example`.

### Task 4: Customer Gemini Chat

**Files:**
- Create: `app/api/ai/customer-chat/route.ts`
- Modify: `components/orders/customer-order.tsx`

- [ ] Add route that validates `tableId` and message length.
- [ ] Build menu and top-product context from available products and paid orders.
- [ ] Add a compact chat drawer with sample questions on the customer order page.
- [ ] Return helpful Vietnamese responses and graceful fallback errors.

### Task 5: Verification

**Files:**
- Existing test and app files.

- [ ] Run focused tests: `npx tsx lib/order-item-options.test.ts`, `npx tsx lib/shift-revenue.test.ts`, `npx tsx lib/ai-insights.test.ts`, `npx tsx lib/dashboard-summary.test.ts`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
