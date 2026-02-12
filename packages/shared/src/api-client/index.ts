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
  Attachment,
  SharedStep,
  SharedStepAction,
  SharedStepWithActions,
  CreateSharedStepRequest,
  UpdateSharedStepRequest,
  CreateSharedStepActionRequest,
  UpdateSharedStepActionRequest,
} from "../types/index.js";
import { LgtmApiError } from "./errors.js";

export { LgtmApiError } from "./errors.js";

export interface LgtmApiClientOptions {
  baseUrl: string;
  apiToken: string;
}

export class LgtmApiClient {
  private readonly baseUrl: string;
  private readonly apiToken!: string;

  constructor(options: LgtmApiClientOptions) {
    // Validate URL scheme
    let parsed: URL;
    try {
      parsed = new URL(options.baseUrl);
    } catch {
      throw new Error(`Invalid API URL: ${options.baseUrl}`);
    }
    if (!["https:", "http:"].includes(parsed.protocol)) {
      throw new Error(
        `API URL must use https:// or http:// protocol, got: ${parsed.protocol}`,
      );
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");

    // Store token as non-enumerable to prevent accidental exposure via
    // JSON.stringify() or console.log()
    Object.defineProperty(this, "apiToken", {
      value: options.apiToken,
      enumerable: false,
      writable: false,
      configurable: false,
    });
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
    };
    if (body != null) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await LgtmApiError.fromResponse(response);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new LgtmApiError(
          `Expected JSON response but received Content-Type: ${contentType}`,
          response.status,
        );
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async requestFormData<T>(
    path: string,
    formData: FormData,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiToken}` },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await LgtmApiError.fromResponse(response);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new LgtmApiError(
          `Expected JSON response but received Content-Type: ${contentType}`,
          response.status,
        );
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
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

  // ── Attachments ─────────────────────────────────────────────────

  async uploadAttachment(
    file: Blob,
    fileName: string,
    entityType: string,
    entityId: string,
    projectId: string,
  ): Promise<Attachment> {
    const formData = new FormData();
    formData.append("file", file, fileName);
    formData.append("entityType", entityType);
    formData.append("entityId", entityId);
    formData.append("projectId", projectId);
    return this.requestFormData<Attachment>("/api/attachments", formData);
  }

  async getAttachments(
    entityType: string,
    entityId: string,
  ): Promise<{ attachments: Attachment[] }> {
    return this.request<{ attachments: Attachment[] }>(
      "GET",
      `/api/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`,
    );
  }

  async deleteAttachment(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      "DELETE",
      `/api/attachments/${id}`,
    );
  }

  // ── Shared Steps ──────────────────────────────────────────────────

  async getSharedSteps(projectId: string): Promise<SharedStep[]> {
    return this.request<SharedStep[]>(
      "GET",
      `/api/shared-steps?projectId=${encodeURIComponent(projectId)}`,
    );
  }

  async getSharedStep(id: string): Promise<SharedStepWithActions> {
    return this.request<SharedStepWithActions>(
      "GET",
      `/api/shared-steps/${id}`,
    );
  }

  async createSharedStep(data: CreateSharedStepRequest): Promise<SharedStep> {
    return this.request<SharedStep>("POST", "/api/shared-steps", data);
  }

  async updateSharedStep(
    id: string,
    data: UpdateSharedStepRequest,
  ): Promise<SharedStep> {
    return this.request<SharedStep>("PUT", `/api/shared-steps/${id}`, data);
  }

  async deleteSharedStep(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      "DELETE",
      `/api/shared-steps/${id}`,
    );
  }

  async createSharedStepAction(
    sharedStepId: string,
    data: CreateSharedStepActionRequest,
  ): Promise<SharedStepAction> {
    return this.request<SharedStepAction>(
      "POST",
      `/api/shared-steps/${sharedStepId}/actions`,
      data,
    );
  }

  async updateSharedStepAction(
    sharedStepId: string,
    actionId: string,
    data: UpdateSharedStepActionRequest,
  ): Promise<SharedStepAction> {
    return this.request<SharedStepAction>(
      "PUT",
      `/api/shared-steps/${sharedStepId}/actions/${actionId}`,
      data,
    );
  }

  async deleteSharedStepAction(
    sharedStepId: string,
    actionId: string,
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      "DELETE",
      `/api/shared-steps/${sharedStepId}/actions/${actionId}`,
    );
  }

  async reorderSharedStepActions(
    sharedStepId: string,
    actionIds: string[],
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(
      "PUT",
      `/api/shared-steps/${sharedStepId}/actions/reorder`,
      { actionIds },
    );
  }
}
