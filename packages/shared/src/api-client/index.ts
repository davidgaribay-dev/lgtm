import type {
  TestCase,
  TestStep,
  CreateTestCaseRequest,
  UpdateTestCaseRequest,
  TestRun,
  TestRunDetail,
  CreateTestRunRequest,
  CreateTestRunResponse,
  UpdateTestRunRequest,
  BulkResultEntry,
  BulkSubmitResultsResponse,
  Defect,
  CreateDefectRequest,
  Environment,
  Cycle,
  Project,
  TestRunLog,
  AppendLogRequest,
} from "../types/index.js";
import { LgtmApiError } from "./errors.js";

export { LgtmApiError } from "./errors.js";

export interface LgtmApiClientOptions {
  baseUrl: string;
  apiToken: string;
}

export class LgtmApiClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;

  constructor(options: LgtmApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiToken = options.apiToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw await LgtmApiError.fromResponse(response);
    }

    return response.json() as Promise<T>;
  }

  // ── Projects (Teams) ──────────────────────────────────────────────

  async getTeams(): Promise<Project[]> {
    return this.request<Project[]>("GET", "/api/teams");
  }

  // ── Test Cases ────────────────────────────────────────────────────

  async getTestCases(projectId: string): Promise<TestCase[]> {
    return this.request<TestCase[]>(
      "GET",
      `/api/test-repo?projectId=${encodeURIComponent(projectId)}`,
    );
  }

  async createTestCase(data: CreateTestCaseRequest): Promise<TestCase> {
    return this.request<TestCase>("POST", "/api/test-cases", data);
  }

  async getTestCaseByKey(
    projectId: string,
    caseKey: string,
  ): Promise<TestCase & { steps: TestStep[] }> {
    return this.request<TestCase & { steps: TestStep[] }>(
      "GET",
      `/api/test-cases/by-key?projectId=${encodeURIComponent(projectId)}&caseKey=${encodeURIComponent(caseKey)}`,
    );
  }

  async updateTestCase(
    id: string,
    data: UpdateTestCaseRequest,
  ): Promise<TestCase> {
    return this.request<TestCase>("PATCH", `/api/test-cases/${id}`, data);
  }

  // ── Test Runs ─────────────────────────────────────────────────────

  async getTestRuns(projectId: string): Promise<TestRun[]> {
    return this.request<TestRun[]>(
      "GET",
      `/api/test-runs?projectId=${encodeURIComponent(projectId)}`,
    );
  }

  async createTestRun(data: CreateTestRunRequest): Promise<CreateTestRunResponse> {
    return this.request<CreateTestRunResponse>("POST", "/api/test-runs", data);
  }

  async getTestRun(id: string): Promise<TestRunDetail> {
    return this.request<TestRunDetail>("GET", `/api/test-runs/${id}`);
  }

  async updateTestRun(id: string, data: UpdateTestRunRequest): Promise<TestRun> {
    return this.request<TestRun>("PATCH", `/api/test-runs/${id}`, data);
  }

  // ── Test Results ──────────────────────────────────────────────────

  async submitResults(
    runId: string,
    results: BulkResultEntry[],
    source: "api" | "manual" = "api",
  ): Promise<BulkSubmitResultsResponse> {
    return this.request<BulkSubmitResultsResponse>(
      "POST",
      `/api/test-runs/${runId}/results`,
      { results, source },
    );
  }

  // ── Logs ──────────────────────────────────────────────────────────

  async appendRunLog(runId: string, data: AppendLogRequest): Promise<TestRunLog> {
    return this.request<TestRunLog>(
      "POST",
      `/api/test-runs/${runId}/logs`,
      data,
    );
  }

  async appendResultLog(
    resultId: string,
    data: AppendLogRequest,
  ): Promise<TestRunLog> {
    return this.request<TestRunLog>(
      "POST",
      `/api/test-results/${resultId}/logs`,
      data,
    );
  }

  // ── Defects ───────────────────────────────────────────────────────

  async getDefects(projectId: string): Promise<Defect[]> {
    return this.request<Defect[]>(
      "GET",
      `/api/defects?projectId=${encodeURIComponent(projectId)}`,
    );
  }

  async getDefectByKey(defectKey: string): Promise<Defect> {
    return this.request<Defect>(
      "GET",
      `/api/defects/by-key?defectKey=${encodeURIComponent(defectKey)}`,
    );
  }

  async createDefect(data: CreateDefectRequest): Promise<Defect> {
    return this.request<Defect>("POST", "/api/defects", data);
  }

  // ── Environments ──────────────────────────────────────────────────

  async getEnvironments(projectId: string): Promise<Environment[]> {
    return this.request<Environment[]>(
      "GET",
      `/api/environments?projectId=${encodeURIComponent(projectId)}`,
    );
  }

  // ── Cycles ────────────────────────────────────────────────────────

  async getCycles(projectId: string): Promise<Cycle[]> {
    return this.request<Cycle[]>(
      "GET",
      `/api/cycles?projectId=${encodeURIComponent(projectId)}`,
    );
  }
}
