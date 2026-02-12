import { LgtmApiClient } from "@lgtm/shared";
import type { Project } from "@lgtm/shared";
import { NotFoundError } from "./errors.js";

/** Resolve a project key (e.g. "ENG") to a project ID. */
export async function resolveProjectId(
  client: LgtmApiClient,
  projectKey: string,
): Promise<{ project: Project; projectId: string }> {
  const teams = await client.getTeams();
  const match = teams.find(
    (t) => t.key.toLowerCase() === projectKey.toLowerCase(),
  );

  if (!match) {
    const available = teams.map((t) => t.key).join(", ");
    throw new NotFoundError(
      `Project "${projectKey}" not found. Available projects: ${available || "none"}`,
    );
  }

  return { project: match, projectId: match.id };
}

/** Resolve an environment name to an ID within a project. */
export async function resolveEnvironmentId(
  client: LgtmApiClient,
  projectId: string,
  envName: string,
): Promise<string> {
  const envs = await client.getEnvironments(projectId);
  const match = envs.find(
    (e) => e.name.toLowerCase() === envName.toLowerCase(),
  );

  if (!match) {
    const available = envs.map((e) => e.name).join(", ");
    throw new NotFoundError(
      `Environment "${envName}" not found. Available: ${available || "none"}`,
    );
  }

  return match.id;
}

/** Resolve a cycle name to an ID within a project. */
export async function resolveCycleId(
  client: LgtmApiClient,
  projectId: string,
  cycleName: string,
): Promise<string> {
  const cycles = await client.getCycles(projectId);
  const match = cycles.find(
    (c) => c.name.toLowerCase() === cycleName.toLowerCase(),
  );

  if (!match) {
    const available = cycles.map((c) => c.name).join(", ");
    throw new NotFoundError(
      `Cycle "${cycleName}" not found. Available: ${available || "none"}`,
    );
  }

  return match.id;
}

/**
 * Flatten tree data from the test-repo endpoint into a flat array of test cases.
 * The endpoint returns { treeData, testCases } — we use the flat testCases array.
 */
export function flattenTestCases(
  data: unknown,
): Array<Record<string, unknown>> {
  if (
    data &&
    typeof data === "object" &&
    "testCases" in data &&
    Array.isArray((data as Record<string, unknown>).testCases)
  ) {
    return (data as Record<string, unknown>).testCases as Array<
      Record<string, unknown>
    >;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return [];
}
