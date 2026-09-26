import { describe, expect, it } from "vitest";
import { createRunId } from "../src/manifest.js";

describe("createRunId", () => {
  it("is timestamped and unique", () => {
    const now = new Date("2026-09-26T10:00:00.000Z");
    expect(createRunId(now, "a")).not.toBe(createRunId(now, "b"));
    expect(createRunId(now, "a")).toMatch(/^20260926T100000Z-[a-f0-9]{8}$/);
  });
});
