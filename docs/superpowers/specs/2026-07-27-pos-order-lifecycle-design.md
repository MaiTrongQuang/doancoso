# POS Order Lifecycle and QR Safety Design

## Objective

Align the POS implementation with the lecturer's business flow while preserving the existing customer QR menu, cashier, kitchen, invoice, and SePay integrations.

## Canonical order flow

`DRAFT -> SUBMITTED -> PREPARING -> READY -> SERVED -> AWAITING_PAYMENT -> COMPLETED`

`CANCELLED` is a terminal state reachable before completion according to role and business rules.

Legacy names may remain in the database migration for compatibility, but the application must expose one consistent vocabulary and must not use `SERVED` as a shortcut for payment completion.

## Permissions

- Customer: create a submitted order, provide item options and notes; cannot change workflow state.
- Cashier: accept/reject submitted orders, collect cash/bank/QR payment, create the invoice, and complete a served order.
- Barista: move an accepted order to preparing and ready; cannot complete payment or edit an order after preparation starts.
- Server: move a ready order to served; cannot change payment or price data.
- Admin: operational override, cancellation, and role management; every override requires an audit record and reason.
- System/payment webhook: record payment transactions idempotently and move an awaiting-payment order to completed only after a valid transaction.

The current `STAFF` role will remain compatible during migration, but the server-side authorization matrix will distinguish barista and server capabilities. Existing deployments without the new role values will continue to work with `STAFF` as the combined operational role.

## State history and integrity

Add an order status history table recording order, previous status, next status, actor, reason, and timestamp. Every transition and cancellation must write the history row in the same database transaction as the order update.

Use a conditional update or row lock so two stale requests cannot both transition the same order. Enforce positive quantities, non-negative prices, one open dining session per table, one invoice per order, and one provider transaction per payment event.

## QR and dining sessions

QR links will resolve through a random table token rather than trusting a client-supplied table id. The server will resolve the token to the table and active dining session. A closed session invalidates its token; a new session requires the table to be reopened by staff/admin. The current static table-id QR behavior will be migrated and explicitly rejected once a secure token exists.

Multiple guests at one table create separate orders under one active dining session. They are grouped only when the session is billed. A retry with the same idempotency key must return the original order rather than create a duplicate.

## Payment idempotency

Store provider transaction events separately from the current payment status. Repeated callbacks for the same provider event are no-ops. A second successful payment for a completed order is rejected and retained for reconciliation rather than creating another invoice.

## Product options

The current scope supports sugar level, ice level, and free-form notes. Toppings, sizes, and paid add-ons are not implemented in this change; the report must state that limitation. The order item keeps a price snapshot so later product price changes do not alter historical orders.

## Testing

Add regression coverage for concurrent same-table orders, stale unavailable products, cancellation after kitchen receipt, duplicate callbacks, network retry idempotency, double payment, table transfer/merge invariants, QR tampering/closed sessions, and role boundaries.

