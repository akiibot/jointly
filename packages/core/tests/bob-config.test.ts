import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const bobRoot = resolve(repositoryRoot, ".bob");

function readRepositoryFile(relativePath: string): string {
  return readFileSync(resolve(repositoryRoot, relativePath), "utf8");
}

function parseFrontmatter(markdown: string): Record<string, unknown> {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error("SKILL.md is missing YAML frontmatter");
  }

  return parse(match[1]) as Record<string, unknown>;
}

describe("IBM Bob project configuration", () => {
  it("defines the merge investigator mode with every required tool group", () => {
    const document = parse(readFileSync(resolve(bobRoot, "custom_modes.yaml"), "utf8")) as {
      customModes?: Array<Record<string, unknown>>;
    };
    const mode = document.customModes?.find((candidate) => candidate.slug === "ai-merge-investigator");

    expect(mode).toBeDefined();
    expect(mode?.name).toBe("Jointly - AI Merge Investigator");
    expect(mode?.groups).toEqual(["read", "edit", "execute", "mcp", "skill", "subagent"]);
    expect(String(mode?.customInstructions)).toContain("test-invalid");
    expect(String(mode?.customInstructions)).toContain("isolated combined");
  });

  it("provides all four alphabetically ordered mode-rule files", () => {
    const ruleFiles = [
      "01-investigation-rules.md",
      "02-test-generation-rules.md",
      "03-repair-rules.md",
      "04-evidence-requirements.md",
    ];

    for (const ruleFile of ruleFiles) {
      expect(readFileSync(resolve(bobRoot, "rules-ai-merge-investigator", ruleFile), "utf8").length).toBeGreaterThan(100);
    }
  });

  it("defines five discoverable project skills with their required support files", () => {
    const skills = [
      ["extract-intent-contract", "intent-schema.json"],
      ["discover-interactions", "collision-checklist.md"],
      ["generate-interaction-tests", "test-quality-checklist.md"],
      ["repair-collision", "repair-policy.md"],
      ["generate-merge-passport", "passport-template.md"],
    ] as const;

    for (const [name, supportFile] of skills) {
      const skillDirectory = resolve(bobRoot, "skills", name);
      const markdown = readFileSync(resolve(skillDirectory, "SKILL.md"), "utf8");
      const frontmatter = parseFrontmatter(markdown);

      expect(frontmatter.name).toBe(name);
      expect(typeof frontmatter.description).toBe("string");
      expect(String(frontmatter.description).length).toBeGreaterThan(20);
      expect(readFileSync(resolve(skillDirectory, supportFile), "utf8").length).toBeGreaterThan(100);
    }
  });

  it("keeps the intent JSON schema aligned with the core IntentContract fields", () => {
    const schema = JSON.parse(
      readRepositoryFile(".bob/skills/extract-intent-contract/intent-schema.json"),
    ) as {
      required: string[];
      properties: { requirements: { items: { $ref: string } } };
      $defs: { intentRequirement: { required: string[]; properties: { type: { enum: string[] } } } };
    };

    expect(schema.required).toEqual([
      "changeId",
      "goal",
      "requirements",
      "entities",
      "sideEffects",
      "ambiguities",
    ]);
    expect(schema.properties.requirements.items.$ref).toBe("#/$defs/intentRequirement");
    expect(schema.$defs.intentRequirement.required).toEqual([
      "id",
      "statement",
      "type",
      "entities",
      "sideEffects",
      "observableOutcome",
      "source",
    ]);
    expect(schema.$defs.intentRequirement.properties.type.enum).toEqual([
      "business-rule",
      "invariant",
      "negative-case",
      "security",
      "compatibility",
    ]);
  });
});

