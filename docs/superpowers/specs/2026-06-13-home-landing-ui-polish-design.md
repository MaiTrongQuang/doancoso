# Home Landing UI Polish Design

## Goal

Improve the public home page so the first viewport shows the product experience cleanly without the top of the layout feeling clipped by browser chrome, and make the account work-area section look more balanced.

## Decisions

- Keep the current warm cafe POS visual language, routes, role logic, and copy.
- Reduce the home hero's vertical pressure by replacing the full `min-h-dvh` section with a viewport-aware layout that uses tighter top padding and a compact hero grid.
- Keep both primary entry actions visible in the hero, but make them occupy a smaller navigation row so they do not push content down.
- Present the work-area cards as a single aligned grid instead of one large customer card beside a separate internal card container.
- For logged-in users, show customer, admin, staff, and cashier cards as same-level cards where permitted by the access model.
- For logged-out users, keep the customer card and show a compact internal login card explaining that internal areas require authentication.

## Visual Requirements

- Cards should share a consistent height rhythm and CTA baseline.
- Button labels must stay on one line on desktop.
- The access section should start visibly within the first viewport on common laptop browser heights.
- Mobile layout should remain single-column and readable.

## Verification

Verify with lint, typecheck, build, and browser screenshots at desktop and mobile widths.
