import { describe, expect, it } from "vitest";
import {
  approveCandidate,
  assertHostedRunAccess,
  assertPublicationStillAuthorized,
  candidateDigest,
  PublicationIdempotencyRegistry,
  type CandidateIdentity,
} from "../src/hosted-policy.js";

const principal = { userId: "operator-1", allowedRepositoryIds: ["repo-1"], allowedInstallationIds: ["install-1"] };
const resource = { runId: "run-1", ownerUserId: "operator-1", repositoryId: "repo-1", installationId: "install-1" };
const candidate: CandidateIdentity = {
  runId: "run-1", repositoryId: "repo-1", installationId: "install-1", targetRef: "refs/heads/main",
  targetCommit: "a".repeat(40), changeCommits: ["b".repeat(40), "c".repeat(40)], candidateTree: "d".repeat(40),
  patchDigest: "e".repeat(64), artifactSnapshotDigest: "f".repeat(64), changedFiles: ["src/fix.ts", "tests/interaction/fix.test.ts"],
};

describe("hosted authorization and publication policy", () => {
  it("denies cross-user, cross-repository, and cross-installation access", () => {
    expect(() => assertHostedRunAccess({ ...principal, userId: "other" }, resource)).toThrow("owner mismatch");
    expect(() => assertHostedRunAccess({ ...principal, allowedRepositoryIds: [] }, resource)).toThrow("repository");
    expect(() => assertHostedRunAccess({ ...principal, allowedInstallationIds: [] }, resource)).toThrow("installation");
    expect(() => assertHostedRunAccess(principal, resource)).not.toThrow();
  });

  it("binds approval to exact source, target, tree, patch, artifacts, repository, and operator", () => {
    const approval = approveCandidate(principal, resource, candidate, "2026-09-27T00:00:00.000Z");
    expect(() => assertPublicationStillAuthorized(principal, resource, candidate, approval, {
      targetCommit: candidate.targetCommit, changeCommits: candidate.changeCommits, writeAuthorized: true, installationId: "install-1",
    })).not.toThrow();
    expect(() => assertPublicationStillAuthorized(principal, resource, candidate, approval, {
      targetCommit: "9".repeat(40), changeCommits: candidate.changeCommits, writeAuthorized: true, installationId: "install-1",
    })).toThrow("stale");
    expect(() => assertPublicationStillAuthorized(principal, resource, { ...candidate, patchDigest: "1".repeat(64) }, approval, {
      targetCommit: candidate.targetCommit, changeCommits: candidate.changeCommits, writeAuthorized: true, installationId: "install-1",
    })).toThrow("approval does not match");
  });

  it("rejects privileged paths and makes publication reconciliation idempotent", () => {
    expect(() => candidateDigest({ ...candidate, changedFiles: [".github/workflows/publish.yml"] })).toThrow("privileged");
    expect(() => candidateDigest({ ...candidate, changedFiles: ["../outside"] })).toThrow("invalid path");
    const registry = new PublicationIdempotencyRegistry();
    const digest = candidateDigest(candidate);
    const publication = { branch: "jointly/integration/run-1", pullRequestUrl: "https://github.example/pr/1" };
    registry.record(digest, publication);
    registry.record(digest, publication);
    expect(registry.get(digest)).toEqual(publication);
    expect(() => registry.record(digest, { ...publication, pullRequestUrl: "https://github.example/pr/2" })).toThrow("different");
  });
});
