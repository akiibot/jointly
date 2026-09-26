import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { createRegisteredFixture } from "../helpers.js";

describe("prepare_workspaces", () => {
  it("creates four isolated workspaces and composes both changes", async () => {
    const fixture = await createRegisteredFixture();
    const result = await prepareWorkspaces(fixture.context, fixture.registration.runId);
    expect(result.textualConflict).toBeNull();
    expect(result.workspaces).toHaveLength(4);
    const combined = result.workspaces.find((workspace) => workspace.name === "combined")!;
    expect(await readFile(path.join(combined.path, "a.txt"), "utf8")).toBe("a\n");
    expect(await readFile(path.join(combined.path, "b.txt"), "utf8")).toBe("b\n");
  });
});
