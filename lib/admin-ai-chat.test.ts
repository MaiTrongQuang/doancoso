import { strict as assert } from "node:assert";
import {
  adminAiQuickQuestions,
  buildAdminAiRequestKey,
  defaultAdminAiQuestion,
  normalizeAdminAiQuestion,
} from "./admin-ai-chat";

assert.equal(defaultAdminAiQuestion, "Hôm nay nên làm gì để tăng doanh thu?");

assert.deepEqual(adminAiQuickQuestions, [
  "Nên đẩy món nào hôm nay?",
  "Doanh thu đang yếu ở đâu?",
  "Có đơn nào cần xử lý?",
  "Ca nào nên bố trí thêm người?",
]);

assert.ok(
  adminAiQuickQuestions.every(
    (question) => question.length >= 20 && question.length <= 36,
  ),
);

assert.equal(
  normalizeAdminAiQuestion("  Có đơn nào cần xử lý??? "),
  normalizeAdminAiQuestion("co don nao can xu ly"),
);

const firstRequestKey = buildAdminAiRequestKey({
  periodDays: 7,
  question: "Có đơn nào cần xử lý?",
  selectedDate: "2026-07-01",
  selectedMonth: "2026-07",
});
const repeatedRequestKey = buildAdminAiRequestKey({
  periodDays: 7,
  question: "co don nao can xu ly",
  selectedDate: "2026-07-01",
  selectedMonth: "2026-07",
});
const anotherDateRequestKey = buildAdminAiRequestKey({
  periodDays: 7,
  question: "Có đơn nào cần xử lý?",
  selectedDate: "2026-07-02",
  selectedMonth: "2026-07",
});

assert.equal(firstRequestKey, repeatedRequestKey);
assert.notEqual(firstRequestKey, anotherDateRequestKey);
assert.doesNotMatch(firstRequestKey, /fast|deep/);
