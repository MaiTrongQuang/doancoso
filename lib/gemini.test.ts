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
    maxOutputTokens: 180,
    prompt: "Return JSON.",
    responseJsonSchema: schema,
    systemInstruction: "Return only JSON.",
    temperature: 0.4,
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
      maxOutputTokens: 180,
      responseMimeType: "application/json",
      responseJsonSchema: schema,
      temperature: 0.4,
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
