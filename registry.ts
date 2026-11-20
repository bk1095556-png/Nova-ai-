import { GeminiProvider } from "./gemini-provider";
import { getModelOption } from "./models";
import { AIProvider } from "./provider";

export function resolveProvider(modelId: string): {
  provider: AIProvider;
  modelId: string;
} {
  const model = getModelOption(modelId);

  switch (model.provider) {
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is missing on the server. Add it to .env.local and restart the server."
        );
      }
      return {
        provider: new GeminiProvider(apiKey),
        modelId: model.id,
      };
    }
    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}
