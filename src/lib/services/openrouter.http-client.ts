/**
 * OpenRouter HTTP Client Module
 * Handles low-level HTTP communication with OpenRouter API
 */

/**
 * Configuration for HTTP client
 */
export interface HttpClientConfig {
  apiKey: string;
  baseUrl: string;
  timeoutMs: number;
}

/**
 * Generic HTTP error
 */
export class OpenRouterHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: unknown
  ) {
    super(message);
    this.name = "OpenRouterHttpError";
  }
}

/**
 * Timeout error
 */
export class OpenRouterTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterTimeoutError";
  }
}

/**
 * Transport/Network error
 */
export class OpenRouterTransportError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "OpenRouterTransportError";
  }
}

/**
 * HTTP Client for OpenRouter API
 * Handles request execution, timeout control, and basic error handling
 */
export class OpenRouterHttpClient {
  constructor(private readonly config: HttpClientConfig) {}

  /**
   * Execute POST request to OpenRouter chat completions endpoint
   * @param payload - Request payload (JSON)
   * @param abortSignal - Optional external abort signal
   * @returns Parsed response body
   * @throws {OpenRouterTimeoutError} If request times out
   * @throws {OpenRouterHttpError} If HTTP error response received
   * @throws {OpenRouterTransportError} If network/transport error occurs
   */
  async postChatCompletion(payload: unknown, abortSignal?: AbortSignal): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    // Combine external signal with internal timeout
    if (abortSignal) {
      abortSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const url = `${this.config.baseUrl}/chat/completions`;
      const headers = this.buildHeaders();

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      // Parse response JSON
      return await this.parseResponseJson(response);
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout or external)
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterTimeoutError("Request timed out");
      }

      // Re-throw our custom errors
      if (
        error instanceof OpenRouterHttpError ||
        error instanceof OpenRouterTimeoutError ||
        error instanceof OpenRouterTransportError
      ) {
        throw error;
      }

      // Wrap unknown errors
      throw new OpenRouterTransportError("Network or transport error occurred", error);
    }
  }

  /**
   * Build HTTP headers for OpenRouter API request
   */
  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost", // Required by OpenRouter
      "X-Title": "AI Flashcard Generator", // Optional but recommended
    };
  }

  /**
   * Handle error responses from OpenRouter API
   * @throws {OpenRouterHttpError}
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorBody: unknown;

    try {
      errorBody = await response.json();
    } catch {
      // If JSON parsing fails, use status text
      errorBody = { message: response.statusText };
    }

    const statusCode = response.status;
    let errorMessage = `OpenRouter API error (${statusCode})`;

    // Extract error message if available
    if (errorBody && typeof errorBody === "object" && "error" in errorBody) {
      const errorObj = errorBody as { error?: { message?: string } };
      if (errorObj.error?.message) {
        errorMessage = errorObj.error.message;
      }
    }

    throw new OpenRouterHttpError(errorMessage, statusCode, errorBody);
  }

  /**
   * Parse response JSON with error handling
   * @throws {OpenRouterTransportError} If JSON parsing fails
   */
  private async parseResponseJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch (error) {
      throw new OpenRouterTransportError("Failed to parse response JSON", error);
    }
  }
}




