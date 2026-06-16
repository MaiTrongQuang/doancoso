import { strict as assert } from "node:assert";
import {
  drinkOptionLevels,
  formatOrderItemNoteWithOptions,
  isCustomizableDrink,
  normalizeDrinkOptionLevel,
} from "./order-item-options";

assert.deepEqual(drinkOptionLevels, [0, 25, 50, 75, 100]);

assert.equal(normalizeDrinkOptionLevel(0), 0);
assert.equal(normalizeDrinkOptionLevel("50"), 50);
assert.equal(normalizeDrinkOptionLevel(100), 100);
assert.equal(normalizeDrinkOptionLevel(125), null);
assert.equal(normalizeDrinkOptionLevel("bad"), null);

assert.equal(isCustomizableDrink("Trà & trà sữa", "Trà sữa truyền thống"), true);
assert.equal(isCustomizableDrink("Sinh tố & nước ép", "Nước ép cam"), true);
assert.equal(isCustomizableDrink("Bánh ngọt", "Bánh flan caramel"), false);
assert.equal(isCustomizableDrink("Món đặc biệt", "Set trà bánh mùa thu"), true);

assert.equal(
  formatOrderItemNoteWithOptions({
    iceLevel: 25,
    note: "ít sữa",
    sugarLevel: 50,
  }),
  "Đường 50% · Đá 25% · ít sữa",
);

assert.equal(
  formatOrderItemNoteWithOptions({
    iceLevel: null,
    note: "mang ra sau",
    sugarLevel: null,
  }),
  "mang ra sau",
);

assert.equal(
  formatOrderItemNoteWithOptions({
    iceLevel: 100,
    note: "",
    sugarLevel: 0,
  }),
  "Đường 0% · Đá 100%",
);
