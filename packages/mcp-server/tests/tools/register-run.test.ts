import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { verifyRunInputIntegrity, type RunManifest } from "@jointly/core";
import { registerRun } from "../../src/tools/register-run.js";
import { readChangeDiff } from "../../src/tools/read-change-diff.js";
import { createFixture } from "../helpers.js";

describe("register_run", () => {
  it("resolves and persists exactly two changes", async () => {
    const fixture = await createFixture();
    const result = await registerRun(fixture.context, fixture.input);
    expect(result.changes).toHaveLength(2);
    expect(result.resolvedBaseCommit).toMatch(/^[a-f0-9]{40}$/);
    const manifest = JSON.parse(
      await readFile(path.join(result.runRoot, "manifest.json"), "utf8"),
    ) as Record<string, any>;
    expect(manifest).toMatchObject({
      schemaVersion: "2",
      resolvedBaseTree: expect.stringMatching(/^[a-f0-9]{40}$/),
      configDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(manifest.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resolvedTree: expect.stringMatching(/^[a-f0-9]{40}$/),
          promptDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      ]),
    );
    const diff = await readChangeDiff(fixture.context, result.runId, "a");
    expect(diff.files).toEqual(["a.txt"]);
    expect(diff.diff).toContain("+a");
  });

  it("detects prompt and source-ref drift without rewriting historical inputs", async () => {
    const fixture = await createFixture();
    const result = await registerRun(fixture.context, fixture.input);
    const manifest = JSON.parse(
      await readFile(path.join(result.runRoot, "manifest.json"), "utf8"),
    ) as RunManifest;
    expect((await verifyRunInputIntegrity(manifest)).valid).toBe(true);

    await writeFile(path.join(fixture.root, "scenarios", "a.md"), "Changed prompt\n");
    const promptDrift = await verifyRunInputIntegrity(manifest);
    expect(promptDrift.valid).toBe(false);
    expect(promptDrift.checks).toContainEqual(expect.objectContaining({ name: "change.a.prompt", ok: false }));

    await promisify(execFile)("git", ["branch", "-f", "agent/a", "agent/b"], { cwd: fixture.root });
    const refDrift = await verifyRunInputIntegrity(manifest);
    expect(refDrift.checks).toContainEqual(expect.objectContaining({ name: "change.a.ref", ok: false }));
  });

  it("rejects more than two changes", async () => {
    const fixture = await createFixture();
    await expect(
      registerRun(fixture.context, {
        ...fixture.input,
        changes: [...fixture.input.changes, fixture.input.changes[0]],
      }),
    ).rejects.toThrow("exactly two");
  });
});
