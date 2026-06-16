import { strict as assert } from "node:assert";
import { appendCustomerAiMessage } from "./customer-ai-messages";

const existingMessages = [
  {
    id: 1,
    role: "assistant" as const,
    content: "Xin chào",
  },
  {
    id: 4,
    role: "user" as const,
    content: "Gợi ý món cà phê",
  },
];

const withAssistant = appendCustomerAiMessage(existingMessages, {
  role: "assistant",
  content: "Bạn có thể thử cà phê sữa.",
});
const withUser = appendCustomerAiMessage(withAssistant, {
  role: "user",
  content: "Thêm món khác",
});

assert.deepEqual(
  withUser.map((message) => message.id),
  [1, 4, 5, 6],
);
assert.equal(new Set(withUser.map((message) => message.id)).size, withUser.length);
