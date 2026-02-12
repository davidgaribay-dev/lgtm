export interface AuditFields {
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  deletedAt: string | null;
  deletedBy: string | null;
}

export interface ApiError {
  error: string;
}

export interface BulkSubmitResultsResponse {
  updated: number;
  suggestedRunStatus: string;
  results: Array<{ testCaseId: string; testResultId: string }>;
}
