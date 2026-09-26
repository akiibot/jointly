#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { PASSPORT_VERDICTS } from "@jointly/core";
import { createContext, type ToolContext } from "./context.js";
import { registerRun } from "./tools/register-run.js";
import { prepareWorkspaces } from "./tools/prepare-workspaces.js";
import { readChangeDiff } from "./tools/read-change-diff.js";
import { runExistingTests } from "./tools/run-existing-tests.js";
import { runGeneratedTest } from "./tools/run-generated-test.js";
import { runStabilityMatrix } from "./tools/run-stability-matrix.js";
import { collectEvidence } from "./tools/collect-evidence.js";
import { exportResolutionPatch } from "./tools/export-resolution-patch.js";
import { generatePassport } from "./tools/generate-passport.js";

function content(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

export function createJointlyServer(context: ToolContext = createContext()): McpServer {
  const server = new McpServer({ name: "jointly", version: "0.1.0" });

  server.registerTool("register_run", {
    description: "Register a two-change Jointly analysis run from repository refs and prompt paths.",
    inputSchema: z.object({
      baseRef: z.string().min(1),
      changes: z.array(z.object({ id: z.string().min(1), ref: z.string().min(1), promptPath: z.string().min(1) })).length(2),
    }),
  }, async (input) => content(await registerRun(context, input)));

  server.registerTool("prepare_workspaces", {
    description: "Create isolated Base, A, B, and A+B Git workspaces without changing source branches.",
    inputSchema: z.object({ runId: z.string().min(1) }),
  }, async ({ runId }) => content(await prepareWorkspaces(context, runId)));

  server.registerTool("read_change_diff", {
    description: "Read a bounded, redacted diff for one registered change.",
    inputSchema: z.object({ runId: z.string().min(1), changeId: z.string().min(1) }),
  }, async ({ runId, changeId }) => content(await readChangeDiff(context, runId, changeId)));

  server.registerTool("run_existing_tests", {
    description: "Run only the allowlisted configured test command in an isolated workspace.",
    inputSchema: z.object({
      runId: z.string().min(1),
      workspace: z.enum(["base", "change-a", "change-b", "combined"]),
    }),
  }, async ({ runId, workspace }) => content(await runExistingTests(context, runId, workspace)));

  server.registerTool("run_generated_test", {
    description: "Run a generated interaction test and distinguish invalid tests from assertion collisions.",
    inputSchema: z.object({
      runId: z.string().min(1),
      testPath: z.string().min(1),
      hypothesisId: z.string().min(1),
      requirementIds: z.array(z.string().min(1)),
      expected: z.string().min(1),
      evidenceLabel: z.enum(["before-repair", "after-repair"]).optional(),
    }),
  }, async (input) => content(await runGeneratedTest(context, input)));

  server.registerTool("run_stability_matrix", {
    description: "Repeat the configured interaction test with bounded concurrency and a fixed seed.",
    inputSchema: z.object({
      runId: z.string().min(1),
      iterations: z.number().int().min(1).max(100).optional(),
      concurrency: z.number().int().min(1).max(8).optional(),
      seed: z.number().int().positive().optional(),
    }),
  }, async (input) => content(await runStabilityMatrix(context, input)));

  server.registerTool("collect_evidence", {
    description: "Validate run artifacts and link available evidence to requirement IDs.",
    inputSchema: z.object({ runId: z.string().min(1), requirementIds: z.array(z.string()).default([]) }),
  }, async ({ runId, requirementIds }) => content(await collectEvidence(context, runId, requirementIds)));

  server.registerTool("export_resolution_patch", {
    description: "Export uncommitted repair changes from the isolated combined workspace as repair.patch.",
    inputSchema: z.object({ runId: z.string().min(1) }),
  }, async ({ runId }) => content(await exportResolutionPatch(context, runId)));

  server.registerTool("generate_passport", {
    description: "Assemble passport.json and passport.html strictly from persisted run evidence.",
    inputSchema: z.object({
      runId: z.string().min(1),
      verdict: z.enum(PASSPORT_VERDICTS),
      summary: z.string().min(1),
    }),
  }, async (input) => content(await generatePassport(context, input)));

  return server;
}

async function main(): Promise<void> {
  await createJointlyServer().connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`Jointly MCP server failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
