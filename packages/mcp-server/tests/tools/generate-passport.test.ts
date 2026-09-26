import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { exportResolutionPatch } from "../../src/tools/export-resolution-patch.js";
import { generatePassport } from "../../src/tools/generate-passport.js";
import { createRegisteredFixture } from "../helpers.js";

describe("export_resolution_patch and generate_passport", () => {
  it("exports only isolated repair changes and renders a supported passport", async () => {
    const fixture = await createRegisteredFixture();
    const beforeA = await new Promise<string>((resolve, reject) => {
      import("node:child_process").then(({ execFile }) =>
        execFile("git", ["rev-parse", "agent/a"], { cwd: fixture.root }, (error, stdout) =>
          error ? reject(error) : resolve(stdout.trim()),
        ),
      );
    });
    const prepared = await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const combined = prepared.workspaces.find((workspace) => workspace.name === "combined")!;
    await writeFile(path.join(combined.path, "repair.txt"), "repair\n");
    const patch = await exportResolutionPatch(fixture.context, fixture.registration.runId);
    expect(patch.changedFiles).toContain("repair.txt");
    const afterA = await new Promise<string>((resolve, reject) => {
      import("node:child_process").then(({ execFile }) =>
        execFile("git", ["rev-parse", "agent/a"], { cwd: fixture.root }, (error, stdout) =>
          error ? reject(error) : resolve(stdout.trim()),
        ),
      );
    });
    expect(afterA).toBe(beforeA);

    const result = await generatePassport(fixture.context, {
      runId: fixture.registration.runId,
      verdict: "COLLISION_CONFIRMED",
      summary: "Replay collision confirmed",
    });
    expect(result.verdict).toBe("COLLISION_CONFIRMED");
    expect(await readFile(path.join(fixture.registration.runRoot, "passport.html"), "utf8")).toContain(
      "Replay collision confirmed",
    );
  });
});
