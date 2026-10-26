/**
 * Language-model layer. The assistant only talks to this interface, so the provider
 * (Gemini today) can be swapped without touching the assistant logic.
 */
export interface AiProvider {
  readonly name: string;
  /** One vector per text, same task type for stored variants and questions. */
  embed(texts: string[]): Promise<number[][]>;
  /** Streams plain text. Throws before the first chunk if no model is available. */
  stream(prompt: string, options?: { maxTokens?: number; temperature?: number }): AsyncIterable<string>;
}

export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}
