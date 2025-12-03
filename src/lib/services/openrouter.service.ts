/**
 * OpenRouter Service Module
 * High-level service for interacting with OpenRouter API
 * Handles chat completion requests with JSON Schema response format
 */

import type { OpenRouterConfig } from "./openrouter.config";
import {
  OpenRouterHttpClient,
  OpenRouterHttpError,
  OpenRouterTimeoutError,
  OpenRouterTransportError,
} from "./openrouter.http-client";
import { GenerationErrorCodes } from "./generation.service";

/**
 * Chat message structure for OpenRouter API
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * JSON Schema response format structure for OpenRouter
 */
export interface JsonSchemaResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: Record<string, unknown>;
  };
}

/**
 * Options for chat completion request
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
}

/**
 * Chat completion message from OpenRouter response
 */
export interface ChatCompletionMessage {
  role: string;
  content: string;
}

/**
 * Raw chat completion response from OpenRouter
 */
export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatCompletionMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

/**
 * OpenRouter Service Error
 * Wraps internal errors and maps them to domain error codes
 */
export class OpenRouterServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "OpenRouterServiceError";
  }
}

/**
 * OpenRouter Service
 * Provides high-level interface for chat completions with structured JSON responses
 */
export class OpenRouterService {
  private readonly defaultModel: string;
  private readonly defaultModelParams: {
    maxTokens: number;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
  };
  private readonly allowedModels: string[];
  private readonly httpClient: OpenRouterHttpClient;

  constructor(config: OpenRouterConfig) {
    this.defaultModel = config.defaultModel;
    this.allowedModels = config.allowedModels;

    this.defaultModelParams = {
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      topP: config.topP,
      frequencyPenalty: config.frequencyPenalty,
    };

    this.httpClient = new OpenRouterHttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
    });
  }

  /**
   * Get the default model identifier
   */
  getDefaultModel(): string {
    return this.defaultModel;
  }

  /**
   * Get list of allowed models
   */
  getAllowedModels(): string[] {
    return [...this.allowedModels];
  }

  /**
   * Create chat completion with JSON Schema response format
   * @param messages - Array of chat messages (system, user, etc.)
   * @param responseFormat - JSON Schema definition for structured response
   * @param options - Optional model parameters override
   * @returns Message object from API response
   * @throws {OpenRouterServiceError} If request fails or response is invalid
   */
  async createChatCompletionWithSchema(
    messages: ChatMessage[],
    responseFormat: JsonSchemaResponseFormat,
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionMessage> {
    try {
      // Build payload
      const payload = this.buildChatCompletionPayload(messages, responseFormat, options);

      // Send request
      const rawResponse = await this.sendRequestToOpenRouter(payload);

      // Extract message
      return this.extractMessageFromResponse(rawResponse);
    } catch (error) {
      throw this.mapErrorToServiceError(error);
    }
  }

  /**
   * Raw chat completion request without JSON Schema constraint
   * @param request - Complete chat completion request object
   * @returns Full chat completion response
   * @throws {OpenRouterServiceError} If request fails
   */
  async chatRaw(request: Record<string, unknown>): Promise<ChatCompletionResponse> {
    try {
      const rawResponse = await this.sendRequestToOpenRouter(request);
      return rawResponse as ChatCompletionResponse;
    } catch (error) {
      throw this.mapErrorToServiceError(error);
    }
  }

  /**
   * Build chat completion payload for OpenRouter API
   */
  private buildChatCompletionPayload(
    messages: ChatMessage[],
    responseFormat: JsonSchemaResponseFormat,
    options?: ChatCompletionOptions
  ): Record<string, unknown> {
    // Validate messages
    if (!messages || messages.length === 0) {
      throw new Error("Messages array cannot be empty");
    }

    // Validate response format
    if (!responseFormat?.json_schema?.schema) {
      throw new Error("Invalid response format: json_schema.schema is required");
    }

    // Determine model
    const model = options?.model || this.defaultModel;
    if (!this.allowedModels.includes(model)) {
      throw new Error(`Model "${model}" is not allowed. Allowed models: ${this.allowedModels.join(", ")}`);
    }

    // Clamp and merge parameters
    const temperature = this.clampTemperature(options?.temperature ?? this.defaultModelParams.temperature);
    const maxTokens = this.clampMaxTokens(options?.maxTokens ?? this.defaultModelParams.maxTokens);
    const topP = this.clampTopP(options?.topP ?? this.defaultModelParams.topP);
    const frequencyPenalty = this.clampFrequencyPenalty(
      options?.frequencyPenalty ?? this.defaultModelParams.frequencyPenalty
    );

    return {
      model,
      messages,
      response_format: responseFormat,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
    };
  }

  /**
   * Send request to OpenRouter API
   */
  private async sendRequestToOpenRouter(payload: Record<string, unknown>): Promise<unknown> {
    return await this.httpClient.postChatCompletion(payload);
  }

  /**
   * Extract message from OpenRouter response
   * @throws {Error} If response structure is invalid
   */
  private extractMessageFromResponse(rawResponse: unknown): ChatCompletionMessage {
    if (!rawResponse || typeof rawResponse !== "object") {
      throw new Error("Invalid response: not an object");
    }

    const response = rawResponse as { choices?: unknown[] };

    if (!Array.isArray(response.choices) || response.choices.length === 0) {
      throw new Error("Invalid response: choices array is empty or missing");
    }

    const firstChoice = response.choices[0] as { message?: unknown };

    if (!firstChoice.message || typeof firstChoice.message !== "object") {
      throw new Error("Invalid response: message is missing or invalid");
    }

    const message = firstChoice.message as ChatCompletionMessage;

    if (typeof message.content !== "string") {
      throw new Error("Invalid response: message.content is not a string");
    }

    return message;
  }

  /**
   * Map errors to OpenRouterServiceError with appropriate domain error codes
   */
  private mapErrorToServiceError(error: unknown): OpenRouterServiceError {
    // Timeout errors
    if (error instanceof OpenRouterTimeoutError) {
      return new OpenRouterServiceError(
        "AI generation timed out. Please try again.",
        GenerationErrorCodes.AI_TIMEOUT,
        error
      );
    }

    // HTTP errors (4xx, 5xx)
    if (error instanceof OpenRouterHttpError) {
      const statusCode = error.statusCode;

      // 401 - Authentication error
      if (statusCode === 401) {
        return new OpenRouterServiceError(
          "AI service authentication failed. Please contact support.",
          GenerationErrorCodes.AI_GENERATION_ERROR,
          error
        );
      }

      // 429 - Rate limit
      if (statusCode === 429) {
        return new OpenRouterServiceError(
          "AI service rate limit exceeded. Please try again later.",
          GenerationErrorCodes.AI_GENERATION_ERROR,
          error
        );
      }

      // 5xx - Server errors
      if (statusCode && statusCode >= 500) {
        return new OpenRouterServiceError(
          "AI service is temporarily unavailable. Please try again later.",
          GenerationErrorCodes.AI_GENERATION_ERROR,
          error
        );
      }

      // Other HTTP errors
      return new OpenRouterServiceError(
        "AI generation failed. Please try again.",
        GenerationErrorCodes.AI_GENERATION_ERROR,
        error
      );
    }

    // Transport/network errors
    if (error instanceof OpenRouterTransportError) {
      return new OpenRouterServiceError(
        "Network error occurred. Please check your connection.",
        GenerationErrorCodes.AI_GENERATION_ERROR,
        error
      );
    }

    // Invalid response structure or parsing errors
    if (error instanceof Error && error.message.includes("Invalid response")) {
      return new OpenRouterServiceError(
        "AI returned invalid response. Please try again.",
        GenerationErrorCodes.AI_RESPONSE_INVALID,
        error
      );
    }

    // Unknown errors
    return new OpenRouterServiceError(
      "An unexpected error occurred during AI generation.",
      GenerationErrorCodes.AI_GENERATION_ERROR,
      error
    );
  }

  /**
   * Clamp temperature to valid range [0, 1]
   */
  private clampTemperature(value: number): number {
    if (isNaN(value)) return this.defaultModelParams.temperature;
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Clamp max_tokens to valid range [100, 16000]
   */
  private clampMaxTokens(value: number): number {
    if (isNaN(value)) return this.defaultModelParams.maxTokens;
    return Math.max(100, Math.min(16000, value));
  }

  /**
   * Clamp top_p to valid range [0, 1]
   */
  private clampTopP(value: number): number {
    if (isNaN(value)) return this.defaultModelParams.topP;
    return Math.max(0, Math.min(1, value));
  }

  /**
   * Clamp frequency_penalty to valid range [0, 2]
   */
  private clampFrequencyPenalty(value: number): number {
    if (isNaN(value)) return this.defaultModelParams.frequencyPenalty;
    return Math.max(0, Math.min(2, value));
  }
}




