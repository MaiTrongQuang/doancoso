import { strict as assert } from "node:assert";
import {
  buildGeminiGenerateContentBody,
  generateGeminiContent,
} from "./gemini";

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

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GEMINI_API_KEY;
const originalFallbackModels = process.env.GEMINI_FALLBACK_MODELS;

process.env.GEMINI_API_KEY = "test-key";
process.env.GEMINI_FALLBACK_MODELS = "gemini-3.1-flash-lite, gemini-2.5-flash";

const requestedUrls: string[] = [];
globalThis.fetch = async (input) => {
  const url = String(input);
  requestedUrls.push(url);

  if (url.includes("/gemini-3.5-flash:generateContent")) {
    return new Response(
      JSON.stringify({
        error: {
          message:
            "This model is currently experiencing high demand. Please try again later.",
          status: "UNAVAILABLE",
        },
      }),
      { status: 503 },
    );
  }

  return new Response(
    JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: "Fallback model answered." }],
          },
        },
      ],
    }),
    { status: 200 },
  );
};

async function assertFallsBackWhenPrimaryModelIsUnavailable() {
  try {
    const fallbackText = await generateGeminiContent({
      model: "gemini-3.5-flash",
      prompt: "Hello",
    });

    assert.equal(fallbackText, "Fallback model answered.");
    assert.deepEqual(
      requestedUrls.map((url) => url.match(/models\/([^:]+)/)?.[1]),
      ["gemini-3.5-flash", "gemini-3.1-flash-lite"],
    );
  } finally {
    globalThis.fetch = originalFetch;
    process.env.GEMINI_API_KEY = originalApiKey;
    process.env.GEMINI_FALLBACK_MODELS = originalFallbackModels;
  }
}

void assertFallsBackWhenPrimaryModelIsUnavailable();
