import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { linkEvidence, writeJson } from "../src/evidence.js";

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
});
