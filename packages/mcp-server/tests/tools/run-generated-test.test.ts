import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { classifyGeneratedTest, runGeneratedTest } from "../../src/tools/run-generated-test.js";
import { createRegisteredFixture } from "../helpers.js";

describe("run_generated_test", () => {
  it("classifies an assertion failure as a confirmed-collision candidate", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const generated = path.join(fixture.registration.runRoot, "generated-tests");
    await mkdir(generated, { recursive: true });
    await writeFile(path.join(generated, "interaction.test.ts"), "// generated test\n");
    const result = await runGeneratedTest(fixture.context, {
      runId: fixture.registration.runId,
      testPath: "generated-tests/interaction.test.ts",
      hypothesisId: "HYP-1",
      requirementIds: ["PAYMENT-3"],
      expected: "same payment",
    });
    expect(result.classification).toBe("confirmed-collision");
  });

  it("does not misclassify compilation failures", () => {
    expect(classifyGeneratedTest(1, false, "SyntaxError: bad generated code")).toBe("test-invalid");
    expect(classifyGeneratedTest(0, false, "pass")).toBe("hypothesis-rejected");
  });
});
