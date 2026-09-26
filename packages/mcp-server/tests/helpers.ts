import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createContext } from "../src/context.js";
import { registerRun, type RegisterRunInput } from "../src/tools/register-run.js";

const exec = promisify(execFile);
async function git(cwd: string, ...args: string[]): Promise<string> {
  return (await exec("git", args, { cwd })).stdout.trim();
}

export async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "jointly-mcp-"));
  await git(root, "init", "-q", "-b", "main");
  await git(root, "config", "user.email", "test@example.com");
  await git(root, "config", "user.name", "Test");
  await mkdir(path.join(root, "scenarios"), { recursive: true });
  await writeFile(path.join(root, ".gitignore"), "runs/\nnode_modules/\n");
  await writeFile(path.join(root, "base.txt"), "base\n");
  await writeFile(path.join(root, "existing-test.mjs"), "process.exit(0);\n");
  await writeFile(
    path.join(root, "interaction-runner.mjs"),
    "console.error('AssertionError: expected 400 to be 201'); process.exit(1);\n",
  );
  await writeFile(path.join(root, "scenarios", "a.md"), "Add A\n");
  await writeFile(path.join(root, "scenarios", "b.md"), "Add B\n");
  await writeFile(
    path.join(root, "jointly.yaml"),
    `project:\n  name: fixture\n  root: .\nbase:\n  ref: base\nchanges:\n  - id: a\n    ref: agent/a\n    promptFile: scenarios/a.md\n  - id: b\n    ref: agent/b\n    promptFile: scenarios/b.md\ncommands:\n  test: node existing-test.mjs\n  interactionTest: node interaction-runner.mjs\nstability:\n  iterations: 2\n  concurrency: 1\n  seed: 7\n`,
  );
  await git(root, "add", ".");
  await git(root, "commit", "-qm", "base");
  await git(root, "tag", "base");

  await git(root, "checkout", "-qb", "agent/a");
  await writeFile(path.join(root, "a.txt"), "a\n");
  await git(root, "add", "a.txt");
  await git(root, "commit", "-qm", "a");
  await git(root, "checkout", "-q", "main");
  await git(root, "checkout", "-qb", "agent/b");
  await writeFile(path.join(root, "b.txt"), "b\n");
  await git(root, "add", "b.txt");
  await git(root, "commit", "-qm", "b");
  await git(root, "checkout", "-q", "main");

  const context = createContext(root);
  const input: RegisterRunInput = {
    baseRef: "base",
    changes: [
      { id: "a", ref: "agent/a", promptPath: "scenarios/a.md" },
      { id: "b", ref: "agent/b", promptPath: "scenarios/b.md" },
    ],
  };
  return { root, context, input };
}

export async function createRegisteredFixture() {
  const fixture = await createFixture();
  const registration = await registerRun(fixture.context, fixture.input);
  return { ...fixture, registration };
}
