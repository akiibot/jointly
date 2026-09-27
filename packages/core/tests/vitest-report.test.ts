import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand } from "../src/runner.js";
import { classifyGeneratedVitestRun, parseVitestReport } from "../src/vitest-report.js";

async function executeVitestFixture(source: string) {
  const root = await mkdtemp(path.join(tmpdir(), "jointly-vitest-report-"));
  const repositoryNodeModules = path.resolve(process.cwd(), "../../node_modules");
  await symlink(repositoryNodeModules, path.join(root, "node_modules"), process.platform === "win32" ? "junction" : "dir");
  await mkdir(path.join(root, "tests"), { recursive: true });
  await mkdir(path.join(root, ".jointly"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile(path.join(root, "tests", "interaction.test.ts"), source);
  const vitest = path.join(repositoryNodeModules, ".bin", process.platform === "win32" ? "vitest.cmd" : "vitest");
  const commandResult = await runCommand({
    cwd: root,
    command: `"${vitest}" run tests/interaction.test.ts --reporter=json --outputFile=.jointly/report.json`,
    workspace: "combined",
    runRoot: root,
  });
  const report = parseVitestReport(JSON.parse(await readFile(path.join(root, ".jointly", "report.json"), "utf8")));
  return classifyGeneratedVitestRun({ commandResult, report, generatedTestFilename: "interaction.test.ts" });
}

describe("structured Vitest classification", () => {
  it("confirms only a real failed assertion in the generated test", async () => {
    const result = await executeVitestFixture(
      `import { expect, it } from "vitest";\nit("interaction", () => expect(400).toBe(201));\n`,
    );
    expect(result).toMatchObject({ classification: "confirmed-collision", counts: { total: 1, failed: 1 } });
  });

  it.each([
    ["missing import", `import "./missing-module.js";\n`],
    ["syntax failure", `import { it } from "vitest";\nit("broken", () => { const value = ; });\n`],
    ["setup exception", `throw new Error("setup failed");\n`],
  ])("classifies %s as test-invalid", async (_label, source) => {
    expect((await executeVitestFixture(source)).classification).toBe("test-invalid");
  });

  it("rejects an all-skipped generated test as insufficient evidence", async () => {
    const result = await executeVitestFixture(
      `import { it } from "vitest";\nit.skip("interaction", () => {});\n`,
    );
    expect(result.classification).toBe("insufficient-evidence");
  });

  it("rejects a generated file with no tests as insufficient evidence", async () => {
    const result = await executeVitestFixture(`export const fixtureOnly = true;\n`);
    expect(result.classification).toBe("insufficient-evidence");
  });

  it("treats a missing structured report and exit 127 as an environment failure", () => {
    const result = classifyGeneratedVitestRun({
      commandResult: { exitCode: 127, timedOut: false },
      reportError: "ENOENT",
      generatedTestFilename: "interaction.test.ts",
    });
    expect(result.classification).toBe("environment-failure");
  });

  it("rejects malformed reports conservatively", () => {
    expect(() => parseVitestReport({ success: false, testResults: [] })).toThrow("numTotalTests");
  });
});
