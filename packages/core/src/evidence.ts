import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

export function assertRelativeArtifactPath(relativePath: string): void {
  if (path.isAbsolute(relativePath) || relativePath.split(/[\\/]/).includes("..")) {
    throw new Error(`artifact path must be run-relative: ${relativePath}`);
  }
}

export async function writeJson(runRoot: string, relativePath: string, value: unknown): Promise<string> {
  assertRelativeArtifactPath(relativePath);
  const destination = path.join(runRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return relativePath;
}

export async function readJson<T>(runRoot: string, relativePath: string): Promise<T> {
  assertRelativeArtifactPath(relativePath);
  return JSON.parse(await readFile(path.join(runRoot, relativePath), "utf8")) as T;
}

export async function writeLog(runRoot: string, relativePath: string, content: string): Promise<string> {
  assertRelativeArtifactPath(relativePath);
  const destination = path.join(runRoot, relativePath);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, content, "utf8");
  return relativePath;
}

export function linkEvidence(requirementIds: string[], artifact: string): Array<{ requirementId: string; artifact: string }> {
  return requirementIds.map((requirementId) => ({ requirementId, artifact }));
}
