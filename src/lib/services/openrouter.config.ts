/**
 * OpenRouter API Configuration Module
 * Handles validation and initialization of OpenRouter service configuration
 */

/**
 * Configuration for OpenRouter service
 */
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  allowedModels: string[];
}

/**
 * Default configuration values
 */
const DEFAULTS = {
  BASE_URL: "https://openrouter.ai/api/v1",
  TIMEOUT_MS: 60000,
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  TOP_P: 1.0,
  FREQUENCY_PENALTY: 0.0,
} as const;

/**
 * List of allowed models for flashcard generation
 */
const ALLOWED_MODELS = ["openai/gpt-4o-mini"] as const;

/**
 * Custom error for configuration validation failures
 */
export class OpenRouterConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterConfigError";
  }
}

/**
 * Validate model is in the allowed list
 */
const validateModel = (model: string, allowedModels: string[]): void => {
  if (!allowedModels.includes(model)) {
    throw new OpenRouterConfigError(`Model "${model}" is not allowed. Allowed models: ${allowedModels.join(", ")}`);
  }
};

/**
 * Build and validate OpenRouter configuration
 * Reads API key and optional model from environment, uses hardcoded defaults for other params
 * @throws {OpenRouterConfigError} If configuration is invalid or incomplete
 */
export const buildOpenRouterConfig = (): OpenRouterConfig => {
  // Required: API Key
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
    throw new OpenRouterConfigError("OPENROUTER_API_KEY is required and must be a non-empty string");
  }

  // Optional: Default Model (with default)
  const defaultModel = import.meta.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-4o-mini";
  if (typeof defaultModel !== "string" || defaultModel.trim().length === 0) {
    throw new OpenRouterConfigError("OPENROUTER_DEFAULT_MODEL must be a non-empty string");
  }

  // Validate default model is in allowed list
  const allowedModels = [...ALLOWED_MODELS];
  validateModel(defaultModel, allowedModels);

  // Use hardcoded defaults for all other parameters
  return {
    apiKey: apiKey.trim(),
    baseUrl: DEFAULTS.BASE_URL,
    defaultModel: defaultModel.trim(),
    timeoutMs: DEFAULTS.TIMEOUT_MS,
    maxTokens: DEFAULTS.MAX_TOKENS,
    temperature: DEFAULTS.TEMPERATURE,
    topP: DEFAULTS.TOP_P,
    frequencyPenalty: DEFAULTS.FREQUENCY_PENALTY,
    allowedModels,
  };
};
