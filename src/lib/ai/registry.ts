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
      return {
        provider: new GeminiProvider(),
        modelId: model.id,
      };
    }
    default:
      throw new Error(`Unsupported provider: ${model.provider}`);
  }
}
