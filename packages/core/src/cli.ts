#!/usr/bin/env node
import path from "node:path";
import { loadConfig } from "./config.js";
import { createManifest } from "./manifest.js";
import { prepareWorkspaces } from "./workspace.js";
import { runCommand } from "./runner.js";
import { recordExistingTestResult, writeExecutionRecord } from "./execution-records.js";
import { enrichCommandWithVitestReport, prepareVitestReport } from "./vitest-report.js";
import type { CommandResult } from "./types.js";
import { runDoctor, setupLocalMcp } from "./doctor.js";

async function analyze(repositoryRoot: string): Promise<void> {
  const config = await loadConfig(path.join(repositoryRoot, "jointly.yaml"));
  const { manifest, runRoot } = await createManifest(repositoryRoot, config);
  const prepared = await prepareWorkspaces(repositoryRoot, runRoot, manifest);
  if (prepared.textualConflict) {
    console.error(`Textual conflict while applying ${prepared.textualConflict.changeId}`);
    process.exitCode = 2;
    return;
  }

  const results: CommandResult[] = [];
  for (const workspace of prepared.workspaces) {
    const cwd = path.join(workspace.path, config.project.root);
    if (config.commands.build) {
      const build = await runCommand({
        cwd,
        command: config.commands.build,
        workspace: workspace.name,
        runRoot,
        commandId: "build",
      });
      results.push(build);
      await writeExecutionRecord(runRoot, "build", build, {
        manifest,
        workspaceCommit: workspace.commit,
        workspacePath: workspace.path,
      });
      if (build.exitCode !== 0 || build.timedOut) continue;
    }
    const reportPath = manifest.commands.testReport
      ? await prepareVitestReport(cwd, manifest.commands.testReport)
      : undefined;
    const executedTest = await runCommand({
      cwd,
      command: config.commands.test,
      workspace: workspace.name,
      runRoot,
      commandId: "existing-tests",
    });
    const test = reportPath
      ? await enrichCommandWithVitestReport(runRoot, reportPath, executedTest)
      : { ...executedTest, testReportError: "commands.testReport is not configured" };
    results.push(test);
    await recordExistingTestResult(runRoot, workspace.name, test, "before-repair", {
      manifest,
      workspaceCommit: workspace.commit,
      workspacePath: workspace.path,
    });
  }

  const failed = results.filter((result) => result.exitCode !== 0 || result.timedOut);
  console.log(JSON.stringify({ runId: manifest.runId, runRoot, results, failed: failed.length }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  const [command, ...flags] = process.argv.slice(2);
  if (command === "doctor") {
    const report = await runDoctor(process.cwd());
    if (flags.includes("--json")) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      for (const check of report.checks) {
        const marker = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
        console.log(`[${marker}] ${check.id}: ${check.message}`);
      }
      console.log(`Deterministic readiness: ${report.deterministicReady ? "READY" : "BLOCKED"}`);
      console.log("watsonx readiness: UNVERIFIED (participant-owned adapter and live access pending)");
    }
    if (!report.deterministicReady) process.exitCode = 1;
    return;
  }
  if (command === "setup") {
    console.log(JSON.stringify(await setupLocalMcp(process.cwd()), null, 2));
    return;
  }
  if (command !== "analyze") {
    console.error("Usage: npm run jointly -- <doctor [--json] | setup | analyze>");
    process.exitCode = 64;
    return;
  }
  await analyze(process.cwd());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
