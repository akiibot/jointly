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
  runId: string;
  generatedAt?: string;
  verdict: string;
  summary: string;
  changes: ChangeRef[];
  intents?: Intent[];
  requirements?: Array<{ changeId?: string; requirement?: Requirement } | Requirement>;
  hypotheses?: unknown;
  testResults?: Record<string, CommandResult> | CommandResult[];
  collisionEvidence?: { beforeRepair?: CollisionResult; afterRepair?: CollisionResult };
  repair?: string;
  repairSummary?: string;
  stability?: { iterations?: number; passed?: number; failed?: number; seed?: number; concurrency?: number };
}

export class PassportError extends Error {}

export function parsePassport(value: unknown): Passport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PassportError("The selected file is not a passport object.");
  }
  const passport = value as Partial<Passport>;
  if (!passport.runId || typeof passport.runId !== "string") {
    throw new PassportError("passport.json is missing a valid runId.");
  }
  if (!passport.verdict || typeof passport.verdict !== "string") {
    throw new PassportError("passport.json is missing a valid verdict.");
  }
  if (!Array.isArray(passport.changes) || passport.changes.length !== 2) {
    throw new PassportError("Jointly MVP passports must contain exactly two changes.");
  }
  if (!passport.changes.every((change) => change?.id && change?.ref && change?.resolvedCommit)) {
    throw new PassportError("One or more change references are incomplete.");
  }
  return {
    ...passport,
    summary: typeof passport.summary === "string" ? passport.summary : "Merge safety investigation",
  } as Passport;
}

export async function loadPassport(url = "./passport.json"): Promise<Passport> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new PassportError(`Could not load passport.json (${response.status}).`);
  try {
    return parsePassport(await response.json());
  } catch (error) {
    if (error instanceof PassportError) throw error;
    throw new PassportError("passport.json is malformed JSON.");
  }
}

export async function passportFromFile(file: File): Promise<Passport> {
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
