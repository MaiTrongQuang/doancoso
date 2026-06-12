import { strict as assert } from "node:assert";
import {
  buildProductImageFilename,
  getProductImageExtension,
  isAllowedProductImageType,
} from "./product-image-upload";

assert.equal(isAllowedProductImageType("image/png"), true);
assert.equal(isAllowedProductImageType("image/jpeg"), true);
assert.equal(isAllowedProductImageType("application/pdf"), false);

assert.equal(getProductImageExtension("image/webp"), ".webp");
assert.equal(getProductImageExtension("image/svg+xml"), null);

assert.equal(
  buildProductImageFilename({
    originalName: "Cà phê sữa đá.PNG",
    contentType: "image/png",
    token: "upload-01",
  }),
  "ca-phe-sua-da-upload-01.png",
);

assert.equal(
  buildProductImageFilename({
    originalName: "../",
    contentType: "image/gif",
    token: "upload-02",
  }),
  "san-pham-upload-02.gif",
);
