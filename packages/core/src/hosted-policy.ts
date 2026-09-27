import { sha256 } from "./manifest.js";

export interface HostedPrincipal {
  userId: string;
  allowedRepositoryIds: string[];
  allowedInstallationIds: string[];
}

export interface HostedRunResource {
  runId: string;
  ownerUserId: string;
  repositoryId: string;
  installationId: string;
}

export interface CandidateIdentity {
  runId: string;
  repositoryId: string;
  installationId: string;
  targetRef: string;
  targetCommit: string;
  changeCommits: [string, string];
  candidateTree: string;
  patchDigest: string;
  artifactSnapshotDigest: string;
  changedFiles: string[];
}

export interface PublicationApproval {
  schemaVersion: "1";
  approvedBy: string;
  approvedAt: string;
  candidateDigest: string;
}

const gitObject = /^[a-f0-9]{40,64}$/;
const privilegedPath = /^(?:\.github\/workflows\/|\.git\/|\.env(?:\.|$)|.*(?:credential|secret)(?:s)?(?:\/|\.|$))/i;

function required(value: string, label: string): void {
  if (!value || value.length > 1_000) throw new Error(`${label} is invalid`);
}

export function assertHostedRunAccess(principal: HostedPrincipal, resource: HostedRunResource): void {
  required(principal.userId, "userId");
  if (resource.ownerUserId !== principal.userId) throw new Error("run access denied: owner mismatch");
  if (!principal.allowedRepositoryIds.includes(resource.repositoryId)) throw new Error("run access denied: repository is not authorized");
  if (!principal.allowedInstallationIds.includes(resource.installationId)) throw new Error("run access denied: installation is not authorized");
}

export function candidateDigest(candidate: CandidateIdentity): string {
  required(candidate.runId, "runId");
  required(candidate.repositoryId, "repositoryId");
  required(candidate.installationId, "installationId");
  required(candidate.targetRef, "targetRef");
  for (const [label, value] of [
    ["targetCommit", candidate.targetCommit], ["changeCommitA", candidate.changeCommits[0]],
    ["changeCommitB", candidate.changeCommits[1]], ["candidateTree", candidate.candidateTree],
    ["patchDigest", candidate.patchDigest], ["artifactSnapshotDigest", candidate.artifactSnapshotDigest],
  ] as const) if (!gitObject.test(value) && !/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} is not a full digest`);
  if (candidate.changedFiles.length === 0) throw new Error("candidate has no changed files");
  const normalizedFiles = candidate.changedFiles.map((file) => file.replace(/\\/g, "/"));
  if (normalizedFiles.some((file) => !file || file.startsWith("/") || file.split("/").includes(".."))) throw new Error("candidate contains an invalid path");
  if (normalizedFiles.some((file) => privilegedPath.test(file))) throw new Error("candidate modifies a privileged path");
  return sha256(JSON.stringify({ ...candidate, changedFiles: [...normalizedFiles].sort() }));
}

export function approveCandidate(principal: HostedPrincipal, resource: HostedRunResource, candidate: CandidateIdentity, approvedAt = new Date().toISOString()): PublicationApproval {
  assertHostedRunAccess(principal, resource);
  if (candidate.runId !== resource.runId || candidate.repositoryId !== resource.repositoryId || candidate.installationId !== resource.installationId) {
    throw new Error("candidate is not bound to the authorized run");
  }
  return { schemaVersion: "1", approvedBy: principal.userId, approvedAt, candidateDigest: candidateDigest(candidate) };
}

export function assertPublicationStillAuthorized(
  principal: HostedPrincipal,
  resource: HostedRunResource,
  candidate: CandidateIdentity,
  approval: PublicationApproval,
  current: { targetCommit: string; changeCommits: [string, string]; writeAuthorized: boolean; installationId: string },
): void {
  assertHostedRunAccess(principal, resource);
  if (!current.writeAuthorized) throw new Error("publication denied: write permission is not current");
  if (current.installationId !== candidate.installationId) throw new Error("publication denied: installation changed");
  if (approval.approvedBy !== principal.userId || approval.candidateDigest !== candidateDigest(candidate)) throw new Error("publication denied: approval does not match the candidate");
  if (current.targetCommit !== candidate.targetCommit || current.changeCommits.some((commit, index) => commit !== candidate.changeCommits[index])) {
    throw new Error("publication denied: source or target revision is stale");
  }
}

export class PublicationIdempotencyRegistry {
  private readonly publications = new Map<string, { branch: string; pullRequestUrl: string }>();

  record(candidateIdentityDigest: string, publication: { branch: string; pullRequestUrl: string }): void {
    const existing = this.publications.get(candidateIdentityDigest);
    if (existing && (existing.branch !== publication.branch || existing.pullRequestUrl !== publication.pullRequestUrl)) {
      throw new Error("candidate already has a different publication result");
    }
    this.publications.set(candidateIdentityDigest, { ...publication });
  }

  get(candidateIdentityDigest: string): { branch: string; pullRequestUrl: string } | undefined {
    const existing = this.publications.get(candidateIdentityDigest);
    return existing ? { ...existing } : undefined;
  }
}
