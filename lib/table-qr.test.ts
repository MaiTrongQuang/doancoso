import { strict as assert } from "node:assert";
import {
  createTableQrToken,
  hashTableQrToken,
  isValidTableQrToken,
} from "./table-qr";

const token = createTableQrToken();

assert.equal(isValidTableQrToken(token), true);
assert.equal(hashTableQrToken(token), hashTableQrToken(token));
assert.equal(isValidTableQrToken("table-1"), false);
assert.equal(isValidTableQrToken(`${token}x`), false);
