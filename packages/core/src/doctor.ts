import { execFile } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { loadConfig } from "./config.js";
import { commonBase, resolveRef } from "./git.js";

const exec = promisify(execFile);

export type DoctorStatus = "pass" | "warn" | "fail";
export interface DoctorCheck {
  id: string;
  status: DoctorStatus;
  message: string;
  details?: Record<string, unknown>;
}

export interface DoctorReport {
  schemaVersion: "1";
  repositoryRoot: string;
  deterministicReady: boolean;
  providerReady: false;
  checks: DoctorCheck[];
}

async function exists(filename: string): Promise<boolean> {
  try {
    await access(filename);
    return true;
  } catch {
    return false;
  }
}

async function executableVersion(command: string, args: string[]): Promise<string | undefined> {
  try {
    return (await exec(command, args, { timeout: 10_000 })).stdout.trim();
  } catch {
    return undefined;
  }
}

export async function runDoctor(
  repositoryRoot: string,
  options: { nodeVersion?: string; environment?: NodeJS.ProcessEnv } = {},
): Promise<DoctorReport> {
  const root = path.resolve(repositoryRoot);
  const checks: DoctorCheck[] = [];
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  checks.push({
    id: "runtime.node",
    status: /^22\.19\./.test(nodeVersion) ? "pass" : "fail",
    message: /^22\.19\./.test(nodeVersion)
      ? `Node ${nodeVersion} matches the pinned 22.19.x release line.`
      : `Node ${nodeVersion} is unsupported; install the pinned 22.19.x release.`,
  });

  const [gitVersion, npmVersion] = await Promise.all([
    executableVersion("git", ["--version"]),
    executableVersion("npm", ["--version"]),
  ]);
  checks.push({ id: "tool.git", status: gitVersion ? "pass" : "fail", message: gitVersion ?? "Git is not executable." });
  checks.push({ id: "tool.npm", status: npmVersion ? "pass" : "fail", message: npmVersion ? `npm ${npmVersion}` : "npm is not executable." });

  checks.push({
    id: "dependencies.installed",
    status: await exists(path.join(root, "node_modules", ".package-lock.json")) ? "pass" : "fail",
    message: await exists(path.join(root, "node_modules", ".package-lock.json"))
      ? "Locked dependencies are installed."
      : "Dependencies are missing; run npm install from the repository root.",
  });

  const buildArtifacts = [
    "packages/core/dist/cli.js",
    "packages/mcp-server/dist/server.js",
  ];
  const missingBuildArtifacts = [];
  for (const artifact of buildArtifacts) if (!(await exists(path.join(root, artifact)))) missingBuildArtifacts.push(artifact);
  checks.push({
    id: "build.artifacts",
    status: missingBuildArtifacts.length === 0 ? "pass" : "fail",
    message: missingBuildArtifacts.length === 0
      ? "Core and MCP build artifacts are present."
      : `Build artifacts are missing: ${missingBuildArtifacts.join(", ")}. Run npm run build.`,
  });

  let config;
  try {
    config = await loadConfig(path.join(root, "jointly.yaml"));
    checks.push({ id: "config.schema", status: "pass", message: "jointly.yaml is valid." });
  } catch (error) {
    checks.push({ id: "config.schema", status: "fail", message: error instanceof Error ? error.message : String(error) });
  }

  if (config) {
    const projectPath = path.join(root, config.project.root);
    let projectDirectory = false;
    try {
      projectDirectory = (await stat(projectPath)).isDirectory();
    } catch {}
    checks.push({
      id: "config.project-root",
      status: projectDirectory ? "pass" : "fail",
      message: projectDirectory ? `Project root exists: ${config.project.root}` : `Project root is missing: ${config.project.root}`,
    });

    const missingPrompts = [];
    for (const change of config.changes) if (!(await exists(path.join(root, change.promptFile)))) missingPrompts.push(change.promptFile);
    checks.push({
      id: "config.prompts",
      status: missingPrompts.length === 0 ? "pass" : "fail",
      message: missingPrompts.length === 0 ? "Both prompt files exist." : `Prompt files are missing: ${missingPrompts.join(", ")}`,
    });

    const resolved = new Map<string, string>();
    for (const [label, configuredRef] of [["base", config.base.ref], ...config.changes.map((change) => [change.id, change.ref])] as Array<[string, string]>) {
      try {
        resolved.set(label, await resolveRef(root, configuredRef));
        checks.push({ id: `ref.${label}`, status: "pass", message: `${configuredRef} resolves.` });
      } catch {
        const fallback = configuredRef.startsWith("origin/") ? undefined : `origin/${configuredRef}`;
        let fallbackCommit: string | undefined;
        if (fallback) {
          try { fallbackCommit = await resolveRef(root, fallback); } catch {}
        }
        checks.push({
          id: `ref.${label}`,
          status: "fail",
          message: fallbackCommit
            ? `${configuredRef} is missing; ${fallback} resolves to ${fallbackCommit.slice(0, 12)}. Update jointly.yaml explicitly; no ref was fetched, switched, or reinterpreted.`
            : `${configuredRef} does not resolve locally. Fetch or configure an exact ref explicitly.`,
          ...(fallbackCommit ? { details: { configuredRef, offeredFallback: fallback, commit: fallbackCommit } } : {}),
        });
      }
    }
    const base = resolved.get("base");
    const left = resolved.get(config.changes[0].id);
    const right = resolved.get(config.changes[1].id);
    if (base && left && right) {
      const mergeBase = await commonBase(root, left, right);
      checks.push({
        id: "refs.common-base",
        status: mergeBase === base ? "pass" : "fail",
        message: mergeBase === base
          ? "Both changes share the configured frozen base."
          : `Change common base ${mergeBase.slice(0, 12)} differs from configured base ${base.slice(0, 12)}.`,
      });
    } else {
      checks.push({ id: "refs.common-base", status: "fail", message: "Common base cannot be verified until all refs resolve." });
    }

    const reportsReady = Boolean(config.commands.testReport && config.commands.interactionTest && config.commands.interactionTestReport);
    checks.push({
      id: "config.structured-reports",
      status: reportsReady ? "pass" : "fail",
      message: reportsReady
        ? "Existing and generated tests have structured report paths."
        : "testReport, interactionTest, and interactionTestReport are required for evidence-safe classification.",
    });
  }

  const environment = options.environment ?? process.env;
  const providerNames = [
    "WATSONX_API_KEY",
    "WATSONX_SERVICE_URL",
    "WATSONX_PROJECT_ID",
    "WATSONX_MODEL_ID",
    "WATSONX_API_VERSION",
  ];
  const presentProviderNames = providerNames.filter((name) => Boolean(environment[name]));
  checks.push({
    id: "provider.watsonx-config",
    status: "warn",
    message: presentProviderNames.length === providerNames.length
      ? "All named watsonx settings are present, but live authentication/model access is unverified and the participant-owned adapter is pending."
      : `watsonx configuration is incomplete (${presentProviderNames.length}/${providerNames.length} names present); deterministic readiness is unaffected.`,
    details: { presentNames: presentProviderNames, missingNames: providerNames.filter((name) => !presentProviderNames.includes(name)), valuesRedacted: true },
  });
  checks.push({
    id: "developer.bob-mode",
    status: await exists(path.join(root, ".bob", "mcp.json")) ? "pass" : "warn",
    message: await exists(path.join(root, ".bob", "mcp.json"))
      ? "Local Bob MCP configuration exists; IDE discovery remains a manual check."
      : "Optional Bob IDE mode needs a generated local .bob/mcp.json; run jointly setup.",
  });

  return {
    schemaVersion: "1",
    repositoryRoot: root,
    deterministicReady: checks.every((check) => check.status !== "fail"),
    providerReady: false,
    checks,
  };
}

export function renderLocalMcpConfiguration(
  root: string,
  executable = process.execPath,
  paths: { join(...parts: string[]): string } = path,
): string {
  return `${JSON.stringify({
    mcpServers: {
      jointly: {
        command: executable,
        args: [paths.join(root, "packages", "mcp-server", "dist", "server.js")],
        cwd: root,
      },
    },
  }, null, 2)}\n`;
}

export async function setupLocalMcp(repositoryRoot: string): Promise<{ artifact: string; created: boolean; preservedExisting: boolean }> {
  const root = path.resolve(repositoryRoot);
  const bobDirectory = path.join(root, ".bob");
  await mkdir(bobDirectory, { recursive: true });
  const configuration = renderLocalMcpConfiguration(root);
  const primary = path.join(bobDirectory, "mcp.json");
  if (await exists(primary)) {
    if (await readFile(primary, "utf8") === configuration) {
      return { artifact: path.relative(root, primary), created: false, preservedExisting: false };
    }
    const generated = path.join(bobDirectory, "mcp.generated.json");
    if (await exists(generated) && await readFile(generated, "utf8") === configuration) {
      return { artifact: path.relative(root, generated), created: false, preservedExisting: true };
    }
    await writeFile(generated, configuration, { encoding: "utf8", flag: "w" });
    return { artifact: path.relative(root, generated), created: true, preservedExisting: true };
  }
  await writeFile(primary, configuration, { encoding: "utf8", flag: "wx" });
  return { artifact: path.relative(root, primary), created: true, preservedExisting: false };
}
