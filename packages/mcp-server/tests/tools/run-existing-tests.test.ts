import { readFile, writeFile } from "node:fs/promises";
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
    ).toMatchObject({
      schemaVersion: "2",
      beforeRepair: { combined: { exitCode: 0 } },
      afterRepair: {},
    });
  });

  it("uses the frozen configuration after registration", async () => {
    const fixture = await createRegisteredFixture();
    await writeFile(
      path.join(fixture.root, "jointly.yaml"),
      `project:\n  name: changed\n  root: missing\nbase:\n  ref: wrong\nchanges:\n  - { id: x, ref: x, promptFile: x.md }\n  - { id: y, ref: y, promptFile: y.md }\ncommands:\n  test: exit 99\n`,
    );
    await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const result = await runExistingTests(fixture.context, fixture.registration.runId, "combined");
    expect(result.exitCode).toBe(0);
    expect(result.command).toBe("node existing-test.mjs");
  });

  it("preserves before- and after-repair existing-test executions", async () => {
    const fixture = await createRegisteredFixture();
    const prepared = await prepareWorkspaces(fixture.context, fixture.registration.runId);
    await runExistingTests(fixture.context, fixture.registration.runId, "combined", "before-repair");
    const combined = prepared.workspaces.find((workspace) => workspace.name === "combined")!;
    await writeFile(path.join(combined.path, "repair-candidate.txt"), "candidate\n");
    await runExistingTests(fixture.context, fixture.registration.runId, "combined", "after-repair");
    const summary = JSON.parse(
      await readFile(path.join(fixture.registration.runRoot, "test-results", "existing.json"), "utf8"),
    );
    expect(summary.beforeRepair.combined.exitCode).toBe(0);
    expect(summary.afterRepair.combined.exitCode).toBe(0);
    expect(summary.beforeRepair.combined.commandId).not.toBe(summary.afterRepair.combined.commandId);
    expect(summary.fingerprints.beforeRepair.combined.inputsDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(summary.fingerprints.beforeRepair.combined.workspaceStateDigest).not.toBe(
      summary.fingerprints.afterRepair.combined.workspaceStateDigest,
    );
    const execution = JSON.parse(
      await readFile(
        path.join(fixture.registration.runRoot, "executions", "combined-mcp-existing-combined-after-repair.json"),
        "utf8",
      ),
    );
    expect(execution).toMatchObject({ schemaVersion: "2", inputs: { runId: fixture.registration.runId } });
    expect(execution.result.stdout).toBeUndefined();
  });
});
