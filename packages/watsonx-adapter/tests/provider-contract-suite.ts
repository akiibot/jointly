/**
 * Shared provider contract suite.
 *
 * Both the FakeTransport and the mocked WatsonxTransport must satisfy every
 * test in this suite without live credentials or network access.
 *
 * Rules:
 * - No live requests.  The WatsonxTransport tests use vi.mock() to intercept
 *   the SDK before any network connection is attempted.
 * - No credentials.  Test files must never import or read WATSONX_API_KEY.
 * - Any provider-contract conflict discovered here must be documented and
 *   submitted for review; do not silently modify the shared contract.
 *
 * Usage:
 *   import { runProviderContractSuite } from "./provider-contract-suite.js";
 *   runProviderContractSuite("FakeTransport", () => new FakeTransport());
 *   runProviderContractSuite("WatsonxTransport (mocked)", () => mockedTransport);
 */

import { describe, it, expect } from "vitest";
import type { InferenceTransport, ProviderConfig, GenerationRequest, GenerationResponse } from "@jointly/reasoning";
import { InferenceError, InferenceErrorCode } from "@jointly/reasoning";

export const contractConfig: ProviderConfig = {
  serviceUrl: "https://us-south.ml.cloud.ibm.com",
  projectId:  "contract-test-project",
  modelId:    "ibm/granite-13b-instruct-v2",
  apiVersion: "2024-03-14",
};

export const contractRequest: GenerationRequest = {
  prompt:       "Test prompt.",
  maxNewTokens: 20,
};

/**
 * Run the shared provider contract suite against a transport factory.
 *
 * @param name           - Display name for this adapter.
 * @param makeTransport  - Factory that returns a configured transport for
 *                         each test sub-case.
 * @param makeErrorTransport - Factory that returns a transport that throws
 *                         InferenceError(AUTH_FAILED) on generate().
 */
export function runProviderContractSuite(
  name: string,
  makeTransport: () => InferenceTransport,
  makeErrorTransport?: (code: InferenceErrorCode) => InferenceTransport,
): void {
  describe(`Provider contract suite — ${name}`, () => {
    // -----------------------------------------------------------------------
    // Contract 1: successful response shape
    // -----------------------------------------------------------------------
    it("returns a GenerationResponse with generatedText on success", async () => {
      const transport = makeTransport();
      const response = await transport.generate(contractConfig, contractRequest);
      expect(typeof response.generatedText).toBe("string");
    });

    it("never invents a requestId as a non-string", async () => {
      const transport = makeTransport();
      const response = await transport.generate(contractConfig, contractRequest);
      expect(
        response.requestId === undefined || typeof response.requestId === "string",
      ).toBe(true);
    });

    it("never invents a token count as a non-number", async () => {
      const transport = makeTransport();
      const response = await transport.generate(contractConfig, contractRequest);
      expect(
        response.inputTokenCount === undefined ||
          typeof response.inputTokenCount === "number",
      ).toBe(true);
      expect(
        response.generatedTokenCount === undefined ||
          typeof response.generatedTokenCount === "number",
      ).toBe(true);
    });

    it("finishReason is a valid FinishReason value or undefined", async () => {
      const valid: GenerationResponse["finishReason"][] = [
        "stop", "length", "time_limit", "cancelled", "error", "unknown", undefined,
      ];
      const transport = makeTransport();
      const response = await transport.generate(contractConfig, contractRequest);
      expect(valid).toContain(response.finishReason);
    });

    // -----------------------------------------------------------------------
    // Contract 2: AbortSignal — already aborted
    // -----------------------------------------------------------------------
    it("rejects with CANCELLED when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const transport = makeTransport();
      await expect(
        transport.generate(contractConfig, {
          ...contractRequest,
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ code: InferenceErrorCode.CANCELLED });
    });

    // -----------------------------------------------------------------------
    // Contract 3: errors are InferenceError instances
    // -----------------------------------------------------------------------
    if (makeErrorTransport) {
      it("throws InferenceError (not a plain Error) on auth failure", async () => {
        const transport = makeErrorTransport(InferenceErrorCode.AUTH_FAILED);
        await expect(
          transport.generate(contractConfig, contractRequest),
        ).rejects.toBeInstanceOf(InferenceError);
      });

      it("auth failure error is not retryable", async () => {
        const transport = makeErrorTransport(InferenceErrorCode.AUTH_FAILED);
        try {
          await transport.generate(contractConfig, contractRequest);
          expect.fail("Should have thrown");
        } catch (err) {
          expect(err).toBeInstanceOf(InferenceError);
          expect((err as InferenceError).retryable).toBe(false);
        }
      });

      it("provider 5xx error is retryable", async () => {
        const transport = makeErrorTransport(InferenceErrorCode.PROVIDER_ERROR);
        try {
          await transport.generate(contractConfig, contractRequest);
          expect.fail("Should have thrown");
        } catch (err) {
          expect(err).toBeInstanceOf(InferenceError);
          expect((err as InferenceError).retryable).toBe(true);
        }
      });

      it("error diagnostics do not contain credential-shaped values", async () => {
        const transport = makeErrorTransport(InferenceErrorCode.AUTH_FAILED);
        try {
          await transport.generate(contractConfig, contractRequest);
          expect.fail("Should have thrown");
        } catch (err) {
          if (err instanceof InferenceError) {
            const diagStr = JSON.stringify(err.diagnostics ?? {});
            // No bare-looking API keys or Bearer tokens
            expect(diagStr).not.toMatch(/apikey=[^[]/i);
            expect(diagStr).not.toMatch(/Bearer [A-Za-z0-9._\-]{8,}/);
          }
        }
      });
    }
  });
}
