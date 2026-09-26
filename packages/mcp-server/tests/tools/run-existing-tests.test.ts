import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { runExistingTests } from "../../src/tools/run-existing-tests.js";
import { createRegisteredFixture } from "../helpers.js";

describe("run_existing_tests", () => {
  it("runs only the configured command in the selected workspace", async () => {
    const fixture = await createRegisteredFixture();
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const result = await runExistingTests(fixture.context, fixture.registration.runId, "combined");
    expect(result.exitCode).toBe(0);
    expect(result.command).toBe("node existing-test.mjs");
    expect(
      JSON.parse(
        await readFile(path.join(fixture.registration.runRoot, "test-results", "existing.json"), "utf8"),
      ),
    ).toMatchObject({ combined: { exitCode: 0 } });
  });
});
