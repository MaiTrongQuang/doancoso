import { strict as assert } from "node:assert";
import { toCustomerMenuCategories } from "./customer-menu-catalog";

const categories = toCustomerMenuCategories([
  {
    id: 1,
    name: "Coffee",
    products: [
      {
        id: 7,
        name: "Black coffee",
        description: null,
        price: 20_000,
        imageUrl: null,
        categoryId: 1,
      },
    ],
  },
  {
    id: 2,
    name: "Empty",
    products: [],
  },
]);

assert.deepEqual(categories, [
  {
    id: 1,
    name: "Coffee",
    products: [
      {
        id: 7,
        name: "Black coffee",
        description: null,
        price: 20_000,
        imageUrl: null,
        categoryId: 1,
      },
    ],
  },
]);
