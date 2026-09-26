import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCommand } from "../src/runner.js";

describe("runCommand", () => {
  it("captures output, exit code, and truncates the returned summary", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const result = await runCommand({
      cwd: root,
      command: "node -e 'process.stdout.write(\"abcdefghij\")'",
      workspace: "base",
      runRoot: root,
      maxCaptureBytes: 5,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("abcde");
    expect(result.stdout).toContain("truncated");
    expect(result.stdoutArtifact).toMatch(/\.stdout\.log$/);
  });

  it("enforces timeouts", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-runner-"));
    const result = await runCommand({
      cwd: root,
      command: "node -e 'setTimeout(() => {}, 5000)'",
      workspace: "base",
      runRoot: root,
      timeoutMs: 30,
    });
    expect(result.timedOut).toBe(true);
    expect(result.exitCode).toBeNull();
  });
});
