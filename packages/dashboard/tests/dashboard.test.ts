import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderDashboard, renderError } from "../src/dashboard";
import { PassportError, parsePassport } from "../src/passport";

describe("dashboard passport rendering", () => {
  it("renders all five screens from a valid passport", async () => {
    const raw = await readFile(path.resolve("public/passport.json"), "utf8");
    const html = renderDashboard(parsePassport(JSON.parse(raw)));
    expect(html).toContain('id="overview"');
    expect(html).toContain('id="intent"');
    expect(html).toContain('id="investigation"');
    expect(html).toContain('id="repair"');
    expect(html).toContain('id="passport"');
    expect(html).toContain("SAFE TO MERGE");
    expect(html).toContain("COUPON-1");
    expect(html).toContain("PAYMENT-3");
  });

  it("rejects malformed passports and provides a safe error state", () => {
    expect(() => parsePassport({ verdict: "SAFE_TO_MERGE" })).toThrow(PassportError);
    const html = renderError("passport.json is missing a valid runId.");
    expect(html).toContain("Passport unavailable");
    expect(html).toContain("Choose passport.json");
  });

  it("escapes passport content before rendering", () => {
    const passport = parsePassport({
      runId: "run-1",
      verdict: "COLLISION_CONFIRMED",
      summary: "<script>alert(1)</script>",
      changes: [
        { id: "a", ref: "agent/a", resolvedCommit: "abc12345" },
        { id: "b", ref: "agent/b", resolvedCommit: "def12345" }
      ]
    });
    const html = renderDashboard(passport);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
