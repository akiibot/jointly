import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  runCommand,
  writeJson,
  type CollisionEvidence,
} from "@jointly/core";
import {
  assertSafeRelativePath,
  bounded,
  loadRun,
  loadWorkspaces,
  type ToolContext,
} from "../context.js";

export interface RunGeneratedTestInput {
  runId: string;
  testPath: string;
  hypothesisId: string;
  requirementIds: string[];
  expected: string;
}

const INVALID_TEST = /(?:Cannot find module|Failed to load|Transform failed|SyntaxError|ReferenceError|TypeError:.*is not a function|No test files found|TS\d{4})/i;

export function classifyGeneratedTest(exitCode: number | null, timedOut: boolean, output: string) {
  if (timedOut) return "environment-failure" as const;
  if (exitCode === 0) return "hypothesis-rejected" as const;
  if (INVALID_TEST.test(output)) return "test-invalid" as const;
  return "confirmed-collision" as const;
}

export async function runGeneratedTest(context: ToolContext, input: RunGeneratedTestInput) {
  assertSafeRelativePath(input.testPath, "testPath");
  if (!input.testPath.startsWith("generated-tests/")) {
    throw new Error("testPath must be under generated-tests/");
  }
  const { runRoot, manifest, config } = await loadRun(context, input.runId);
  const prepared = await loadWorkspaces(runRoot);
  const combined = prepared.workspaces.find((workspace) => workspace.name === "combined");
  if (!combined) throw new Error("combined workspace is not prepared");
  if (!manifest.commands.interactionTest) throw new Error("commands.interactionTest is not configured");

  const filename = path.basename(input.testPath);
  if (!filename.endsWith(".test.ts")) throw new Error("generated test must end in .test.ts");
  const destinationDirectory = path.join(combined.path, config.project.root, "tests", "interaction");
  await mkdir(destinationDirectory, { recursive: true });
  await copyFile(path.join(runRoot, input.testPath), path.join(destinationDirectory, filename));

  const commandResult = await runCommand({
    cwd: path.join(combined.path, config.project.root),
    command: manifest.commands.interactionTest,
    workspace: "combined",
    runRoot,
    commandId: `generated-${path.parse(filename).name}`,
  });
  const observed = bounded(`${commandResult.stdout}\n${commandResult.stderr}`, 16 * 1024);
  const evidence: CollisionEvidence = {
    hypothesisId: input.hypothesisId,
    classification: classifyGeneratedTest(commandResult.exitCode, commandResult.timedOut, observed),
    requirementIds: input.requirementIds,
    testFile: input.testPath,
    commandResult,
    expected: input.expected,
    observed,
  };
  await writeJson(runRoot, "collision-evidence.json", evidence);
  return evidence;
}
