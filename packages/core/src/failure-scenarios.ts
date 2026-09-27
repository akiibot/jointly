import { writeJson } from "./evidence.js";
import { failureScenarioReportSchema } from "./schemas.js";
import type { z } from "zod";

export type FailureScenarioReport = z.infer<typeof failureScenarioReportSchema>;

export async function writeFailureScenarioReport(runRoot: string, raw: unknown): Promise<FailureScenarioReport> {
  const report = failureScenarioReportSchema.parse(raw);
  await writeJson(runRoot, "failure-scenarios.json", report);
  return report;
}
