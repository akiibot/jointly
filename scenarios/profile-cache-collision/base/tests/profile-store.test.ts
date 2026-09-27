import { describe, expect, it } from "vitest";
import { ProfileStore } from "../src/profile-store.js";

describe("ProfileStore", () => {
  it("stores defensive copies and advances its revision", () => {
    const store = new ProfileStore();
    const profile = { id: "profile-1", displayName: "Ada" };
    store.save(profile);
    profile.displayName = "mutated outside";
    expect(store.findById("profile-1")).toEqual({ id: "profile-1", displayName: "Ada" });
    expect(store.revision("profile-1")).toBe(1);
  });
});
