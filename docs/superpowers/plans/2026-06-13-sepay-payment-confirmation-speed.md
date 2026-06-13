# SePay Payment Confirmation Speed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Confirm SePay QR bank-transfer payments faster on the cashier screen without creating sustained API load.

**Architecture:** Make webhook confirmation part of the request path so successful provider delivery means the database is already updated. Move polling delay calculation into a pure helper and let the cashier client poll quickly for the first 15 seconds, then back off.

**Tech Stack:** Next.js 16 App Router route handlers, React 19 client component, TypeScript, Prisma, `tsx` assertion tests.

---

### Task 1: Adaptive Polling Helper

**Files:**
- Create: `lib/payment-polling.ts`
- Create: `lib/payment-polling.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { getPaymentPollingDelay } from "./payment-polling";

assert.equal(getPaymentPollingDelay(0), 1000);
assert.equal(getPaymentPollingDelay(14_999), 1000);
assert.equal(getPaymentPollingDelay(15_000), 3000);
assert.equal(getPaymentPollingDelay(90_000), 3000);
assert.equal(getPaymentPollingDelay(-25), 1000);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx lib/payment-polling.test.ts`

Expected: FAIL because `lib/payment-polling.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
const FAST_POLLING_WINDOW_MS = 15_000;
const FAST_POLLING_DELAY_MS = 1_000;
const BACKOFF_POLLING_DELAY_MS = 3_000;

export function getPaymentPollingDelay(elapsedMs: number) {
  return elapsedMs < FAST_POLLING_WINDOW_MS
    ? FAST_POLLING_DELAY_MS
    : BACKOFF_POLLING_DELAY_MS;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx lib/payment-polling.test.ts`

Expected: PASS with exit code 0.

### Task 2: Synchronous Webhook Confirmation

**Files:**
- Modify: `app/api/payments/sepay/webhook/route.ts`

- [ ] **Step 1: Remove background processing from the route handler**

Change the webhook handler so it awaits `processSepayWebhook(body)` before returning `NextResponse.json(...)`.

```ts
export async function POST(request: Request) {
  const authorization = getAuthorizedApiKey(request);

  if (!authorization.ok) {
    return authorization.response;
  }

  const body = await request.json().catch(() => null);
  const payload = getPayloadRecord(body);

  if (!payload) {
    return NextResponse.json(
      { message: "Payload SePay không hợp lệ." },
      { status: 400 },
    );
  }

  try {
    const processingResponse = await processSepayWebhook(body);

    if (processingResponse) {
      return processingResponse;
    }

    return NextResponse.json({
      message: "Đã nhận webhook SePay.",
      data: {
        accepted: true,
      },
    });
  } catch (error) {
    console.error("Không thể xử lý webhook SePay.", error);

    return NextResponse.json(
      { message: "Không thể xử lý webhook SePay." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Remove unused import**

Remove `after` from the `next/server` import because payment confirmation is no longer scheduled after the response.

### Task 3: Cashier Adaptive Polling Loop

**Files:**
- Modify: `components/invoices/cashier-order-payment.tsx`

- [ ] **Step 1: Import the helper**

```ts
import { getPaymentPollingDelay } from "@/lib/payment-polling";
```

- [ ] **Step 2: Replace fixed interval with timeout scheduling**

Inside the `useEffect` that watches `pollingOrderId`, replace the fixed `window.setInterval(pollPaymentStatus, 3000)` with a timeout loop that records `pollingStartedAt = Date.now()`, calls `pollPaymentStatus()` immediately, and schedules the next tick with `getPaymentPollingDelay(Date.now() - pollingStartedAt)`.

The cleanup must clear the pending timeout and remove the visibility listener.

- [ ] **Step 3: Preserve existing success behavior**

Keep the current success branch unchanged: clear the QR payment, clear selected order, remove settled bill orders, and scroll to the success notice.

### Task 4: Verification

**Files:**
- Verify changed files only with focused commands.

- [ ] **Step 1: Run polling helper test**

Run: `npx tsx lib/payment-polling.test.ts`

Expected: PASS with exit code 0.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS with exit code 0.

- [ ] **Step 3: Run lint**

Run: `npm run lint`

Expected: PASS with exit code 0.
