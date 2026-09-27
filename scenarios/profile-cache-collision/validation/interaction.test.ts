import { describe, expect, it } from "vitest";
import { CachedProfileReader } from "../src/cached-profile-reader.js";
import { ProfileService } from "../src/profile-service.js";
import { ProfileStore } from "../src/profile-store.js";

describe("profile update and cache interaction", () => {
  it("refreshes a cached profile after a display-name update", () => {
    const store = new ProfileStore();
    store.save({ id: "profile-1", displayName: "Ada" });
    const reader = new CachedProfileReader(store);
    const service = new ProfileService(store);

    expect(reader.read("profile-1")?.displayName).toBe("Ada");
    service.updateDisplayName("profile-1", "Grace");
    expect(reader.read("profile-1")?.displayName).toBe("Grace");
  });
});
