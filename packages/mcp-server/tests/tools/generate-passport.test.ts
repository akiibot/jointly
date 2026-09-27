import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareWorkspaces } from "../../src/tools/prepare-workspaces.js";
import { exportResolutionPatch } from "../../src/tools/export-resolution-patch.js";
import { exportedVerdictPresentation, generatePassport } from "../../src/tools/generate-passport.js";
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

    await mkdir(path.join(fixture.registration.runRoot, "generated-tests"), { recursive: true });
    await writeFile(
      path.join(fixture.registration.runRoot, "generated-tests", "interaction.test.ts"),
      "it('checks the interaction', () => {});\n",
    );
    await writeFile(
      path.join(fixture.registration.runRoot, "collision-evidence.json"),
      JSON.stringify({
        hypothesisId: "H-1",
        testFile: "generated-tests/interaction.test.ts",
        classification: "confirmed-collision",
        requirementIds: ["A-1", "B-1"],
        commandResult: {
          commandId: "interaction",
          workspace: "combined",
          command: "npm test",
          exitCode: 1,
          timedOut: false,
          durationMs: 10,
          stdoutArtifact: "test-results/combined/interaction.stdout.log",
          stderrArtifact: "test-results/combined/interaction.stderr.log",
        },
        expected: "both behaviors",
        observed: "one failed",
      }),
    );

    const result = await generatePassport(fixture.context, {
      runId: fixture.registration.runId,
      verdict: "COLLISION_CONFIRMED",
      summary: "Replay collision confirmed",
    });
    expect(result.verdict).toBe("COLLISION_CONFIRMED");
    const html = await readFile(path.join(fixture.registration.runRoot, "passport.html"), "utf8");
    expect(html).toContain("Replay collision confirmed");
    expect(html).toContain('verdict-card danger');
    expect(html).toContain("Do not merge this candidate");
    expect(html).not.toContain('verdict-card safe');
    expect(
      JSON.parse(await readFile(path.join(fixture.registration.runRoot, "passport.json"), "utf8"))
        .collisionEvidence.beforeRepair.generatedTestSource,
    ).toContain("checks the interaction");
  });

  it("assigns explicit non-success presentation to every non-safe verdict", () => {
    expect(exportedVerdictPresentation("SAFE_TO_MERGE").tone).toBe("safe");
    expect(exportedVerdictPresentation("COLLISION_CONFIRMED").tone).toBe("danger");
    expect(exportedVerdictPresentation("REPAIR_REQUIRES_REVIEW").tone).toBe("warning");
    expect(exportedVerdictPresentation("INDEPENDENT_CHANGE_FAILED").tone).toBe("danger");
    expect(exportedVerdictPresentation("TEXTUAL_CONFLICT").tone).toBe("danger");
    expect(exportedVerdictPresentation("INSUFFICIENT_EVIDENCE").tone).toBe("blocked");
  });

  it("refuses to export a repair that modifies an existing test", async () => {
    const fixture = await createRegisteredFixture();
    const prepared = await prepareWorkspaces(fixture.context, fixture.registration.runId);
    const combined = prepared.workspaces.find((workspace) => workspace.name === "combined")!;
    await writeFile(path.join(combined.path, "tests", "existing.test.ts"), "// weakened test\n");
    await expect(exportResolutionPatch(fixture.context, fixture.registration.runId)).rejects.toThrow(
      "modifies protected existing tests",
    );
  });
});
