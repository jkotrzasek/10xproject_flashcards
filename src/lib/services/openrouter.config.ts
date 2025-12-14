/**
 * OpenRouter API Configuration Module
 * Handles validation and initialization of OpenRouter service configuration
 */

import { OPENROUTER_API_KEY, OPENROUTER_DEFAULT_MODEL } from "astro:env/server";

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
  // Required: API Key (validated by astro:env schema)
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.trim().length === 0) {
    throw new OpenRouterConfigError("OPENROUTER_API_KEY is required and must be a non-empty string");
  }

  // Default Model (with default from astro:env schema)
  const defaultModel = OPENROUTER_DEFAULT_MODEL;

  // Validate default model is in allowed list
  const allowedModels = [...ALLOWED_MODELS];
  validateModel(defaultModel, allowedModels);

  // Use hardcoded defaults for all other parameters
  return {
    apiKey: OPENROUTER_API_KEY.trim(),
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
