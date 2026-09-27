import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { renderLocalMcpConfiguration, runDoctor, setupLocalMcp } from "../src/doctor.js";

const exec = promisify(execFile);

async function git(cwd: string, ...args: string[]) {
  return (await exec("git", args, { cwd })).stdout.trim();
}

async function createDoctorFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "jointly doctor fixture "));
  await git(root, "init", "-q", "-b", "main");
  await git(root, "config", "user.email", "test@example.com");
  await git(root, "config", "user.name", "Test");
  await mkdir(path.join(root, "prompts"), { recursive: true });
  await mkdir(path.join(root, "node_modules"), { recursive: true });
  await mkdir(path.join(root, "packages", "core", "dist"), { recursive: true });
  await mkdir(path.join(root, "packages", "mcp-server", "dist"), { recursive: true });
  await writeFile(path.join(root, "node_modules", ".package-lock.json"), "{}\n");
  await writeFile(path.join(root, "packages", "core", "dist", "cli.js"), "");
  await writeFile(path.join(root, "packages", "mcp-server", "dist", "server.js"), "");
  await writeFile(path.join(root, "prompts", "a.md"), "A\n");
  await writeFile(path.join(root, "prompts", "b.md"), "B\n");
  await writeFile(path.join(root, "base.txt"), "base\n");
  await git(root, "add", ".");
  await git(root, "commit", "-qm", "base");
  await git(root, "tag", "base");
  await git(root, "checkout", "-qb", "a");
  await writeFile(path.join(root, "a.txt"), "a\n");
  await git(root, "add", "a.txt");
  await git(root, "commit", "-qm", "a");
  await git(root, "checkout", "-q", "main");
  await git(root, "checkout", "-qb", "b");
  await writeFile(path.join(root, "b.txt"), "b\n");
  await git(root, "add", "b.txt");
  await git(root, "commit", "-qm", "b");
  await git(root, "checkout", "-q", "main");
  await writeFile(path.join(root, "jointly.yaml"), `project:\n  name: fixture\n  root: .\nbase:\n  ref: base\nchanges:\n  - id: a\n    ref: a\n    promptFile: prompts/a.md\n  - id: b\n    ref: b\n    promptFile: prompts/b.md\ncommands:\n  test: npm test\n  testReport: .jointly/existing.json\n  interactionTest: npm test -- interaction\n  interactionTestReport: .jointly/interaction.json\n`);
  return root;
}

describe("doctor and setup", () => {
  it("separates deterministic readiness from unverified provider access", async () => {
    const root = await createDoctorFixture();
    const report = await runDoctor(root, { nodeVersion: "22.19.0", environment: {} });
    expect(report.deterministicReady).toBe(true);
    expect(report.providerReady).toBe(false);
    expect(report.checks.find((check) => check.id === "provider.watsonx-config")).toMatchObject({ status: "warn" });
  });

  it("blocks unsupported Node and records but does not apply a remote fallback", async () => {
    const root = await createDoctorFixture();
    const aCommit = await git(root, "rev-parse", "a");
    await git(root, "update-ref", "refs/remotes/origin/remote-only", aCommit);
    const configPath = path.join(root, "jointly.yaml");
    await writeFile(configPath, (await readFile(configPath, "utf8")).replace("ref: a\n", "ref: remote-only\n"));
    const report = await runDoctor(root, { nodeVersion: "23.0.0", environment: {} });
    expect(report.deterministicReady).toBe(false);
    expect(report.checks.find((check) => check.id === "runtime.node")?.status).toBe("fail");
    expect(report.checks.find((check) => check.id === "ref.a")?.details).toMatchObject({
      offeredFallback: "origin/remote-only",
      commit: aCommit,
    });
    await expect(git(root, "rev-parse", "--verify", "remote-only")).rejects.toThrow();
  });

  it("generates an idempotent path-safe Bob MCP file and preserves an existing one", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly setup with spaces "));
    const first = await setupLocalMcp(root);
    expect(first).toMatchObject({ artifact: ".bob/mcp.json", created: true, preservedExisting: false });
    const configuration = JSON.parse(await readFile(path.join(root, first.artifact), "utf8"));
    expect(configuration.mcpServers.jointly.cwd).toBe(root);
    expect((await setupLocalMcp(root)).created).toBe(false);
    await writeFile(path.join(root, ".bob", "mcp.json"), '{"mcpServers":{"other":{}}}\n');
    expect(await setupLocalMcp(root)).toMatchObject({
      artifact: ".bob/mcp.generated.json",
      created: true,
      preservedExisting: true,
    });
    expect(await setupLocalMcp(root)).toMatchObject({
      artifact: ".bob/mcp.generated.json",
      created: false,
      preservedExisting: true,
    });
  });

  it("renders Windows paths with spaces without shell quoting or junction assumptions", () => {
    const root = "C:\\Users\\Jointly Developer\\jointly";
    const configuration = JSON.parse(renderLocalMcpConfiguration(root, "C:\\Program Files\\nodejs\\node.exe", path.win32));
    expect(configuration.mcpServers.jointly).toEqual({
      command: "C:\\Program Files\\nodejs\\node.exe",
      args: ["C:\\Users\\Jointly Developer\\jointly\\packages\\mcp-server\\dist\\server.js"],
      cwd: root,
    });
  });
});
