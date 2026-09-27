import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { writeJson } from "./evidence.js";
import type { CollisionEvidence, CommandResult } from "./types.js";

export interface VitestAssertionResult {
  status: "passed" | "failed" | "pending" | "skipped" | "todo" | string;
  failureMessages: string[];
}

export interface VitestFileResult {
  name: string;
  status: string;
  message: string;
  assertionResults: VitestAssertionResult[];
}

export interface VitestStructuredReport {
  success: boolean;
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  testResults: VitestFileResult[];
}

export interface GeneratedTestClassification {
  classification: CollisionEvidence["classification"];
  reason: string;
  counts?: {
    total: number;
    passed: number;
    failed: number;
    pending: number;
    todo: number;
  };
}

export async function prepareVitestReport(cwd: string, relativeReportPath: string): Promise<string> {
  const reportPath = path.join(cwd, relativeReportPath);
  await mkdir(path.dirname(reportPath), { recursive: true });
  await rm(reportPath, { force: true });
  return reportPath;
}

export async function enrichCommandWithVitestReport<T extends CommandResult>(
  runRoot: string,
  reportPath: string,
  result: T,
): Promise<T> {
  try {
    const report = parseVitestReport(JSON.parse(await readFile(reportPath, "utf8")));
    const testReportArtifact = await writeJson(
      runRoot,
      path.posix.join("test-results", result.workspace, `${result.commandId}.vitest.json`),
      report,
    );
    return {
      ...result,
      testCounts: {
        total: report.numTotalTests,
        passed: report.numPassedTests,
        failed: report.numFailedTests,
        pending: report.numPendingTests,
        todo: report.numTodoTests,
      },
      testReportArtifact,
    };
  } catch (error) {
    return {
      ...result,
      testReportError: error instanceof Error ? error.message : String(error),
    };
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function count(value: unknown, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return Number(value);
}

export function parseVitestReport(value: unknown): VitestStructuredReport {
  const root = record(value, "Vitest report");
  if (typeof root.success !== "boolean") throw new Error("Vitest report success must be boolean");
  if (!Array.isArray(root.testResults)) throw new Error("Vitest report testResults must be an array");

  const testResults = root.testResults.map((item, fileIndex) => {
    const file = record(item, `Vitest report testResults[${fileIndex}]`);
    if (typeof file.name !== "string" || typeof file.status !== "string") {
      throw new Error(`Vitest report testResults[${fileIndex}] requires name and status`);
    }
    if (!Array.isArray(file.assertionResults)) {
      throw new Error(`Vitest report testResults[${fileIndex}].assertionResults must be an array`);
    }
    const assertionResults = file.assertionResults.map((item, assertionIndex) => {
      const assertion = record(
        item,
        `Vitest report testResults[${fileIndex}].assertionResults[${assertionIndex}]`,
      );
      if (typeof assertion.status !== "string") {
        throw new Error(`Vitest assertion ${fileIndex}:${assertionIndex} requires status`);
      }
      const failureMessages = Array.isArray(assertion.failureMessages)
        ? assertion.failureMessages.filter((message): message is string => typeof message === "string")
        : [];
      return { status: assertion.status, failureMessages };
    });
    return {
      name: file.name,
      status: file.status,
      message: typeof file.message === "string" ? file.message : "",
      assertionResults,
    };
  });

  return {
    success: root.success,
    numTotalTests: count(root.numTotalTests, "Vitest report numTotalTests"),
    numPassedTests: count(root.numPassedTests, "Vitest report numPassedTests"),
    numFailedTests: count(root.numFailedTests, "Vitest report numFailedTests"),
    numPendingTests: count(root.numPendingTests, "Vitest report numPendingTests"),
    numTodoTests: count(root.numTodoTests ?? 0, "Vitest report numTodoTests"),
    testResults,
  };
}

export function classifyGeneratedVitestRun(input: {
  commandResult: Pick<CommandResult, "exitCode" | "timedOut" | "signal" | "terminationReason">;
  report?: VitestStructuredReport;
  reportError?: string;
  generatedTestFilename: string;
}): GeneratedTestClassification {
  if (input.commandResult.timedOut) {
    return { classification: "environment-failure", reason: "test process timed out" };
  }
  if (input.commandResult.terminationReason === "cancelled") {
    return { classification: "environment-failure", reason: "test process was cancelled" };
  }
  if (input.commandResult.signal || input.commandResult.terminationReason === "signal") {
    return {
      classification: "environment-failure",
      reason: `test process terminated by signal${input.commandResult.signal ? ` ${input.commandResult.signal}` : ""}`,
    };
  }
  if (input.commandResult.terminationReason === "spawn-error") {
    return { classification: "environment-failure", reason: "test process failed to start" };
  }
  if (!input.report) {
    return {
      classification: "environment-failure",
      reason: input.reportError ? `structured test report unavailable: ${input.reportError}` : "structured test report unavailable",
    };
  }

  const report = input.report;
  const counts = {
    total: report.numTotalTests,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    pending: report.numPendingTests,
    todo: report.numTodoTests,
  };
  const targetFiles = report.testResults.filter(
    (result) => path.basename(result.name) === input.generatedTestFilename,
  );
  if (report.numTotalTests === 0) {
    if (targetFiles.length === 1 && targetFiles[0].status === "failed") {
      if (/no test (?:suite|files?) (?:found|collected)|no tests? found/i.test(targetFiles[0].message)) {
        return { classification: "insufficient-evidence", reason: "no tests executed", counts };
      }
      return {
        classification: "test-invalid",
        reason: "the generated test failed during collection or setup before any assertion executed",
        counts,
      };
    }
    return { classification: "insufficient-evidence", reason: "no tests executed", counts };
  }
  if (report.numPassedTests === 0 && report.numFailedTests === 0) {
    return { classification: "insufficient-evidence", reason: "all discovered tests were skipped or pending", counts };
  }

  if (targetFiles.length !== 1) {
    return {
      classification: "test-invalid",
      reason: `structured report contains ${targetFiles.length} result files for the generated test`,
      counts,
    };
  }

  const targetAssertions = targetFiles[0].assertionResults;
  const failedTargetAssertions = targetAssertions.filter((assertion) => assertion.status === "failed");
  const otherFailedAssertions = report.testResults
    .filter((result) => path.basename(result.name) !== input.generatedTestFilename)
    .flatMap((result) => result.assertionResults)
    .filter((assertion) => assertion.status === "failed");

  if (failedTargetAssertions.length > 0 && otherFailedAssertions.length === 0 && input.commandResult.exitCode !== 0) {
    return {
      classification: "confirmed-collision",
      reason: "the generated interaction test contains a failed assertion",
      counts,
    };
  }
  if (failedTargetAssertions.length === 0 && report.numFailedTests > 0) {
    return {
      classification: targetAssertions.length === 0 ? "test-invalid" : "environment-failure",
      reason:
        targetAssertions.length === 0
          ? "the generated test file failed before executing an assertion"
          : "a test outside the generated interaction test failed",
      counts,
    };
  }
  if (input.commandResult.exitCode !== 0 || !report.success) {
    return {
      classification: "environment-failure",
      reason: "process status and structured test results are inconsistent or incomplete",
      counts,
    };
  }
  if (targetAssertions.every((assertion) => ["pending", "skipped", "todo"].includes(assertion.status))) {
    return { classification: "insufficient-evidence", reason: "the generated test did not execute", counts };
  }
  return {
    classification: "hypothesis-rejected",
    reason: "the generated interaction test executed without a failed assertion",
    counts,
  };
}
