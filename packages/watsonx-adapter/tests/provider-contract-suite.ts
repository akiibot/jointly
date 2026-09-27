import type { InferenceTransport, RawInferenceResponse, ReasoningRequest } from "@jointly/reasoning";
import { describe, expect, it } from "vitest";

export function runProviderContractSuite(
  name: string,
  request: () => ReasoningRequest,
  successful: () => InferenceTransport,
  failing: () => InferenceTransport,
): void {
  describe(`provider contract: ${name}`, () => {
    it("returns the provider-independent response shape", async () => {
      const response = await successful().infer(request(), new AbortController().signal);
      expect(response.provider).toBeTypeOf("string");
      expect(response.modelId).toBeTypeOf("string");
      expect(response.content).toBeTypeOf("string");
      expect(["stop", "length", "refusal", "content-filter", "unknown", undefined])
        .toContain(response.finishReason as RawInferenceResponse["finishReason"]);
      if (response.providerRequestId !== undefined) expect(response.providerRequestId).toBeTypeOf("string");
      if (response.usage?.inputTokens !== undefined) expect(response.usage.inputTokens).toBeTypeOf("number");
    });

    it("does not begin work with an already-aborted signal", async () => {
      const controller = new AbortController();
      controller.abort();
      await expect(successful().infer(request(), controller.signal)).rejects.toMatchObject({ code: "cancelled" });
    });

    it("reports normalized provider errors", async () => {
      await expect(failing().infer(request(), new AbortController().signal))
        .rejects.toMatchObject({ code: expect.any(String), retryable: expect.any(Boolean) });
    });
  });
}
