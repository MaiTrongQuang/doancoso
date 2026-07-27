import { strict as assert } from "node:assert";
import {
  canAccessPath,
  canManageTables,
  canViewTables,
} from "./auth";

assert.equal(canViewTables("ADMIN"), true);
assert.equal(canViewTables("STAFF"), true);
assert.equal(canViewTables("BARISTA"), true);
assert.equal(canViewTables("SERVER"), true);
assert.equal(canViewTables("CASHIER"), true);

assert.equal(canManageTables("ADMIN"), true);
assert.equal(canManageTables("STAFF"), false);
assert.equal(canManageTables("CASHIER"), false);

assert.equal(canAccessPath("STAFF", "/staff/tables"), true);
assert.equal(canAccessPath("CASHIER", "/cashier/tables"), true);
assert.equal(canAccessPath("STAFF", "/admin/tables"), false);
assert.equal(canAccessPath("CASHIER", "/admin/tables"), false);
