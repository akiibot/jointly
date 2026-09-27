import { access } from "node:fs/promises";
import { readJson, writeJson } from "./evidence.js";
import { verifyRunInputIntegrity, type RunInputIntegrity } from "./provenance.js";
import { sha256 } from "./manifest.js";
import { verifyExecutionFingerprint } from "./execution-records.js";
import { PASSPORT_VERDICTS, type PassportVerdict, type RunManifest } from "./types.js";
import { parseRunManifestArtifact } from "./schemas.js";

export interface PassportInput {
  verdict: PassportVerdict;
  verificationBasis?: "repaired-collision" | "compatible-pair";
  summary: string;
  requirements?: unknown[];
  intents?: unknown[];
  hypotheses?: unknown;
  testResults?: unknown;
  collisionEvidence?: unknown;
  runtimeDiagnosis?: unknown;
  repairReview?: unknown;
  repair?: unknown;
  repairMetadata?: unknown;
  repairSummary?: string;
  stability?: unknown;
  evidenceSummary?: unknown;
  requirementResolutions?: unknown;
  workspaceStateDigests?: Partial<Record<"base" | "change-a" | "change-b" | "combined", string>>;
}

function validateIntentContracts(
  intents: unknown[] | undefined,
  manifest: RunManifest,
): { valid: boolean; requirementIds: Set<string> } {
  if (!intents || intents.length !== 2) return { valid: false, requirementIds: new Set() };
  const expectedChanges = new Set(manifest.changes.map((change) => change.id));
  const seenChanges = new Set<string>();
  const requirementIds = new Set<string>();
  for (const value of intents) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, requirementIds };
    const intent = value as { changeId?: unknown; requirements?: unknown };
    if (typeof intent.changeId !== "string" || !expectedChanges.has(intent.changeId) || seenChanges.has(intent.changeId)) {
      return { valid: false, requirementIds };
    }
    seenChanges.add(intent.changeId);
    if (!Array.isArray(intent.requirements) || intent.requirements.length === 0) {
      return { valid: false, requirementIds };
    }
    for (const value of intent.requirements) {
      if (!value || typeof value !== "object" || Array.isArray(value)) return { valid: false, requirementIds };
      const requirement = value as { id?: unknown; statement?: unknown; source?: unknown };
      if (
        typeof requirement.id !== "string" ||
        requirement.id.length === 0 ||
        requirementIds.has(requirement.id) ||
        typeof requirement.statement !== "string" ||
        !requirement.source ||
        typeof requirement.source !== "object" ||
        typeof (requirement.source as { file?: unknown }).file !== "string" ||
        typeof (requirement.source as { excerpt?: unknown }).excerpt !== "string"
      ) {
        return { valid: false, requirementIds };
      }
      requirementIds.add(requirement.id);
    }
  }
  return { valid: seenChanges.size === expectedChanges.size, requirementIds };
}

export interface MergeSafetyPassport extends PassportInput {
  schemaVersion: "2";
  runId: string;
  generatedAt: string;
  changes: RunManifest["changes"];
  inputIntegrity: RunInputIntegrity;
  verificationGates: {
    passed: boolean;
    failures: string[];
  };
}

export function assertVerdict(value: string): asserts value is PassportVerdict {
  if (!(PASSPORT_VERDICTS as readonly string[]).includes(value)) {
    throw new Error(`unsupported passport verdict: ${value}`);
  }
}

async function fileExists(runRoot: string, relativePath: string): Promise<boolean> {
  try {
    await access(`${runRoot}/${relativePath}`);
    return true;
  } catch {
    return false;
  }
}

async function evaluateSafeEvidence(
  input: PassportInput,
  manifest: RunManifest,
  inputIntegrity: RunInputIntegrity,
): Promise<{ passed: boolean; failures: string[] }> {
  const rawTestResults = input.testResults as
    | Record<string, unknown>
    | undefined;
  const basis = input.verificationBasis ?? "repaired-collision";
  const testResults = (
    rawTestResults?.schemaVersion === "2" && rawTestResults.beforeRepair
      ? basis === "repaired-collision"
        ? rawTestResults.afterRepair
        : rawTestResults.beforeRepair
      : rawTestResults
  ) as
    | Record<
        string,
        {
          exitCode?: number;
          timedOut?: boolean;
          testCounts?: { total?: number; passed?: number; failed?: number };
        }
      >
    | undefined;
  const requiredWorkspaces = ["base", "change-a", "change-b", "combined"];
  const existingPassed = requiredWorkspaces.every((workspace) => {
    const result = testResults?.[workspace];
    return (
      result?.exitCode === 0 &&
      result.timedOut === false &&
      Number(result.testCounts?.total) > 0 &&
      Number(result.testCounts?.passed) > 0 &&
      result.testCounts?.failed === 0
    );
  });
  const fingerprintPhase = basis === "repaired-collision" ? "afterRepair" : "beforeRepair";
  const fingerprints = rawTestResults?.schemaVersion === "2"
    ? (rawTestResults as {
        fingerprints?: Record<string, Record<string, import("./types.js").ExecutionFingerprint>>;
      }).fingerprints?.[fingerprintPhase]
    : undefined;
  const expectedResolutionDigest = input.requirementResolutions
    ? sha256(JSON.stringify(input.requirementResolutions))
    : undefined;
  const expectedRepairDigest = input.repairMetadata
    ? sha256(JSON.stringify(input.repairMetadata))
    : undefined;
  const expectedIntentContractsDigest = input.intents ? sha256(JSON.stringify(input.intents)) : undefined;
  const expectedHypothesesDigest = input.hypotheses ? sha256(JSON.stringify(input.hypotheses)) : undefined;
  const executionFingerprintsValid = requiredWorkspaces.every((workspace) => {
    const fingerprint = fingerprints?.[workspace];
    const currentWorkspaceState = input.workspaceStateDigests?.[
      workspace as keyof NonNullable<PassportInput["workspaceStateDigests"]>
    ];
    return Boolean(
      fingerprint &&
      typeof currentWorkspaceState === "string" &&
      verifyExecutionFingerprint(fingerprint) &&
      fingerprint.runId === manifest.runId &&
      fingerprint.configDigest === manifest.configDigest &&
      fingerprint.intentContractsDigest === expectedIntentContractsDigest &&
      fingerprint.hypothesesDigest === expectedHypothesesDigest &&
      fingerprint.workspaceStateDigest === currentWorkspaceState &&
      fingerprint.requirementResolutionsDigest === expectedResolutionDigest &&
      (basis !== "repaired-collision" || fingerprint.repairCandidateDigest === expectedRepairDigest),
    );
  });
  const collisionEvidence = input.collisionEvidence as {
    beforeRepair?: {
      hypothesisId?: string;
      classification?: string;
      requirementIds?: string[];
      testFile?: string;
      testCounts?: { total?: number; passed?: number; failed?: number };
    };
    afterRepair?: { classification?: string; commandResult?: { exitCode?: number; timedOut?: boolean } };
  } | undefined;
  const beforeConfirmed = collisionEvidence?.beforeRepair?.classification === "confirmed-collision";
  const beforeCompatible =
    collisionEvidence?.beforeRepair?.classification === "hypothesis-rejected" &&
    Number(collisionEvidence.beforeRepair.testCounts?.total) > 0 &&
    Number(collisionEvidence.beforeRepair.testCounts?.passed) > 0;
  const afterPassed =
    collisionEvidence?.afterRepair?.classification === "hypothesis-rejected" &&
    collisionEvidence.afterRepair.commandResult?.exitCode === 0 &&
    collisionEvidence.afterRepair.commandResult?.timedOut === false;
  const stability = input.stability as {
    iterations?: number;
    passed?: number;
    failed?: number;
    executions?: Array<{ iteration?: number; inputs?: import("./types.js").ExecutionFingerprint }>;
  } | undefined;
  const stabilityPassed =
    typeof stability?.iterations === "number" &&
    stability.iterations > 0 &&
    stability.failed === 0 &&
    stability.passed === stability.iterations &&
    stability.iterations === manifest.stability?.iterations &&
    (stability as { concurrency?: number }).concurrency === manifest.stability?.concurrency &&
    (stability as { seed?: number }).seed === manifest.stability?.seed;
  const beforeTestDigest = collisionEvidence?.beforeRepair &&
    "executedTestDigest" in collisionEvidence.beforeRepair
    ? (collisionEvidence.beforeRepair as { executedTestDigest?: unknown }).executedTestDigest
    : undefined;
  const stabilityFingerprintsValid = Boolean(
    stabilityPassed &&
    Array.isArray(stability?.executions) &&
    stability.executions.length === stability.iterations &&
    stability.executions.every((execution, index) => {
      const fingerprint = execution.inputs;
      return Boolean(
        execution.iteration === index + 1 &&
        fingerprint &&
        verifyExecutionFingerprint(fingerprint) &&
        fingerprint.runId === manifest.runId &&
        fingerprint.configDigest === manifest.configDigest &&
        fingerprint.intentContractsDigest === expectedIntentContractsDigest &&
        fingerprint.hypothesesDigest === expectedHypothesesDigest &&
        fingerprint.workspace === "combined" &&
        fingerprint.workspaceStateDigest === input.workspaceStateDigests?.combined &&
        fingerprint.testSourceDigest === beforeTestDigest &&
        fingerprint.requirementResolutionsDigest === expectedResolutionDigest &&
        (basis !== "repaired-collision" || fingerprint.repairCandidateDigest === expectedRepairDigest)
      );
    })
  );
  const intentValidation = validateIntentContracts(input.intents, manifest);
  const requirementStatements = new Map<string, string>();
  for (const intent of input.intents ?? []) {
    if (!intent || typeof intent !== "object") continue;
    const requirements = (intent as { requirements?: unknown }).requirements;
    if (!Array.isArray(requirements)) continue;
    for (const requirement of requirements) {
      if (!requirement || typeof requirement !== "object") continue;
      const { id, statement } = requirement as { id?: unknown; statement?: unknown };
      if (typeof id === "string" && typeof statement === "string") requirementStatements.set(id, statement);
    }
  }
  const linkedRequirements = collisionEvidence?.beforeRepair?.requirementIds;
  const requirementsLinked =
    Array.isArray(linkedRequirements) &&
    linkedRequirements.length > 0 &&
    linkedRequirements.every((id) => intentValidation.requirementIds.has(id));
  const hypothesisList = Array.isArray(input.hypotheses)
    ? input.hypotheses
    : input.hypotheses && typeof input.hypotheses === "object" && "hypotheses" in input.hypotheses
      ? (input.hypotheses as { hypotheses?: unknown }).hypotheses
      : undefined;
  const linkedHypothesis = Array.isArray(hypothesisList)
    ? hypothesisList.find(
        (value) =>
          value &&
          typeof value === "object" &&
          (value as { id?: unknown }).id === collisionEvidence?.beforeRepair?.hypothesisId,
      ) as
        | {
            changeIds?: unknown;
            requirementIds?: unknown;
            scenario?: unknown;
            conflictingRequirementIds?: unknown;
          }
        | undefined
    : undefined;
  const hypothesisChangeIds = Array.isArray(linkedHypothesis?.changeIds)
    ? linkedHypothesis.changeIds.filter((id): id is string => typeof id === "string")
    : [];
  const hypothesisRequirementIds = Array.isArray(linkedHypothesis?.requirementIds)
    ? linkedHypothesis.requirementIds.filter((id): id is string => typeof id === "string")
    : [];
  const hypothesisLinked = Boolean(
    linkedHypothesis &&
      hypothesisChangeIds.length === 2 &&
      manifest.changes.every((change) => hypothesisChangeIds.includes(change.id)) &&
      linkedRequirements?.every((id) => hypothesisRequirementIds.includes(id)) &&
      Array.isArray(linkedHypothesis.scenario) &&
      linkedHypothesis.scenario.length > 0,
  );
  const diagnosis = input.runtimeDiagnosis as {
    schemaVersion?: unknown;
    hypothesisId?: unknown;
    requirementIds?: unknown;
    interpretation?: unknown;
    evidenceArtifact?: unknown;
    citations?: unknown;
  } | undefined;
  const diagnosisRequirementIds = Array.isArray(diagnosis?.requirementIds)
    ? diagnosis.requirementIds.filter((id): id is string => typeof id === "string")
    : [];
  const runtimeDiagnosisValid = !beforeConfirmed || Boolean(
    diagnosis?.schemaVersion === "1" &&
      diagnosis.hypothesisId === collisionEvidence?.beforeRepair?.hypothesisId &&
      typeof diagnosis.interpretation === "string" && diagnosis.interpretation.length > 0 &&
      diagnosis.evidenceArtifact === "collision-evidence.before-repair.json" &&
      linkedRequirements?.every((id) => diagnosisRequirementIds.includes(id)) &&
      Array.isArray(diagnosis.citations) && diagnosis.citations.length > 0,
  );
  const conflictIds = Array.isArray(linkedHypothesis?.conflictingRequirementIds)
    ? linkedHypothesis.conflictingRequirementIds.filter((id): id is string => typeof id === "string")
    : [];
  const resolutions = Array.isArray(input.requirementResolutions) ? input.requirementResolutions : [];
  const conflictResolved =
    conflictIds.length === 0 ||
    resolutions.some((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      const resolution = value as {
        schemaVersion?: unknown;
        conflictingRequirementIds?: unknown;
        decision?: unknown;
        proposedReplacement?: unknown;
        originalStatements?: unknown;
        rationale?: unknown;
        authority?: unknown;
        affectedTests?: unknown;
      };
      const ids = Array.isArray(resolution.conflictingRequirementIds)
        ? resolution.conflictingRequirementIds.filter((id): id is string => typeof id === "string")
        : [];
      const authority = resolution.authority as { kind?: unknown; source?: unknown } | undefined;
      const originals = Array.isArray(resolution.originalStatements) ? resolution.originalStatements : [];
      const originalsMatch = conflictIds.every((id) => originals.some((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const original = entry as { requirementId?: unknown; statement?: unknown };
        return original.requirementId === id && original.statement === requirementStatements.get(id);
      }));
      return (
        resolution.schemaVersion === "1" &&
        resolution.decision !== "unresolved" &&
        conflictIds.every((id) => ids.includes(id)) &&
        originalsMatch &&
        typeof resolution.rationale === "string" &&
        resolution.rationale.length > 0 &&
        authority &&
        (authority.kind === "operator" || authority.kind === "precedence-rule") &&
        typeof authority.source === "string" &&
        authority.source.length > 0 &&
        Array.isArray(resolution.affectedTests) &&
        (typeof collisionEvidence?.beforeRepair?.testFile !== "string" ||
          resolution.affectedTests.includes(collisionEvidence.beforeRepair.testFile)) &&
        (resolution.decision !== "accepted-replacement" ||
          (typeof resolution.proposedReplacement === "string" && resolution.proposedReplacement.length > 0))
      );
    });
  const evidenceSummary = input.evidenceSummary as
    | { schemaVersion?: string; missingRequired?: unknown; invalidRequired?: unknown }
    | undefined;
  const evidenceComplete =
    evidenceSummary?.schemaVersion === "1" &&
    Array.isArray(evidenceSummary.missingRequired) &&
    evidenceSummary.missingRequired.length === 0 &&
    (!Array.isArray(evidenceSummary.invalidRequired) || evidenceSummary.invalidRequired.length === 0);
  const repairMetadata = input.repairMetadata as
    | {
        schemaVersion?: string;
        patchDigest?: string;
        productionFiles?: unknown;
        regressionTestFiles?: unknown;
        sourceInputIntegrity?: { valid?: boolean };
      }
    | undefined;
  const repairMetadataValid = Boolean(
    repairMetadata?.schemaVersion === "1" &&
      typeof input.repair === "string" &&
      repairMetadata.patchDigest === sha256(input.repair) &&
      Array.isArray(repairMetadata.productionFiles) &&
      Array.isArray(repairMetadata.regressionTestFiles) &&
      repairMetadata.sourceInputIntegrity?.valid === true,
  );
  const repairReview = input.repairReview as {
    schemaVersion?: unknown;
    recommendation?: unknown;
    repairDigest?: unknown;
    generatedTestDigest?: unknown;
    verificationContextDigest?: unknown;
    reviewedFiles?: unknown;
    testPreservationConcerns?: unknown;
    summary?: unknown;
  } | undefined;
  const verificationContextDigest = sha256(JSON.stringify({
    collisionEvidence: input.collisionEvidence,
    testResults: input.testResults,
    stability: input.stability,
    requirementResolutions: input.requirementResolutions,
    repairMetadata: input.repairMetadata,
  }));
  const repairReviewValid = basis !== "repaired-collision" || Boolean(
    repairReview?.schemaVersion === "1" &&
      repairReview.recommendation === "approve" &&
      typeof input.repair === "string" && repairReview.repairDigest === sha256(input.repair) &&
      repairReview.generatedTestDigest === beforeTestDigest &&
      repairReview.verificationContextDigest === verificationContextDigest &&
      Array.isArray(repairReview.reviewedFiles) && repairReview.reviewedFiles.length > 0 &&
      Array.isArray(repairReview.testPreservationConcerns) &&
      typeof repairReview.summary === "string" && repairReview.summary.length > 0,
  );
  const basisPassed =
    basis === "compatible-pair"
      ? beforeCompatible
      : Boolean(
          beforeConfirmed &&
            afterPassed &&
            input.repair &&
            input.repairSummary &&
            repairMetadataValid,
        );

  const checks = [
    [inputIntegrity.valid, "registered inputs are stale or lack versioned fingerprints"],
    [existingPassed, "existing tests did not execute and pass in all four workspaces"],
    [executionFingerprintsValid, "existing-test executions are missing or stale input fingerprints"],
    [intentValidation.valid, "two complete intent contracts matching the registered changes are required"],
    [requirementsLinked, "collision evidence references missing or no requirements"],
    [hypothesisLinked, "collision evidence is not linked to a valid two-change hypothesis and scenario"],
    [runtimeDiagnosisValid, "confirmed execution lacks a separate requirement-linked runtime diagnosis"],
    [conflictResolved, "a material requirement conflict lacks an authorized traceable resolution"],
    [evidenceComplete, "phase-specific evidence summary is missing required artifacts"],
    [basisPassed, `verification basis ${basis} is incomplete`],
    [repairReviewValid, "repair lacks a fresh review bound to the exact verification context"],
    [stabilityPassed, "stability result does not match the frozen iteration/concurrency/seed policy"],
    [stabilityFingerprintsValid, "stability executions are missing or stale input fingerprints"],
  ] as const;
  const failures = checks.filter(([passed]) => !passed).map(([, reason]) => reason);
  return { passed: failures.length === 0, failures };
}

export async function assemblePassport(runRoot: string, input: PassportInput): Promise<MergeSafetyPassport> {
  assertVerdict(input.verdict);
  const manifest = parseRunManifestArtifact(await readJson<unknown>(runRoot, "manifest.json")).value;
  const inputIntegrity = await verifyRunInputIntegrity(manifest);
  const verificationGates = await evaluateSafeEvidence(input, manifest, inputIntegrity);
  if (input.verdict === "SAFE_TO_MERGE") {
    if (!verificationGates.passed) {
      throw new Error(
        `SAFE_TO_MERGE requires complete intent, test, collision, repair, and stability evidence: ${verificationGates.failures.join("; ")}`,
      );
    }
    if ((input.verificationBasis ?? "repaired-collision") === "repaired-collision" && !(await fileExists(runRoot, "repair.patch"))) {
      throw new Error("SAFE_TO_MERGE requires repair.patch");
    }
  }

  const passport: MergeSafetyPassport = {
    schemaVersion: "2",
    runId: manifest.runId,
    generatedAt: new Date().toISOString(),
    changes: manifest.changes,
    inputIntegrity,
    verificationGates,
    verificationBasis: input.verificationBasis ?? (input.repair ? "repaired-collision" : "compatible-pair"),
    ...input,
  };
  await writeJson(runRoot, "passport.json", passport);
  return passport;
}
