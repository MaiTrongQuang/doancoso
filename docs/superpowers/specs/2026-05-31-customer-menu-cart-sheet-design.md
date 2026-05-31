# Customer Menu Cart Sheet Design

## Goal

Improve the QR order screen so first-time customers understand there are more menu categories, keep category navigation visible while browsing, and edit notes from a bottom cart sheet instead of scrolling to the page bottom.

## Design

The category bar remains sticky below the cafe header. It keeps all categories available as horizontal chips, adds visual overflow hints, and uses scroll tracking so the active chip follows the menu section currently near the top of the viewport. When the active section changes, the chip row scrolls the active category into view so the previous and next category remain visible when possible.

The bottom action becomes a cart entry point, not direct submission. It shows the item count and subtotal, opens a bottom sheet, and the sheet contains quantity controls, per-item notes, order notes, total, and the final submit action. Empty cart state remains reachable and explains that customers should add items first.

## Accessibility And Interaction

Buttons keep at least 44px touch targets. The bottom sheet uses a dialog role, an overlay close target, a visible close button, and Escape-to-close behavior. Sticky UI reserves bottom padding so products are not hidden behind the cart bar.

## Testing

Add a small TypeScript helper test for category context selection. Verify with typecheck, lint, build, and a browser pass at the order page to check sticky category navigation, auto-active state, and bottom sheet behavior.
