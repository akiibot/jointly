#!/usr/bin/env node
import path from "node:path";
import { loadConfig } from "./config.js";
import { createManifest } from "./manifest.js";
import { prepareWorkspaces } from "./workspace.js";
import { runCommand } from "./runner.js";
import { writeJson } from "./evidence.js";
import type { CommandResult } from "./types.js";

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
      if (build.exitCode !== 0 || build.timedOut) continue;
    }
    const test = await runCommand({
      cwd,
      command: config.commands.test,
      workspace: workspace.name,
      runRoot,
      commandId: "existing-tests",
    });
    results.push(test);
  }
  await writeJson(runRoot, "test-results/existing.json", results);

  const failed = results.filter((result) => result.exitCode !== 0 || result.timedOut);
  console.log(JSON.stringify({ runId: manifest.runId, runRoot, results, failed: failed.length }, null, 2));
  if (failed.length > 0) process.exitCode = 1;
}

async function main(): Promise<void> {
  const [command] = process.argv.slice(2);
  if (command !== "analyze") {
    console.error("Usage: npm run jointly -- analyze");
    process.exitCode = 64;
    return;
  }
  await analyze(process.cwd());
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
