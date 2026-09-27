import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import {
  classifyGeneratedVitestRun,
  enrichCommandWithVitestReport,
  failureScenarioReportSchema,
  parseVitestReport,
  prepareVitestReport,
  runCommand,
  writeFailureScenarioReport,
  type CommandResult,
  type ExecutedCommand,
} from "../src/index.js";

const execute = promisify(execFile);
const repositoryRoot = path.resolve(import.meta.dirname, "../../..");

function persisted(result: ExecutedCommand): CommandResult {
  const { stdout: _stdout, stderr: _stderr, ...record } = result;
  return record;
}

async function git(cwd: string, args: string[]) {
  return execute("git", args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Jointly fixture",
      GIT_AUTHOR_EMAIL: "fixture@jointly.invalid",
      GIT_COMMITTER_NAME: "Jointly fixture",
      GIT_COMMITTER_EMAIL: "fixture@jointly.invalid",
    },
  });
}

describe("W7 failure scenario report", () => {
  it("records actual conflict, independent failure, invalid test, timeout, and cancellation evidence", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-failure-scenarios-"));
    const runRoot = path.join(root, "run");
    const conflictRepo = path.join(root, "conflict");
    await mkdir(conflictRepo);
    await git(conflictRepo, ["init", "--initial-branch=main"]);
    await writeFile(path.join(conflictRepo, "shared.txt"), "base\n");
    await git(conflictRepo, ["add", "."]);
    await git(conflictRepo, ["commit", "-m", "base"]);
    await git(conflictRepo, ["switch", "-c", "change/a"]);
    await writeFile(path.join(conflictRepo, "shared.txt"), "change a\n");
    await git(conflictRepo, ["commit", "-am", "change a"]);
    await git(conflictRepo, ["switch", "main"]);
    await git(conflictRepo, ["switch", "-c", "change/b"]);
    await writeFile(path.join(conflictRepo, "shared.txt"), "change b\n");
    await git(conflictRepo, ["commit", "-am", "change b"]);
    await git(conflictRepo, ["switch", "change/a"]);
    const conflict = await runCommand({
      cwd: conflictRepo,
      command: "git -c user.name=Jointly -c user.email=jointly@local.invalid merge --no-edit change/b",
      workspace: "combined",
      runRoot,
      commandId: "textual-conflict",
    });
    const conflictedFiles = (await git(conflictRepo, ["diff", "--name-only", "--diff-filter=U"])).stdout.trim().split("\n").filter(Boolean);
    expect(conflict.exitCode).not.toBe(0);

    const independent = await runCommand({
      cwd: root,
      command: "node -e \"process.stderr.write('independent suite failed'); process.exit(1)\"",
      workspace: "change-a",
      runRoot,
      commandId: "independent-failure",
    });

    const invalidRoot = path.join(root, "invalid-test");
    await mkdir(invalidRoot);
    await symlink(path.join(repositoryRoot, "node_modules"), path.join(invalidRoot, "node_modules"), "dir");
    await writeFile(path.join(invalidRoot, "generated-invalid.test.ts"), "import { it } from 'vitest'; it('invalid', () => { expect( });\n");
    const reportPath = await prepareVitestReport(invalidRoot, "vitest-report.json");
    const invalidRaw = await runCommand({
      cwd: invalidRoot,
      command: `node ${JSON.stringify(path.join(repositoryRoot, "node_modules/vitest/vitest.mjs"))} run generated-invalid.test.ts --reporter=json --outputFile=vitest-report.json`,
      workspace: "combined",
      runRoot,
      commandId: "invalid-test",
    });
    const invalid = await enrichCommandWithVitestReport(runRoot, reportPath, invalidRaw);
    const invalidReport = parseVitestReport(JSON.parse(await readFile(reportPath, "utf8")));
    const invalidClassification = classifyGeneratedVitestRun({
      commandResult: invalid,
      report: invalidReport,
      generatedTestFilename: "generated-invalid.test.ts",
    });
    expect(invalidClassification.classification).toBe("test-invalid");

    const timeout = await runCommand({
      cwd: root,
      command: "node -e \"setInterval(() => {}, 1000)\"",
      workspace: "combined",
      runRoot,
      commandId: "timeout",
      timeoutMs: 50,
    });
    const timeoutClassification = classifyGeneratedVitestRun({ commandResult: timeout, generatedTestFilename: "timeout.test.ts" });

    const controller = new AbortController();
    const cancellationPending = runCommand({
      cwd: root,
      command: "node -e \"process.stdout.write('running'); setInterval(() => {}, 1000)\"",
      workspace: "combined",
      runRoot,
      commandId: "cancellation",
      timeoutMs: 5_000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 300);
    const cancellation = await cancellationPending;
    const cancellationClassification = classifyGeneratedVitestRun({ commandResult: cancellation, generatedTestFilename: "cancelled.test.ts" });

    const report = await writeFailureScenarioReport(runRoot, {
      schemaVersion: "1",
      scenarioSet: "w7-failure-modes",
      cases: [
        { id: "textual-conflict", outcome: "TEXTUAL_CONFLICT", reason: "both changes edited the same line", actualExecution: true, commandResult: persisted(conflict), conflictedFiles },
        { id: "independent-failure", outcome: "INDEPENDENT_CHANGE_FAILED", reason: "change A failed before interaction analysis", actualExecution: true, commandResult: persisted(independent) },
        { id: "invalid-test", outcome: "test-invalid", reason: invalidClassification.reason, actualExecution: true, commandResult: persisted(invalid), classification: invalidClassification.classification },
        { id: "timeout", outcome: "environment-failure", reason: timeoutClassification.reason, actualExecution: true, commandResult: persisted(timeout), classification: timeoutClassification.classification },
        { id: "cancellation", outcome: "cancelled", reason: cancellationClassification.reason, actualExecution: true, commandResult: persisted(cancellation), classification: cancellationClassification.classification },
      ],
    });

    expect(failureScenarioReportSchema.parse(report)).toEqual(report);
    expect(report.cases.map((entry) => entry.outcome)).toEqual([
      "TEXTUAL_CONFLICT", "INDEPENDENT_CHANGE_FAILED", "test-invalid", "environment-failure", "cancelled",
    ]);
    for (const entry of report.cases) {
      await expect(readFile(path.join(runRoot, entry.commandResult.stdoutArtifact), "utf8")).resolves.toBeTypeOf("string");
      await expect(readFile(path.join(runRoot, entry.commandResult.stderrArtifact), "utf8")).resolves.toBeTypeOf("string");
    }
    expect(JSON.parse(await readFile(path.join(runRoot, "failure-scenarios.json"), "utf8"))).toEqual(report);
  }, 30_000);
});
