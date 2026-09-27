import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import type { JointlyConfig } from "./types.js";

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} is required`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return Number(value);
}

function relativePath(value: unknown, label: string): string {
  const parsed = text(value, label);
  if (path.isAbsolute(parsed) || parsed.split(/[\\/]/).includes("..")) {
    throw new Error(`${label} must be repository-relative`);
  }
  return parsed;
}

export function validateConfig(raw: unknown): JointlyConfig {
  const root = object(raw, "config");
  const project = object(root.project, "project");
  const base = object(root.base, "base");
  const commands = object(root.commands, "commands");
  if (!Array.isArray(root.changes) || root.changes.length !== 2) {
    throw new Error("changes must contain exactly two entries for the MVP");
  }

  const changes = root.changes.map((entry, index) => {
    const change = object(entry, `changes[${index}]`);
    return {
      id: text(change.id, `changes[${index}].id`),
      ref: text(change.ref, `changes[${index}].ref`),
      promptFile: relativePath(change.promptFile, `changes[${index}].promptFile`),
    };
  });
  if (changes[0].id === changes[1].id) throw new Error("change ids must be unique");

  const config: JointlyConfig = {
    project: {
      name: text(project.name, "project.name"),
      root: relativePath(project.root, "project.root"),
    },
    base: { ref: text(base.ref, "base.ref") },
    changes,
    commands: {
      test: text(commands.test, "commands.test"),
      ...(typeof commands.testReport === "string"
        ? { testReport: relativePath(commands.testReport, "commands.testReport") }
        : {}),
      ...(typeof commands.install === "string" ? { install: commands.install } : {}),
      ...(typeof commands.build === "string" ? { build: commands.build } : {}),
      ...(typeof commands.interactionTest === "string"
        ? { interactionTest: commands.interactionTest }
        : {}),
      ...(typeof commands.interactionTestReport === "string"
        ? {
            interactionTestReport: relativePath(
              commands.interactionTestReport,
              "commands.interactionTestReport",
            ),
          }
        : {}),
    },
  };

  if (root.stability !== undefined) {
    const stability = object(root.stability, "stability");
    config.stability = {
      iterations: positiveInteger(stability.iterations, "stability.iterations"),
      concurrency: positiveInteger(stability.concurrency, "stability.concurrency"),
      seed: positiveInteger(stability.seed, "stability.seed"),
    };
  }
  if (Boolean(config.commands.interactionTest) !== Boolean(config.commands.interactionTestReport)) {
    throw new Error("commands.interactionTest and commands.interactionTestReport must be configured together");
  }
  return config;
}

export async function loadConfig(configPath: string): Promise<JointlyConfig> {
  const absolute = path.resolve(configPath);
  const content = await readFile(absolute, "utf8");
  return validateConfig(YAML.parse(content));
}
