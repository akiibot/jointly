import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand } from "../src/runner.js";

describe("runCommand", () => {
  it("captures output, exit code, and truncates the returned summary", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const result = await runCommand({
      cwd: root,
      command: "node -e \"process.stdout.write('abcdefghij')\"",
      workspace: "base",
      runRoot: root,
      maxCaptureBytes: 5,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("abcde");
    expect(result.stdout).toContain("truncated");
    expect(result.stdoutArtifact).toMatch(/\.stdout\.log$/);
  });

  it("bounds persisted logs while preserving a truncation marker", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const result = await runCommand({
      cwd: root,
      command: "node -e \"process.stdout.write('x'.repeat(10000))\"",
      workspace: "base",
      runRoot: root,
      maxCaptureBytes: 32,
      maxLogBytes: 128,
    });
    const persisted = await import("node:fs/promises").then(({ readFile }) =>
      readFile(path.join(root, result.stdoutArtifact), "utf8"),
    );
    expect(Buffer.byteLength(persisted)).toBeLessThan(200);
    expect(persisted).toContain("log truncated");
  });

  it("enforces timeouts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const result = await runCommand({
      cwd: root,
      command: "node -e \"setTimeout(() => {}, 5000)\"",
      workspace: "base",
      runRoot: root,
      timeoutMs: 30,
    });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
    expect(result.durationMs).toBeLessThan(2_000);
  }, 10_000);

  it("cancels a process tree and preserves its logs", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-cancel-"));
    const controller = new AbortController();
    const pending = runCommand({
      cwd: root,
      command: "node -e \"process.stdout.write('started'); setInterval(() => {}, 1000)\"",
      workspace: "combined",
      runRoot: root,
      commandId: "cancelled-command",
      timeoutMs: 5_000,
      signal: controller.signal,
    });
    setTimeout(() => controller.abort(), 300);
    const result = await pending;
    expect(result).toMatchObject({ exitCode: null, timedOut: false, terminationReason: "cancelled" });
    expect(result.stdout).toContain("started");
    expect(await readFile(path.join(root, result.stdoutArtifact), "utf8")).toContain("started");
  });

  it.skipIf(process.platform === "win32")("records signal termination", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const result = await runCommand({
      cwd: root,
      command: "node -e \"process.kill(process.pid, 'SIGTERM')\"",
      workspace: "base",
      runRoot: root,
    });
    expect(result.exitCode).toBeNull();
    expect(result.signal).toBe("SIGTERM");
    expect(result.terminationReason).toBe("signal");
  });

  it("does not inherit parent credentials and records approved environment names", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const canaryName = "WATSONX_API_KEY";
    const previousCanary = process.env[canaryName];
    process.env[canaryName] = "jointly-parent-canary";

    try {
      const result = await runCommand({
        cwd: root,
        command:
          "node -e \"process.stdout.write(JSON.stringify({canary:process.env.WATSONX_API_KEY,seed:process.env.JOINTLY_SEED,home:process.env.HOME}))\"",
        workspace: "base",
        runRoot: root,
        env: { JOINTLY_SEED: "20260926" },
      });

      const observed = JSON.parse(result.stdout) as { canary?: string; seed?: string; home?: string };
      expect(observed.canary).toBeUndefined();
      expect(observed.seed).toBe("20260926");
      expect(observed.home).toContain("runtime-environment");
      expect(result.environmentPolicy).toEqual(
        expect.objectContaining({
          version: "1",
          explicitNames: ["JOINTLY_SEED"],
        }),
      );
      expect(JSON.stringify(result.environmentPolicy)).not.toContain("jointly-parent-canary");
    } finally {
      if (previousCanary === undefined) delete process.env[canaryName];
      else process.env[canaryName] = previousCanary;
    }
  });

  it("rejects explicitly supplied credential-like variables", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    await expect(
      runCommand({
        cwd: root,
        command: "node --version",
        workspace: "base",
        runRoot: root,
        env: { GITHUB_TOKEN: "must-not-reach-child" },
      }),
    ).rejects.toThrow("forbidden by policy: GITHUB_TOKEN");
  });
});
