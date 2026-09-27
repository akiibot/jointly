import type { InferenceTransport, RawInferenceResponse, ReasoningRequest } from "./contracts.js";
import { ReasoningError } from "./errors.js";

export type FakeStep = RawInferenceResponse | ReasoningError | ((request: ReasoningRequest) => RawInferenceResponse | Promise<RawInferenceResponse>);

export class FakeInferenceTransport implements InferenceTransport {
  readonly provider = "fake";
  readonly requests: ReasoningRequest[] = [];

  constructor(private readonly steps: FakeStep[]) {}

  async infer(request: ReasoningRequest, signal: AbortSignal): Promise<RawInferenceResponse> {
    this.requests.push(request);
    if (signal.aborted) throw signal.reason;
    const step = this.steps.shift();
    if (!step) throw new ReasoningError("provider-outage", "fake response queue is empty");
    if (step instanceof ReasoningError) throw step;
    const response = typeof step === "function" ? await step(request) : step;
    if (signal.aborted) throw signal.reason;
    return response;
  }
}
