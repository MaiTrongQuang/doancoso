import { strict as assert } from "node:assert";
import { buildGeminiGenerateContentBody } from "./gemini";

const schema = {
  type: "object",
  properties: {
    summary: { type: "string" },
  },
  required: ["summary"],
};

assert.deepEqual(
  buildGeminiGenerateContentBody({
    prompt: "Return JSON.",
    responseJsonSchema: schema,
    systemInstruction: "Return only JSON.",
  }),
  {
    system_instruction: {
      parts: [{ text: "Return only JSON." }],
    },
    contents: [
      {
        parts: [{ text: "Return JSON." }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: schema,
    },
  },
);

assert.deepEqual(
  buildGeminiGenerateContentBody({
    prompt: "Hello",
  }),
  {
    contents: [
      {
        parts: [{ text: "Hello" }],
      },
    ],
  },
);
