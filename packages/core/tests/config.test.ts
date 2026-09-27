import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/config.js";

const valid = {
  project: { name: "demo", root: "examples/checkout" },
  base: { ref: "main" },
  changes: [
    { id: "a", ref: "a", promptFile: "a.md" },
    { id: "b", ref: "b", promptFile: "b.md" },
  ],
  commands: { test: "npm test" },
};

describe("validateConfig", () => {
  it("accepts the two-change MVP shape", () => {
    expect(validateConfig(valid).changes).toHaveLength(2);
  });

  it("rejects a missing required test command", () => {
    expect(() => validateConfig({ ...valid, commands: {} })).toThrow("commands.test");
  });

  it("rejects more than two changes", () => {
    expect(() => validateConfig({ ...valid, changes: [...valid.changes, valid.changes[0]] })).toThrow("exactly two");
  });

  it("rejects paths that escape the repository", () => {
    expect(() => validateConfig({ ...valid, project: { ...valid.project, root: "../outside" } })).toThrow(
      "repository-relative",
    );
  });

  it("requires a structured report path with the interaction-test command", () => {
    expect(() =>
      validateConfig({
        ...valid,
        commands: { ...valid.commands, interactionTest: "npm test -- --run tests/interaction" },
      }),
    ).toThrow("must be configured together");
    expect(
      validateConfig({
        ...valid,
        commands: {
          ...valid.commands,
          interactionTest: "npm test -- --run tests/interaction --reporter=json",
          interactionTestReport: ".jointly/vitest-report.json",
        },
      }).commands.interactionTestReport,
    ).toBe(".jointly/vitest-report.json");
  });
});
