# Customer Menu Cart Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sticky scroll-aware category menu and a bottom cart sheet for the customer QR order page.

**Architecture:** Keep the existing `CustomerOrder` component as the screen owner, add one small pure helper module for category neighbor logic, and use React refs/effects for scroll tracking and sheet state. The order API contract stays unchanged.

**Tech Stack:** Next.js 16 App Router, React 19 client component, TypeScript, Tailwind CSS utilities, `tsx` for the helper regression test.

---

### Task 1: Category Context Helper

**Files:**
- Create: `components/orders/customer-order-navigation.test.ts`
- Create: `components/orders/customer-order-navigation.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import { getCategoryContextIds } from "./customer-order-navigation";

const ids = ["ALL", "coffee", "tea", "juice", "cake"];

assert.deepEqual(getCategoryContextIds(ids, "tea"), ["coffee", "tea", "juice"]);
assert.deepEqual(getCategoryContextIds(ids, "ALL"), ["ALL", "coffee"]);
assert.deepEqual(getCategoryContextIds(ids, "cake"), ["juice", "cake"]);
assert.deepEqual(getCategoryContextIds(ids, "missing"), ["ALL", "coffee"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx components/orders/customer-order-navigation.test.ts`
Expected: FAIL because `./customer-order-navigation` does not exist.

- [ ] **Step 3: Write minimal implementation**

```ts
export function getCategoryContextIds(
  ids: string[],
  activeId: string,
  radius = 1,
) {
  if (ids.length === 0) {
    return [];
  }

  const activeIndex = Math.max(0, ids.indexOf(activeId));
  const start = Math.max(0, activeIndex - radius);
  const end = Math.min(ids.length, activeIndex + radius + 1);

  return ids.slice(start, end);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx components/orders/customer-order-navigation.test.ts`
Expected: PASS with exit code 0.

### Task 2: Sticky Scroll-Aware Category Menu

**Files:**
- Modify: `components/orders/customer-order.tsx`

- [ ] **Step 1: Add refs and effects**

Use `useEffect` and `useRef` to observe section headings, update `selectedCategory` when the customer scrolls, and call `scrollIntoView({ inline: "center", block: "nearest" })` on the active category button.

- [ ] **Step 2: Render improved category chips**

Keep all categories in one horizontal sticky rail, add edge fade hints and a small contextual label from `getCategoryContextIds` so the active chip is visually supported by one neighbor before and after.

- [ ] **Step 3: Verify manually**

Run the local app and scroll through `/order/table/1`. Expected: sticky category menu remains visible and active chip follows the visible section.

### Task 3: Bottom Cart Sheet

**Files:**
- Modify: `components/orders/customer-order.tsx`

- [ ] **Step 1: Add sheet state and close behavior**

Add `isCartOpen`, open it from the bottom bar, close it from overlay/close button/Escape, and keep submit validation opening the sheet when the cart is empty.

- [ ] **Step 2: Move final submit action into the sheet**

The fixed bottom bar becomes `Giỏ hàng` with subtotal and item count. The sheet contains the existing cart panel content and the final `Gửi đơn` button.

- [ ] **Step 3: Verify manually**

Expected: bottom bar opens the sheet, notes can be edited without page scrolling, and successful submit closes/clears the cart state.

### Task 4: Verification

**Files:**
- Run only.

- [ ] **Step 1: Run helper test**

Run: `npx tsx components/orders/customer-order-navigation.test.ts`
Expected: exit code 0.

- [ ] **Step 2: Run project checks**

Run: `npm run typecheck`
Expected: exit code 0.

Run: `npm run lint`
Expected: exit code 0.

Run: `npm run build`
Expected: exit code 0.

- [ ] **Step 3: Browser check**

Open `http://localhost:3000/order/table/1` in the in-app browser, check mobile-width layout, sticky category tracking, bottom sheet open/close, and cart note controls.
