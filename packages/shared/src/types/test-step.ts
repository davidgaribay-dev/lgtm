import type { TestResultStatus } from "../constants/index.js";

export interface TestStep {
  id: string;
  testCaseId: string;
  stepOrder: number;
  action: string;
  data: string | null;
  expectedResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestStepResult {
  id: string;
  testResultId: string;
  testStepId: string;
  status: TestResultStatus;
  actualResult: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StepResultEntry {
  testStepId: string;
  status?: TestResultStatus;
  actualResult?: string;
  comment?: string;
}

export interface BulkUpsertStepResultsRequest {
  steps: StepResultEntry[];
}
