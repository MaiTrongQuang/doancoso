# Home Landing UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the home page layout so the first viewport is not visually clipped and work-area cards align cleanly.

**Architecture:** Keep the page as a server component in `app/page.tsx`, using existing Tailwind v4 utilities and access-model data. Refactor only the home page markup/classes; no route or auth behavior changes.

**Tech Stack:** Next.js 16 App Router, React Server Components, Tailwind CSS v4 utilities.

---

### Task 1: Hero Viewport Fit

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Reduce outer section height pressure**

Change the top-level page section from a full `min-h-dvh` grid with large vertical padding to a compact `min-h-[100svh]` layout with responsive padding.

- [ ] **Step 2: Compact the navigation row**

Keep the internal and customer links, but reduce their height/padding and allow wrapping only on small screens.

- [ ] **Step 3: Tighten hero copy and preview card**

Reduce hero gaps, use balanced text wrapping, and set the preview card to a stable aspect/height that fits common laptop viewports.

### Task 2: Work-Area Card Grid

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Flatten the work-area layout**

Replace the two-column customer/internal container with a single card grid.

- [ ] **Step 2: Add shared card structure**

Use the same card structure for Customer and internal role groups: icon, eyebrow, title, description, CTA, and optional route links.

- [ ] **Step 3: Preserve logged-out state**

When no session exists, render Customer and one compact internal login card instead of exposing internal group actions.

### Task 3: Verification

**Files:**
- Verify changed files.

- [ ] **Step 1: Run typecheck**

Run: `npx tsc --noEmit`

- [ ] **Step 2: Run lint**

Run: `npm run lint`

- [ ] **Step 3: Run build**

Run: `npm run build`

- [ ] **Step 4: Browser visual check**

Open the local home page and capture desktop/mobile screenshots to confirm the top layout is not clipped and the work-area cards align.
