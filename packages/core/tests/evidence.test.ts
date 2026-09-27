import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { linkEvidence, readValidatedJson, writeJson } from "../src/evidence.js";
import { intentContractSchema } from "../src/schemas.js";

describe("evidence", () => {
  it("writes formatted JSON under the run root", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-evidence-"));
    await writeJson(root, "intents/a.json", { ok: true });
    expect(JSON.parse(await readFile(path.join(root, "intents/a.json"), "utf8"))).toEqual({ ok: true });
  });

  it("rejects escaping artifact paths and links requirement ids", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-evidence-"));
    await expect(writeJson(root, "../escape.json", {})).rejects.toThrow("run-relative");
    expect(linkEvidence(["PAYMENT-3"], "collision.json")).toEqual([
      { requirementId: "PAYMENT-3", artifact: "collision.json" },
    ]);
  });

  it("rejects persisted JSON that does not match its runtime contract", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jointly-evidence-"));
    await writeJson(root, "intents/a.json", { changeId: "a", requirements: [] });
    await expect(readValidatedJson(root, "intents/a.json", intentContractSchema)).rejects.toThrow(
      "invalid intents/a.json",
    );
  });
});
