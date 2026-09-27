export interface ChangeRef {
  id: string;
  ref: string;
  resolvedCommit: string;
  promptPath?: string;
}

export interface Requirement {
  id: string;
  statement: string;
  type?: string;
  entities?: string[];
  sideEffects?: string[];
}

export interface Intent {
  changeId: string;
  goal?: string;
  requirements?: Requirement[];
  entities?: string[];
  sideEffects?: string[];
}

export interface CommandResult {
  commandId?: string;
  workspace?: string;
  command?: string;
  exitCode?: number | null;
  timedOut?: boolean;
  durationMs?: number;
  stdout?: string;
  testCounts?: { total?: number; passed?: number; failed?: number; pending?: number; todo?: number };
}

export interface CurrentTestResults {
  schemaVersion: "2";
  beforeRepair: Record<string, CommandResult>;
  afterRepair: Record<string, CommandResult>;
  fingerprints?: unknown;
}

export interface CollisionResult {
  hypothesisId?: string;
  classification?: string;
  requirementIds?: string[];
  testFile?: string;
  generatedTestSource?: string;
  expected?: string;
  observed?: string;
  commandResult?: CommandResult;
}

export interface Passport {
  schemaVersion?: "2";
  importStatus: "current" | "legacy-unverified";
  runId: string;
  generatedAt?: string;
  verdict: string;
  summary: string;
  verificationBasis?: "repaired-collision" | "compatible-pair";
  inputIntegrity?: { valid: boolean; failures?: string[] };
  changes: ChangeRef[];
  intents?: Intent[];
  requirements?: Array<{ changeId?: string; requirement?: Requirement } | Requirement>;
  hypotheses?: unknown;
  testResults?: Record<string, CommandResult> | CommandResult[] | CurrentTestResults;
  collisionEvidence?: { beforeRepair?: CollisionResult; afterRepair?: CollisionResult };
  runtimeDiagnosis?: { hypothesisId?: string; requirementIds?: string[]; interpretation?: string; evidenceArtifact?: string };
  requirementResolutions?: Array<{
    id?: string; conflictingRequirementIds?: string[]; decision?: string; proposedReplacement?: string;
    rationale?: string; authority?: { kind?: string; source?: string }; affectedTests?: string[];
  }>;
  repair?: string;
  repairSummary?: string;
  stability?: { scenario?: string; iterations?: number; passed?: number; failed?: number; seed?: number; concurrency?: number; requestConcurrency?: number | null };
  verificationGates?: { passed: boolean; failures: string[] };
}

export class PassportError extends Error {}

export const MAX_PASSPORT_BYTES = 1024 * 1024;
const VERDICTS = new Set([
  "SAFE_TO_MERGE", "COLLISION_CONFIRMED", "REPAIR_REQUIRES_REVIEW",
  "INDEPENDENT_CHANGE_FAILED", "TEXTUAL_CONFLICT", "INSUFFICIENT_EVIDENCE",
]);

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function boundedString(value: unknown, label: string, maximum = 10_000, optional = false): string | undefined {
  if (value === undefined && optional) return undefined;
  if (typeof value !== "string" || value.length === 0 || value.length > maximum) {
    throw new PassportError(`${label} must be a non-empty string no longer than ${maximum} characters.`);
  }
  return value;
}

function stringArray(value: unknown, label: string, maximum = 200): string[] {
  if (!Array.isArray(value) || value.length > maximum || !value.every((item) => typeof item === "string" && item.length > 0 && item.length <= 10_000)) {
    throw new PassportError(`${label} must contain at most ${maximum} bounded strings.`);
  }
  return value;
}

function validateRequirement(value: unknown, label: string): void {
  const input = record(value);
  if (!input) throw new PassportError(`${label} is not an object.`);
  boundedString(input.id, `${label}.id`, 200);
  boundedString(input.statement, `${label}.statement`);
  if (input.type !== undefined) boundedString(input.type, `${label}.type`, 100);
  if (input.entities !== undefined) stringArray(input.entities, `${label}.entities`, 100);
  if (input.sideEffects !== undefined) stringArray(input.sideEffects, `${label}.sideEffects`, 100);
}

function validateCommandResult(value: unknown, label: string): void {
  const input = record(value);
  if (!input) throw new PassportError(`${label} is not an object.`);
  for (const field of ["commandId", "workspace", "command"] as const) if (input[field] !== undefined) boundedString(input[field], `${label}.${field}`, 10_000);
  if (input.exitCode !== undefined && input.exitCode !== null && (!Number.isInteger(input.exitCode) || Math.abs(input.exitCode as number) > 255)) {
    throw new PassportError(`${label}.exitCode is invalid.`);
  }
  if (input.timedOut !== undefined && typeof input.timedOut !== "boolean") throw new PassportError(`${label}.timedOut is invalid.`);
  if (input.durationMs !== undefined && (!Number.isFinite(input.durationMs) || (input.durationMs as number) < 0)) throw new PassportError(`${label}.durationMs is invalid.`);
  if (input.stdout !== undefined && (typeof input.stdout !== "string" || input.stdout.length > 200_000)) throw new PassportError(`${label}.stdout is invalid.`);
  if (input.testCounts !== undefined) {
    const counts = record(input.testCounts);
    if (!counts) throw new PassportError(`${label}.testCounts is not an object.`);
    for (const field of ["total", "passed", "failed", "pending", "todo"] as const) {
      if (counts[field] !== undefined && (!Number.isSafeInteger(counts[field]) || (counts[field] as number) < 0)) throw new PassportError(`${label}.testCounts.${field} is invalid.`);
    }
  }
}

function validateCollision(value: unknown, label: string): void {
  const input = record(value);
  if (!input) throw new PassportError(`${label} is not an object.`);
  for (const field of ["hypothesisId", "classification", "testFile", "expected", "observed"] as const) {
    if (input[field] !== undefined) boundedString(input[field], `${label}.${field}`, 20_000);
  }
  if (input.generatedTestSource !== undefined) boundedString(input.generatedTestSource, `${label}.generatedTestSource`, 200_000);
  if (input.requirementIds !== undefined) stringArray(input.requirementIds, `${label}.requirementIds`);
  if (input.commandResult !== undefined) validateCommandResult(input.commandResult, `${label}.commandResult`);
}

function validateNested(passport: Partial<Passport>, current: boolean): void {
  const changes = passport.changes!;
  const changeIds = new Set<string>();
  for (const [index, raw] of changes.entries()) {
    const change = record(raw);
    if (!change) throw new PassportError(`changes[${index}] is not an object.`);
    const id = boundedString(change.id, `changes[${index}].id`, 200)!;
    boundedString(change.ref, `changes[${index}].ref`, 1_000);
    const commit = boundedString(change.resolvedCommit, `changes[${index}].resolvedCommit`, 64)!;
    if (current && !/^[a-f0-9]{40,64}$/.test(commit)) throw new PassportError(`changes[${index}].resolvedCommit is not a full Git object ID.`);
    if (current && change.promptPath === undefined) throw new PassportError(`changes[${index}].promptPath is required for current passports.`);
    if (change.promptPath !== undefined) boundedString(change.promptPath, `changes[${index}].promptPath`, 2_000);
    if (changeIds.has(id)) throw new PassportError("Passport change IDs must be unique.");
    changeIds.add(id);
  }
  if (passport.intents !== undefined) {
    if (!Array.isArray(passport.intents) || passport.intents.length > 20) throw new PassportError("intents must be a bounded array.");
    passport.intents.forEach((raw, index) => {
      const intent = record(raw);
      if (!intent) throw new PassportError(`intents[${index}] is not an object.`);
      boundedString(intent.changeId, `intents[${index}].changeId`, 200);
      if (intent.goal !== undefined) boundedString(intent.goal, `intents[${index}].goal`, 20_000);
      if (intent.entities !== undefined) stringArray(intent.entities, `intents[${index}].entities`, 200);
      if (intent.sideEffects !== undefined) stringArray(intent.sideEffects, `intents[${index}].sideEffects`, 200);
      if (intent.requirements !== undefined) {
        if (!Array.isArray(intent.requirements) || intent.requirements.length > 200) throw new PassportError(`intents[${index}].requirements is invalid.`);
        intent.requirements.forEach((requirement, requirementIndex) => validateRequirement(requirement, `intents[${index}].requirements[${requirementIndex}]`));
      }
    });
  }
  if (passport.requirements !== undefined) {
    if (!Array.isArray(passport.requirements) || passport.requirements.length > 400) throw new PassportError("requirements must be a bounded array.");
    passport.requirements.forEach((raw, index) => {
      const wrapper = record(raw);
      if (wrapper?.requirement !== undefined) {
        if (wrapper.changeId !== undefined) boundedString(wrapper.changeId, `requirements[${index}].changeId`, 200);
        validateRequirement(wrapper.requirement, `requirements[${index}].requirement`);
      } else validateRequirement(raw, `requirements[${index}]`);
    });
  }
  if (passport.hypotheses !== undefined) {
    const container = record(passport.hypotheses);
    const hypotheses = Array.isArray(passport.hypotheses) ? passport.hypotheses : Array.isArray(container?.hypotheses) ? container.hypotheses : [passport.hypotheses];
    if (hypotheses.length > 200) throw new PassportError("hypotheses contains too many records.");
    hypotheses.forEach((raw, index) => {
      const hypothesis = record(raw);
      if (!hypothesis) throw new PassportError(`hypotheses[${index}] is not an object.`);
      if (hypothesis.id !== undefined) boundedString(hypothesis.id, `hypotheses[${index}].id`, 200);
      if (hypothesis.explanation !== undefined) boundedString(hypothesis.explanation, `hypotheses[${index}].explanation`, 50_000);
      if (hypothesis.requirementIds !== undefined) stringArray(hypothesis.requirementIds, `hypotheses[${index}].requirementIds`);
    });
  }
  if (passport.testResults !== undefined) {
    if (Array.isArray(passport.testResults)) {
      if (passport.testResults.length > 100) throw new PassportError("testResults contains too many records.");
      passport.testResults.forEach((result, index) => validateCommandResult(result, `testResults[${index}]`));
    } else {
      const results = record(passport.testResults);
      if (!results || Object.keys(results).length > 100) throw new PassportError("testResults is invalid.");
      if (results.schemaVersion === "2") {
        for (const phase of ["beforeRepair", "afterRepair"] as const) {
          const phaseResults = record(results[phase]);
          if (!phaseResults || Object.keys(phaseResults).length > 10) throw new PassportError(`testResults.${phase} is invalid.`);
          Object.entries(phaseResults).forEach(([key, result]) => validateCommandResult(result, `testResults.${phase}.${key}`));
        }
        if (results.fingerprints !== undefined && !record(results.fingerprints)) throw new PassportError("testResults.fingerprints is invalid.");
      } else Object.entries(results).forEach(([key, result]) => validateCommandResult(result, `testResults.${key}`));
    }
  }
  const collision = passport.collisionEvidence === undefined ? undefined : record(passport.collisionEvidence);
  if (passport.collisionEvidence !== undefined && !collision) throw new PassportError("collisionEvidence is not an object.");
  if (collision?.beforeRepair !== undefined) validateCollision(collision.beforeRepair, "collisionEvidence.beforeRepair");
  if (collision?.afterRepair !== undefined) validateCollision(collision.afterRepair, "collisionEvidence.afterRepair");
  if (passport.repair !== undefined) boundedString(passport.repair, "repair", 500_000);
  if (passport.repairSummary !== undefined) boundedString(passport.repairSummary, "repairSummary", 50_000);
  if (passport.verificationBasis !== undefined && !["repaired-collision", "compatible-pair"].includes(passport.verificationBasis)) {
    throw new PassportError("verificationBasis is invalid.");
  }
  if (passport.inputIntegrity !== undefined) {
    const integrity = record(passport.inputIntegrity);
    if (!integrity || typeof integrity.valid !== "boolean") throw new PassportError("inputIntegrity is invalid.");
    if (integrity.failures !== undefined) stringArray(integrity.failures, "inputIntegrity.failures");
  }
  if (passport.runtimeDiagnosis !== undefined) {
    const diagnosis = record(passport.runtimeDiagnosis);
    if (!diagnosis) throw new PassportError("runtimeDiagnosis is invalid.");
    for (const field of ["hypothesisId", "interpretation", "evidenceArtifact"] as const) if (diagnosis[field] !== undefined) boundedString(diagnosis[field], `runtimeDiagnosis.${field}`, 20_000);
    if (diagnosis.requirementIds !== undefined) stringArray(diagnosis.requirementIds, "runtimeDiagnosis.requirementIds");
  }
  if (passport.requirementResolutions !== undefined) {
    if (!Array.isArray(passport.requirementResolutions) || passport.requirementResolutions.length > 100) throw new PassportError("requirementResolutions is invalid.");
    passport.requirementResolutions.forEach((raw, index) => {
      const resolution = record(raw);
      if (!resolution) throw new PassportError(`requirementResolutions[${index}] is invalid.`);
      for (const field of ["id", "decision", "proposedReplacement", "rationale"] as const) if (resolution[field] !== undefined) boundedString(resolution[field], `requirementResolutions[${index}].${field}`, 20_000);
      if (resolution.conflictingRequirementIds !== undefined) stringArray(resolution.conflictingRequirementIds, `requirementResolutions[${index}].conflictingRequirementIds`);
      if (resolution.affectedTests !== undefined) stringArray(resolution.affectedTests, `requirementResolutions[${index}].affectedTests`);
      if (resolution.authority !== undefined) {
        const authority = record(resolution.authority);
        if (!authority) throw new PassportError(`requirementResolutions[${index}].authority is invalid.`);
        if (authority.kind !== undefined) boundedString(authority.kind, `requirementResolutions[${index}].authority.kind`, 100);
        if (authority.source !== undefined) boundedString(authority.source, `requirementResolutions[${index}].authority.source`, 2_000);
      }
    });
  }
  if (passport.stability !== undefined) {
    const stability = record(passport.stability);
    if (!stability) throw new PassportError("stability is not an object.");
    for (const field of ["iterations", "passed", "failed", "seed", "concurrency"] as const) {
      if (stability[field] !== undefined && (!Number.isSafeInteger(stability[field]) || (stability[field] as number) < 0)) throw new PassportError(`stability.${field} is invalid.`);
    }
    if (stability.scenario !== undefined) boundedString(stability.scenario, "stability.scenario", 1_000);
    if (stability.requestConcurrency !== undefined && stability.requestConcurrency !== null && (!Number.isSafeInteger(stability.requestConcurrency) || (stability.requestConcurrency as number) <= 0)) throw new PassportError("stability.requestConcurrency is invalid.");
    if (typeof stability.iterations === "number" && typeof stability.passed === "number" && typeof stability.failed === "number"
      && stability.passed + stability.failed !== stability.iterations) throw new PassportError("stability totals are inconsistent.");
  }
}

export function parsePassport(value: unknown): Passport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PassportError("The selected file is not a passport object.");
  }
  const passport = value as Partial<Passport>;
  if (passport.schemaVersion !== undefined && passport.schemaVersion !== "2") {
    throw new PassportError(`Unsupported passport schema version: ${String(passport.schemaVersion)}.`);
  }
  if (!passport.runId || typeof passport.runId !== "string") {
    throw new PassportError("passport.json is missing a valid runId.");
  }
  if (!passport.verdict || typeof passport.verdict !== "string") {
    throw new PassportError("passport.json is missing a valid verdict.");
  }
  if (!VERDICTS.has(passport.verdict)) throw new PassportError(`Unsupported passport verdict: ${passport.verdict}.`);
  if (!Array.isArray(passport.changes) || passport.changes.length !== 2) {
    throw new PassportError("Jointly MVP passports must contain exactly two changes.");
  }
  if (!passport.changes.every((change) => change?.id && change?.ref && change?.resolvedCommit)) {
    throw new PassportError("One or more change references are incomplete.");
  }
  const importStatus = passport.schemaVersion === "2" ? "current" : "legacy-unverified";
  if (
    importStatus === "current" &&
    (!passport.verificationGates ||
      typeof passport.verificationGates.passed !== "boolean" ||
      !Array.isArray(passport.verificationGates.failures))
  ) {
    throw new PassportError("Current passports must include structured verification gates.");
  }
  if (passport.verificationGates) {
    if (!passport.verificationGates.failures.every((failure) => typeof failure === "string" && failure.length > 0 && failure.length <= 10_000)) {
      throw new PassportError("verificationGates.failures contains an invalid reason.");
    }
    if (passport.verificationGates.passed && passport.verificationGates.failures.length > 0) {
      throw new PassportError("Passing verification gates cannot contain failure reasons.");
    }
  }
  boundedString(passport.runId, "runId", 500);
  if (passport.generatedAt !== undefined && (typeof passport.generatedAt !== "string" || !Number.isFinite(Date.parse(passport.generatedAt)))) {
    throw new PassportError("generatedAt is not a valid timestamp.");
  }
  if (passport.summary !== undefined) boundedString(passport.summary, "summary", 50_000);
  validateNested(passport, importStatus === "current");
  return {
    ...passport,
    importStatus,
    summary: typeof passport.summary === "string" ? passport.summary : "Merge safety investigation",
  } as Passport;
}

export async function loadPassport(url = "./passport.json"): Promise<Passport> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new PassportError(`Could not load passport.json (${response.status}).`);
  try {
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_PASSPORT_BYTES) throw new PassportError(`passport.json exceeds the ${MAX_PASSPORT_BYTES}-byte limit.`);
    const reader = response.body?.getReader();
    let text: string;
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      let result = "";
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > MAX_PASSPORT_BYTES) {
          await reader.cancel();
          throw new PassportError(`passport.json exceeds the ${MAX_PASSPORT_BYTES}-byte limit.`);
        }
        result += decoder.decode(chunk.value, { stream: true });
      }
      text = result + decoder.decode();
    } else {
      text = await response.text();
      if (new TextEncoder().encode(text).byteLength > MAX_PASSPORT_BYTES) throw new PassportError(`passport.json exceeds the ${MAX_PASSPORT_BYTES}-byte limit.`);
    }
    return parsePassport(JSON.parse(text));
  } catch (error) {
    if (error instanceof PassportError) throw error;
    throw new PassportError("passport.json is malformed JSON.");
  }
}

export async function passportFromFile(file: File): Promise<Passport> {
  if (file.size > MAX_PASSPORT_BYTES) throw new PassportError(`The selected file exceeds the ${MAX_PASSPORT_BYTES}-byte limit.`);
  try {
    return parsePassport(JSON.parse(await file.text()));
  } catch (error) {
    if (error instanceof PassportError) throw error;
    throw new PassportError("The selected file is not valid JSON.");
  }
}

export function testMatrix(passport: Passport): Array<{ workspace: string; result: CommandResult }> {
  const value = passport.testResults;
  if (Array.isArray(value)) {
    const preferred = value.filter((result) => result.commandId === "existing-tests" || !result.commandId);
    return preferred.map((result) => ({ workspace: result.workspace ?? "unknown", result }));
  }
  if (value && !Array.isArray(value) && value.schemaVersion === "2" && "beforeRepair" in value && "afterRepair" in value) {
    const current = Object.keys(value.afterRepair).length ? value.afterRepair : value.beforeRepair;
    return Object.entries(current).map(([workspace, result]) => ({ workspace, result }));
  }
  return Object.entries(value ?? {}).map(([workspace, result]) => ({ workspace, result }));
}

export function requirements(passport: Passport): Requirement[] {
  const fromIntents = passport.intents?.flatMap((intent) => intent.requirements ?? []) ?? [];
  if (fromIntents.length) return fromIntents;
  return (passport.requirements ?? []).flatMap((item) => {
    if ("requirement" in item && item.requirement) return [item.requirement];
    return [item as Requirement];
  });
}
