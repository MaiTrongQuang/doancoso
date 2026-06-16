# Order Options, Shift Revenue, Gemini AI Design

## Goal

Add customer drink options, monthly revenue by fixed four-hour shifts, and Gemini-powered AI assistance for admin and customers.

## Scope

- Do not change table/session/bill splitting behavior.
- Drink options support only `0%`, `25%`, `50%`, `75%`, and `100%`.
- Shift revenue is grouped by paid invoices, not by attendance or individual employees.
- Gemini API calls run only on the server. The API key is read from `GEMINI_API_KEY`.

## Order Options

The customer cart shows sugar and ice chips for drink-like products. Products in cake categories do not show these controls. The selected values are formatted into the existing `OrderItem.note` value, together with the customer free-text note. This avoids a database migration while still making options visible in staff, cashier, and invoice flows that already render item notes.

Default drink option values are `100%` sugar and `100%` ice. The supported values are `0%`, `25%`, `50%`, `75%`, and `100%`.

## Shift Revenue

The dashboard summary accepts a `month=YYYY-MM` parameter and returns `shiftRevenue` for the selected month. Revenue is grouped by invoice `paidAt` using Vietnam local time. Fixed shifts are:

- `06:00-10:00`
- `10:00-14:00`
- `14:00-18:00`
- `18:00-22:00`
- `22:00-02:00`
- `02:00-06:00`

Each shift row includes revenue, invoice count, average invoice value, and the best local day in that shift.

## Gemini AI

Admin AI insight is available from the dashboard. It sends summarized dashboard data to Gemini and asks for structured JSON: summary, best shifts, risks, recommendations, and promotion ideas.

Customer AI chat is available on the QR order page. It sends only menu/catalog context, top paid products, and the customer's question. It provides sample questions and Vietnamese answers that recommend menu items without exposing secrets or internal admin data.

## Validation

Unit tests cover option formatting, shift grouping, and AI prompt/JSON helpers. Existing dashboard and order tests continue to run.
