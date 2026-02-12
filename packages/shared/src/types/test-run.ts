import type { TestRunStatus } from "../constants/index.js";
import type { AuditFields } from "./common.js";

export interface TestRun extends AuditFields {
  id: string;
  name: string;
  runNumber: number;
  runKey: string;
  description: string | null;
  projectId: string;
  testPlanId: string | null;
  status: TestRunStatus;
  environment: string | null;
  environmentId: string | null;
  cycleId: string | null;
  workspaceCycleId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  executedBy: string | null;
}

export interface TestRunWithMetrics extends TestRun {
  totalCases: number;
  passRate?: number;
}

export interface TestRunDetail extends TestRun {
  results: TestRunResultEntry[];
  metrics: TestRunMetrics;
}

export interface TestRunResultEntry {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  testCaseKey: string;
  status: string;
  duration: number | null;
  comment: string | null;
  executedBy: string | null;
  executedAt: string | null;
}

export interface TestRunMetrics {
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  untested: number;
  total: number;
  passRate: number;
}

export interface CreateTestRunRequest {
  name: string;
  projectId: string;
  testCaseIds: string[];
  description?: string;
  environmentId?: string;
  cycleId?: string;
  workspaceCycleId?: string;
}

export interface CreateTestRunResponse extends TestRun {
  totalCases: number;
}

export interface UpdateTestRunRequest {
  name?: string;
  description?: string;
  status?: TestRunStatus;
}
