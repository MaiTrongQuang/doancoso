type GeminiGenerateContentOptions = {
  maxOutputTokens?: number;
  model?: string;
  prompt: string;
  responseJsonSchema?: Record<string, unknown>;
  systemInstruction?: string;
  temperature?: number;
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
    status?: string;
  };
};

class GeminiApiError extends Error {
  apiStatus?: string;
  status: number;

  constructor({
    apiStatus,
    message,
    status,
  }: {
    apiStatus?: string;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "GeminiApiError";
    this.apiStatus = apiStatus;
    this.status = status;
  }
}

function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";
}

function getGeminiFallbackModels() {
  const configuredFallbacks = process.env.GEMINI_FALLBACK_MODELS?.split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return configuredFallbacks?.length
    ? configuredFallbacks
    : ["gemini-3.1-flash-lite", "gemini-2.5-flash"];
}

function getGeminiApiKey() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return apiKey;
}

function getGeminiModelCandidates(primaryModel: string) {
  return Array.from(
    new Set([primaryModel, ...getGeminiFallbackModels()].filter(Boolean)),
  );
}

function isRetryableGeminiError(error: unknown) {
  if (!(error instanceof GeminiApiError)) {
    return false;
  }

  return (
    error.status === 429 ||
    error.status === 500 ||
    error.status === 502 ||
    error.status === 503 ||
    error.status === 504 ||
    error.apiStatus === "UNAVAILABLE" ||
    error.apiStatus === "RESOURCE_EXHAUSTED"
  );
}

export function buildGeminiGenerateContentBody({
  maxOutputTokens,
  prompt,
  responseJsonSchema,
  systemInstruction,
  temperature,
}: GeminiGenerateContentOptions) {
  const generationConfig = {
    ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
    ...(responseJsonSchema
      ? {
          responseMimeType: "application/json",
          responseJsonSchema,
        }
      : {}),
    ...(typeof temperature === "number" ? { temperature } : {}),
  };

  return {
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
    ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
  };
}

async function requestGeminiContent({
  maxOutputTokens,
  model,
  prompt,
  responseJsonSchema,
  systemInstruction,
  temperature,
}: GeminiGenerateContentOptions & { model: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      body: JSON.stringify(
        buildGeminiGenerateContentBody({
          maxOutputTokens,
          prompt,
          responseJsonSchema,
          systemInstruction,
          temperature,
        }),
      ),
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": getGeminiApiKey(),
      },
      method: "POST",
    },
  );
  const result = (await response.json().catch(() => null)) as GeminiResponse | null;

  if (!response.ok) {
    throw new GeminiApiError({
      apiStatus: result?.error?.status,
      message: result?.error?.message ?? "Gemini API did not accept the request.",
      status: response.status,
    });
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

export async function generateGeminiContent({
  maxOutputTokens,
  model: modelOverride,
  prompt,
  responseJsonSchema,
  systemInstruction,
  temperature,
}: GeminiGenerateContentOptions) {
  const primaryModel = modelOverride?.trim() || getGeminiModel();
  const models = getGeminiModelCandidates(primaryModel);
  let lastRetryableError: unknown = null;

  for (const [index, model] of models.entries()) {
    try {
      return await requestGeminiContent({
        maxOutputTokens,
        model,
        prompt,
        responseJsonSchema,
        systemInstruction,
        temperature,
      });
    } catch (error) {
      if (!isRetryableGeminiError(error) || index === models.length - 1) {
        throw error;
      }

      lastRetryableError = error;
    }
  }

  throw lastRetryableError ?? new Error("Gemini API did not return a response.");
}
