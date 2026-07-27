# QR Session Lifecycle Design

## Problem

Opening a customer QR page currently creates an open dining session and marks the table as occupied. A page refresh, link preview, crawler, or QR health check can therefore occupy a table even when no order has been placed.

## Approved behavior

- Opening a valid table QR is read-only. It validates the token and displays the menu without creating a dining session or changing table status.
- The first successful customer order creates an open dining session inside the same database transaction as the order, unless the table already has an open session.
- Later customers joining the same table reuse the current open session.
- A stale non-null session id is rejected when it no longer matches the table's current open session.
- Reserved tables still reject QR orders.
- Existing order lifecycle cleanup remains responsible for closing sessions and releasing tables after all active orders are settled or cancelled.
- Empty test sessions are removed from the current database. Sessions containing real orders are preserved.

## Data flow

1. `GET /order/table/[token]` validates the QR token and reads the table plus its current open session, without writes.
2. The customer submits an order through `POST /api/orders`.
3. The transaction locks the table row, revalidates the QR token and table status, then resolves the requested session:
   - reuse the current open session;
   - create one if no open session exists and the request has no stale session id;
   - reject a stale session id.
4. The transaction creates the order, writes its initial status history, transitions it to `CONFIRMED`, and marks the table `OCCUPIED`.

## Testing

- The session-resolution decision is covered for first order, same-session join, no-session join, and stale-session rejection.
- Existing order lifecycle, QR validation, and payment tests remain green.
- Production data cleanup only closes open sessions with zero orders for tables 2–5; the real session on table 1 is untouched.
