type GeminiGenerateContentOptions = {
  prompt: string;
  responseJsonSchema?: Record<string, unknown>;
  systemInstruction?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return apiKey;
}

export async function generateGeminiContent({
  prompt,
  responseJsonSchema,
  systemInstruction,
}: GeminiGenerateContentOptions) {
  const model = getGeminiModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      body: JSON.stringify({
        ...(systemInstruction
          ? {
              system_instruction: {
                parts: [{ text: systemInstruction }],
              },
            }
          : {}),
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        ...(responseJsonSchema
          ? {
              generationConfig: {
                responseFormat: {
                  text: {
                    mimeType: "application/json",
                    schema: responseJsonSchema,
                  },
                },
              },
            }
          : {}),
      }),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": getGeminiApiKey(),
      },
      method: "POST",
    },
  );
  const result = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (!response.ok) {
    throw new Error(
      result?.error?.message ?? "Gemini API did not accept the request.",
    );
  }

  const text = result?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini API returned an empty response.");
  }

  return text;
}
