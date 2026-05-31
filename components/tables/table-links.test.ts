import { strict as assert } from "node:assert";
import {
  buildOrderLink,
  buildOrderPath,
  resolveAppBaseUrl,
} from "./table-links";

assert.equal(
  resolveAppBaseUrl("https://nanacafe.site", "http://localhost:3000"),
  "https://nanacafe.site",
);

assert.equal(
  resolveAppBaseUrl("http://localhost:3000", "https://nanacafe.site"),
  "https://nanacafe.site",
);

assert.equal(
  buildOrderPath({
    id: 1,
    qrCodeUrl: null,
  }),
  "/order/table/1",
);

assert.equal(
  buildOrderPath({
    id: 2,
    qrCodeUrl: "http://localhost:3000/order/table/2",
  }),
  "/order/table/2",
);

assert.equal(
  buildOrderLink("https://nanacafe.site", {
    id: 3,
    qrCodeUrl: "/order/table/3",
  }),
  "https://nanacafe.site/order/table/3",
);
