# SePay Payment Confirmation Speed Design

## Goal

Make QR bank-transfer confirmation feel immediate for the cashier after a customer has transferred, while keeping API load bounded and preserving payment correctness.

## Current Behavior

The cashier screen starts polling `/api/payments/order/:orderId` after a pending SePay QR payment is created. It polls immediately, then every 3 seconds while the payment remains pending. The SePay webhook currently returns `200` first and schedules the database mutation with `after(...)`, so payment state may not be written before the cashier's next status check.

## Decision

Process the SePay webhook synchronously inside the webhook request. The endpoint should update the payment, orders, dining session, table, and invoice before returning success. This makes the database observable as soon as SePay receives a successful response from our app, and webhook failures remain visible to SePay for retry.

On the cashier screen, replace the fixed 3-second `setInterval` with adaptive polling. The first status check still runs immediately. For the first 15 seconds after the QR is shown, the screen polls every 1 second. After that warm window, polling backs off to every 3 seconds. The loop keeps the existing protections: skip when the tab is hidden, avoid overlapping requests, stop after success, and check immediately when the tab becomes visible again.

## Components

- `lib/payment-polling.ts`: Pure helper for choosing the next polling delay from elapsed time.
- `lib/payment-polling.test.ts`: Regression test for the fast-first polling schedule.
- `app/api/payments/sepay/webhook/route.ts`: Move payment confirmation out of `after(...)` and into the request path.
- `components/invoices/cashier-order-payment.tsx`: Use the adaptive polling helper instead of a fixed interval.

## Error Handling

The webhook should keep idempotent behavior for duplicate or already-settled notifications. Invalid or irrelevant webhook payloads should still return success after being accepted, matching the existing behavior for non-actionable notifications. Unexpected processing errors should return `500` so the payment provider can retry.

The cashier screen should keep showing the existing error message if the status endpoint fails. Polling should continue after transient failures while the QR payment is still pending.

## Testing

Add a focused helper test for the polling schedule. Verify the changed files with `npx tsx lib/payment-polling.test.ts`, `npx tsc --noEmit`, and `npm run lint`.
