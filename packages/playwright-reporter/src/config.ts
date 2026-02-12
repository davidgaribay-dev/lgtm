export interface LgtmReporterConfig {
  /** LGTM API base URL (e.g., "https://lgtm.example.com"). Falls back to LGTM_API_URL env var. */
  apiUrl: string;
  /** LGTM API token (format: lgtm_v1_...). Falls back to LGTM_API_TOKEN env var. */
  apiToken?: string;
  /** Project/team key (e.g., "ENG"). Falls back to LGTM_PROJECT_KEY env var. */
  projectKey: string;
  /** Optional environment name to match against existing environments in LGTM. */
  environment?: string;
  /** Optional cycle name to match against existing team cycles in LGTM. */
  cycle?: string;
  /** Custom test run name. Defaults to "Playwright Run <ISO timestamp>". */
  runName?: string;
  /** Auto-create test cases in LGTM for tests not yet tracked. Defaults to true. */
  autoCreateTestCases?: boolean;
  /** Auto-create defects in LGTM for failed tests. Defaults to false. */
  autoCreateDefects?: boolean;
  /** Upload stdout/stderr as run logs. Defaults to true. */
  uploadLogs?: boolean;
  /** Upload test attachments (screenshots, videos, traces) to LGTM. Defaults to true. */
  uploadAttachments?: boolean;
  /** Enable verbose debug logging. Defaults to false. Falls back to LGTM_DEBUG env var. */
  debug?: boolean;
}

export interface ResolvedConfig {
  apiUrl: string;
  apiToken: string;
  projectKey: string;
  environment?: string;
  cycle?: string;
  runName: string;
  autoCreateTestCases: boolean;
  autoCreateDefects: boolean;
  uploadLogs: boolean;
  uploadAttachments: boolean;
  debug: boolean;
}

export function resolveConfig(
  options: Record<string, unknown> = {},
): ResolvedConfig {
  const apiUrl =
    (options.apiUrl as string) || process.env.LGTM_API_URL || "";
  const apiToken =
    (options.apiToken as string) || process.env.LGTM_API_TOKEN || "";
  const projectKey =
    (options.projectKey as string) || process.env.LGTM_PROJECT_KEY || "";

  if (!apiUrl) {
    throw new Error(
      "[lgtm] Missing required config: apiUrl (or LGTM_API_URL env var)",
    );
  }
  if (!apiToken) {
    throw new Error(
      "[lgtm] Missing required config: apiToken (or LGTM_API_TOKEN env var)",
    );
  }
  if (!projectKey) {
    throw new Error(
      "[lgtm] Missing required config: projectKey (or LGTM_PROJECT_KEY env var)",
    );
  }

  return {
    apiUrl,
    apiToken,
    projectKey,
    environment: options.environment as string | undefined,
    cycle: options.cycle as string | undefined,
    runName:
      (options.runName as string) ||
      `Playwright Run ${new Date().toISOString()}`,
    autoCreateTestCases: options.autoCreateTestCases !== false,
    autoCreateDefects: options.autoCreateDefects === true,
    uploadLogs: options.uploadLogs !== false,
    uploadAttachments: options.uploadAttachments !== false,
    debug:
      options.debug === true || process.env.LGTM_DEBUG === "true",
  };
}
