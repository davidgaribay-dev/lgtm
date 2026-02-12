export interface TestRunLog {
  id: string;
  testRunId: string;
  testResultId: string | null;
  stepName: string | null;
  chunkIndex: number;
  content: string;
  lineOffset: number;
  lineCount: number;
  createdAt: string;
}

export interface AppendLogRequest {
  content: string;
  step?: string;
  testResultId?: string;
}
