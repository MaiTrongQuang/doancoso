import assert from "node:assert/strict";
import { getHomeAccessModel } from "./home-access";

const guestModel = getHomeAccessModel(null);

assert.deepEqual(
  guestModel.internalGroups.map((group) => group.title),
  [],
);
assert.deepEqual(
  guestModel.customerRoutes.map((route) => route.href),
  ["/order/table/1"],
);
assert.equal(guestModel.loginHref, "/login");

const staffModel = getHomeAccessModel("STAFF");

assert.deepEqual(
  staffModel.internalGroups.map((group) => group.title),
  ["Nhân viên"],
);
assert.deepEqual(
  staffModel.internalGroups[0]?.routes.map((route) => route.href),
  ["/staff/orders"],
);
assert.deepEqual(
  staffModel.customerRoutes.map((route) => route.href),
  ["/order/table/1"],
);

const adminModel = getHomeAccessModel("ADMIN");

assert.deepEqual(
  adminModel.internalGroups.map((group) => group.title),
  ["Quản trị", "Nhân viên", "Quầy vận hành"],
);
