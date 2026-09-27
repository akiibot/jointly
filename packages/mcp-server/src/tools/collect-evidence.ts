import path from "node:path";
import {
  collisionEvidenceSchema,
  evidenceSummarySchema,
  existingTestSummaryArtifactSchema,
  hypothesesArtifactSchema,
  intentContractSchema,
  repairMetadataSchema,
  requirementResolutionsArtifactSchema,
  runtimeDiagnosisSchema,
  repairReviewSchema,
  stabilityResultSchema,
  writeJson,
} from "@jointly/core";
import type { ZodType } from "zod";
import { fileExists, loadRun, readOptionalJson, readOptionalValidatedJson, type ToolContext } from "../context.js";

const ARTIFACTS = [
  "manifest.json",
  "workspaces.json",
  "test-results/existing.json",
  "hypotheses.json",
  "collision-evidence.json",
  "collision-evidence.before-repair.json",
  "collision-evidence.after-repair.json",
  "runtime-diagnosis.json",
  "repair-review.json",
  "repair.patch",
  "repair-metadata.json",
  "repair-summary.md",
  "stability.json",
  "passport.json",
] as const;

const ARTIFACT_SCHEMAS: Record<string, ZodType> = {
  "test-results/existing.json": existingTestSummaryArtifactSchema,
  "hypotheses.json": hypothesesArtifactSchema,
  "collision-evidence.json": collisionEvidenceSchema,
  "collision-evidence.before-repair.json": collisionEvidenceSchema,
  "collision-evidence.after-repair.json": collisionEvidenceSchema,
  "runtime-diagnosis.json": runtimeDiagnosisSchema,
  "repair-review.json": repairReviewSchema,
  "repair-metadata.json": repairMetadataSchema,
  "stability.json": stabilityResultSchema,
  "evidence-summary.json": evidenceSummarySchema,
  "requirement-resolutions.json": requirementResolutionsArtifactSchema,
};

export async function collectEvidence(
  context: ToolContext,
  runId: string,
  input:
    | string[]
    | {
        phase?: "registered" | "investigation" | "verification" | "passport";
        verificationBasis?: "repaired-collision" | "compatible-pair";
      } = {},
) {
  const { runRoot, manifest } = await loadRun(context, runId);
  const options = Array.isArray(input) ? {} : input;
  const phase = options.phase ?? "registered";
  const basis = options.verificationBasis ?? "repaired-collision";
  const intentArtifacts = manifest.changes.map((change) => `intents/${change.id}.json`);
  const allArtifacts = [...ARTIFACTS, ...intentArtifacts];
  const artifacts = await Promise.all(
    allArtifacts.map(async (artifact) => {
      const exists = await fileExists(path.join(runRoot, artifact));
      if (!exists) return { artifact, exists, valid: false };
      const schema = intentArtifacts.includes(artifact) ? intentContractSchema : ARTIFACT_SCHEMAS[artifact];
      if (!schema) return { artifact, exists, valid: true };
      try {
        await readOptionalValidatedJson(runRoot, artifact, schema);
        return { artifact, exists, valid: true };
      } catch (error) {
        return { artifact, exists, valid: false, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
  const links: Array<{ requirementId: string; artifact: string }> = [];
  for (const artifact of intentArtifacts) {
    const intent = await readOptionalValidatedJson(runRoot, artifact, intentContractSchema).catch(() => undefined);
    for (const requirement of intent?.requirements ?? []) {
      if (typeof requirement.id === "string") links.push({ requirementId: requirement.id, artifact });
    }
  }
  const hypotheses = await readOptionalValidatedJson(runRoot, "hypotheses.json", hypothesesArtifactSchema).catch(() => undefined);
  const hypothesisList = Array.isArray(hypotheses) ? hypotheses : hypotheses?.hypotheses ?? [];
  for (const hypothesis of hypothesisList) {
    if (Array.isArray(hypothesis.requirementIds)) {
      for (const id of hypothesis.requirementIds) {
        if (typeof id === "string") links.push({ requirementId: id, artifact: "hypotheses.json" });
      }
    }
  }
  for (const artifact of [
    "collision-evidence.json",
    "collision-evidence.before-repair.json",
    "collision-evidence.after-repair.json",
  ]) {
    const evidence = await readOptionalValidatedJson(runRoot, artifact, collisionEvidenceSchema).catch(() => undefined);
    if (Array.isArray(evidence?.requirementIds)) {
      for (const id of evidence.requirementIds) {
        if (typeof id === "string") links.push({ requirementId: id, artifact });
      }
    }
  }
  const requiredByPhase: Record<typeof phase, string[]> = {
    registered: ["manifest.json", "workspaces.json"],
    investigation: [
      "manifest.json",
      "workspaces.json",
      "test-results/existing.json",
      ...intentArtifacts,
      "hypotheses.json",
      "collision-evidence.before-repair.json",
      ...(basis === "repaired-collision" ? ["runtime-diagnosis.json"] : []),
    ],
    verification: [
      "manifest.json",
      "workspaces.json",
      "test-results/existing.json",
      ...intentArtifacts,
      "hypotheses.json",
      "collision-evidence.before-repair.json",
      "stability.json",
      ...(basis === "repaired-collision"
        ? [
            "runtime-diagnosis.json",
            "repair-review.json",
            "collision-evidence.after-repair.json",
            "repair.patch",
            "repair-metadata.json",
            "repair-summary.md",
          ]
        : []),
    ],
    passport: ["passport.json"],
  };
  if (phase === "passport") {
    requiredByPhase.passport.unshift(...requiredByPhase.verification);
  }
  const deduplicatedLinks = Array.from(
    new Map(links.map((link) => [`${link.requirementId}:${link.artifact}`, link])).values(),
  );
  const summary = {
    schemaVersion: "1",
    runId,
    phase,
    verificationBasis: basis,
    artifacts,
    requirementLinks: deduplicatedLinks,
    missingRequired: requiredByPhase[phase].filter(
      (required) => !artifacts.some((entry) => entry.artifact === required && entry.exists),
    ),
    invalidRequired: requiredByPhase[phase].filter(
      (required) => artifacts.some((entry) => entry.artifact === required && entry.exists && !entry.valid),
    ),
  };
  await writeJson(runRoot, "evidence-summary.json", summary);
  return summary;
}
