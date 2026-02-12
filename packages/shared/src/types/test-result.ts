import type { TestResultStatus } from "../constants/index.js";

export interface TestResult {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: TestResultStatus;
  source: "manual" | "api";
  executedBy: string | null;
  executedAt: string | null;
  duration: number | null;
  comment: string | null;
  defectCycleId: string | null;
  defectWorkspaceCycleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkResultEntry {
  testCaseId: string;
  status: TestResultStatus;
  comment?: string;
  duration?: number;
  executedBy?: string;
  executedAt?: string;
}

export interface BulkSubmitResultsRequest {
  results: BulkResultEntry[];
  source?: "manual" | "api";
}

export interface UpdateTestResultRequest {
  status?: TestResultStatus;
  comment?: string;
  duration?: number;
  executedBy?: string;
  executedAt?: string;
  source?: "manual" | "api";
}
