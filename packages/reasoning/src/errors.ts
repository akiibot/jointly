export type ReasoningErrorCode =
  | "authentication"
  | "authorization"
  | "quota"
  | "rate-limit"
  | "provider-outage"
  | "timeout"
  | "cancelled"
  | "refusal"
  | "invalid-output"
  | "unsupported-capability"
  | "budget-exhausted";

export class ReasoningError extends Error {
  constructor(
    public readonly code: ReasoningErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ReasoningError";
  }
}
