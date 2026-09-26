import { describe, expect, it } from "vitest";
import { registerRun } from "../../src/tools/register-run.js";
import { readChangeDiff } from "../../src/tools/read-change-diff.js";
import { createFixture } from "../helpers.js";

describe("register_run", () => {
  it("resolves and persists exactly two changes", async () => {
    const fixture = await createFixture();
    const result = await registerRun(fixture.context, fixture.input);
    expect(result.changes).toHaveLength(2);
    expect(result.resolvedBaseCommit).toMatch(/^[a-f0-9]{40}$/);
    const diff = await readChangeDiff(fixture.context, result.runId, "a");
    expect(diff.files).toEqual(["a.txt"]);
    expect(diff.diff).toContain("+a");
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
