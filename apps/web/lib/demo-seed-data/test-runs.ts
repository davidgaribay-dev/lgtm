import * as schema from "@/db/schema";
import { type SeedDb, uid, daysAgo, hoursAgo } from "./helpers";
import type { UserIds } from "./users";
import type { TeamIds, CycleIds, WorkspaceCycleIds, EnvironmentIds } from "./teams";
import type { TestCaseRef } from "./test-cases";

// ── Public interfaces ──

export interface TestResultRef {
  id: string;
  testRunId: string;
  testCaseId: string;
  status: string;
  teamKey: string;
}

export interface TestRunIds {
  webTr1: string;
  webTr2: string;
  webTr3: string;
  mobTr1: string;
  mobTr2: string;
  apiTr1: string;
  apiTr2: string;
  apiTr3: string;
}

// ── Helpers ──

/** Seeded random number generator (simple LCG) for deterministic distributions. */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Pick a random integer between min and max (inclusive). */
function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

type ResultStatus = "passed" | "failed" | "blocked" | "skipped" | "untested";

/**
 * Assign a result status to each test case based on the run's distribution profile.
 * Uses deterministic RNG so seed data is reproducible.
 */
function assignResultStatuses(
  count: number,
  profile: "passed" | "failed" | "in_progress" | "pending",
  rng: () => number,
): ResultStatus[] {
  if (profile === "pending") {
    return Array.from({ length: count }, () => "untested" as ResultStatus);
  }

  // Approximate target percentages
  const targets: Record<string, { passed: number; failed: number; blocked: number; skipped: number; untested: number }> = {
    passed: { passed: 0.8, failed: 0, blocked: 0.1, skipped: 0.1, untested: 0 },
    failed: { passed: 0.6, failed: 0.2, blocked: 0.1, skipped: 0.1, untested: 0 },
    in_progress: { passed: 0.4, failed: 0.1, blocked: 0.05, skipped: 0, untested: 0.45 },
  };

  const t = targets[profile];
  const statuses: ResultStatus[] = [];

  for (let i = 0; i < count; i++) {
    const r = rng();
    let cumulative = 0;
    cumulative += t.passed;
    if (r < cumulative) { statuses.push("passed"); continue; }
    cumulative += t.failed;
    if (r < cumulative) { statuses.push("failed"); continue; }
    cumulative += t.blocked;
    if (r < cumulative) { statuses.push("blocked"); continue; }
    cumulative += t.skipped;
    if (r < cumulative) { statuses.push("skipped"); continue; }
    statuses.push("untested");
  }

  return statuses;
}

const failedComments = [
  "Assertion failed: expected 200 got 500",
  "Element not found after 30s timeout",
  "Response payload missing required field 'id'",
  "Unexpected redirect to login page",
  "Database constraint violation on insert",
  "Race condition: stale data returned after update",
];

const blockedComments = [
  "Blocked by auth service downtime",
  "Blocked: prerequisite test data not available",
  "Blocked by unresolved deployment issue",
  "Blocked: third-party API rate limit exceeded",
  "Blocked by environment configuration issue",
];

function pickComment(
  rng: () => number,
  status: ResultStatus,
): string | null {
  if (status !== "failed" && status !== "blocked") return null;
  // ~30% chance of having a comment
  if (rng() > 0.3) return null;
  const pool = status === "failed" ? failedComments : blockedComments;
  return pool[Math.floor(rng() * pool.length)];
}

// ── Main seed function ──

export async function seedTestRuns(
  db: SeedDb,
  u: UserIds,
  t: TeamIds,
  c: CycleIds,
  wc: WorkspaceCycleIds,
  env: EnvironmentIds,
  testCases: TestCaseRef[],
): Promise<{ testRunIds: TestRunIds; testResults: TestResultRef[] }> {
  const rng = seededRandom(42);

  // ── Filter test cases by team ──
  const webCases = testCases.filter((tc) => tc.teamKey === "WEB");
  const mobCases = testCases.filter((tc) => tc.teamKey === "MOB");
  const apiCases = testCases.filter((tc) => tc.teamKey === "API");

  // Team member pools for rotating executedBy
  const webMembers = [u.marcus, u.david, u.emily, u.aisha, u.sarah];
  const mobMembers = [u.priya, u.emily, u.alex, u.jessica, u.aisha];
  const apiMembers = [u.david, u.alex, u.marcus, u.priya, u.sarah];

  // ── Test Plans ──

  const planIds = {
    webRegression: uid(),
    webSmoke: uid(),
    mobRelease: uid(),
    mobIos: uid(),
    apiContract: uid(),
    apiSecurity: uid(),
  };

  await db.insert(schema.testPlan).values([
    {
      id: planIds.webRegression,
      name: "Regression Suite - Sprint 24",
      description: "Full regression test suite for Sprint 24 release covering all critical web platform functionality",
      projectId: t.web,
      status: "active",
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(5),
    },
    {
      id: planIds.webSmoke,
      name: "Smoke Test Suite",
      description: "Quick smoke tests to verify core functionality after deployment",
      projectId: t.web,
      status: "active",
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(10),
    },
    {
      id: planIds.mobRelease,
      name: "Release Candidate Validation",
      description: "Comprehensive validation suite for mobile app release candidates",
      projectId: t.mob,
      status: "active",
      createdBy: u.sarah,
      updatedBy: u.priya,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(6),
    },
    {
      id: planIds.mobIos,
      name: "iOS Certification Tests",
      description: "Apple App Store certification requirements and platform-specific test cases",
      projectId: t.mob,
      status: "draft",
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      id: planIds.apiContract,
      name: "API Contract Tests",
      description: "Contract validation tests for all public API v2 endpoints ensuring backward compatibility",
      projectId: t.api,
      status: "active",
      createdBy: u.david,
      updatedBy: u.alex,
      createdAt: daysAgo(55),
      updatedAt: daysAgo(3),
    },
    {
      id: planIds.apiSecurity,
      name: "Security Audit Plan",
      description: "Security-focused test plan covering authentication, authorization, injection, and data exposure",
      projectId: t.api,
      status: "draft",
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
  ]);

  // ── Test Plan Cases ──

  const planCaseRows: {
    id: string;
    testPlanId: string;
    testCaseId: string;
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  // WEB Regression: first 10 web cases
  const webRegressionCases = webCases.slice(0, 10);
  webRegressionCases.forEach((tc, i) => {
    planCaseRows.push({
      id: uid(),
      testPlanId: planIds.webRegression,
      testCaseId: tc.id,
      displayOrder: i,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(20),
    });
  });

  // WEB Smoke: first 5 web cases (critical/smoke)
  const webSmokeCases = webCases.slice(0, 5);
  webSmokeCases.forEach((tc, i) => {
    planCaseRows.push({
      id: uid(),
      testPlanId: planIds.webSmoke,
      testCaseId: tc.id,
      displayOrder: i,
      createdAt: daysAgo(60),
      updatedAt: daysAgo(60),
    });
  });

  // MOB Release: first 12 mob cases
  const mobReleaseCases = mobCases.slice(0, 12);
  mobReleaseCases.forEach((tc, i) => {
    planCaseRows.push({
      id: uid(),
      testPlanId: planIds.mobRelease,
      testCaseId: tc.id,
      displayOrder: i,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    });
  });

  // MOB iOS: first 8 mob cases
  const mobIosCases = mobCases.slice(0, 8);
  mobIosCases.forEach((tc, i) => {
    planCaseRows.push({
      id: uid(),
      testPlanId: planIds.mobIos,
      testCaseId: tc.id,
      displayOrder: i,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    });
  });

  // API Contract: first 10 api cases
  const apiContractCases = apiCases.slice(0, 10);
  apiContractCases.forEach((tc, i) => {
    planCaseRows.push({
      id: uid(),
      testPlanId: planIds.apiContract,
      testCaseId: tc.id,
      displayOrder: i,
      createdAt: daysAgo(55),
      updatedAt: daysAgo(55),
    });
  });

  // API Security: last 5 api cases (security-focused)
  const apiSecurityCases = apiCases.slice(-5);
  apiSecurityCases.forEach((tc, i) => {
    planCaseRows.push({
      id: uid(),
      testPlanId: planIds.apiSecurity,
      testCaseId: tc.id,
      displayOrder: i,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    });
  });

  await db.insert(schema.testPlanCase).values(planCaseRows);

  // ── Test Runs ──

  const runIds: TestRunIds = {
    webTr1: uid(),
    webTr2: uid(),
    webTr3: uid(),
    mobTr1: uid(),
    mobTr2: uid(),
    apiTr1: uid(),
    apiTr2: uid(),
    apiTr3: uid(),
  };

  interface RunDef {
    id: string;
    name: string;
    runNumber: number;
    runKey: string;
    description: string | null;
    projectId: string;
    testPlanId: string | null;
    status: string;
    environmentId: string;
    cycleId: string;
    workspaceCycleId: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    executedBy: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
    teamKey: string;
    profile: "passed" | "failed" | "in_progress" | "pending";
    members: string[];
  }

  const runDefs: RunDef[] = [
    {
      id: runIds.webTr1,
      name: "Sprint 23 Regression",
      runNumber: 1,
      runKey: "WEB-TR-1",
      description: "Full regression run for Sprint 23 release",
      projectId: t.web,
      testPlanId: planIds.webRegression,
      status: "passed",
      environmentId: env.webQa,
      cycleId: c.webSprint23,
      workspaceCycleId: wc.release21,
      startedAt: daysAgo(50),
      completedAt: daysAgo(49),
      executedBy: u.marcus,
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(50),
      updatedAt: daysAgo(49),
      teamKey: "WEB",
      profile: "passed",
      members: webMembers,
    },
    {
      id: runIds.webTr2,
      name: "Sprint 24 Smoke",
      runNumber: 2,
      runKey: "WEB-TR-2",
      description: "Smoke test after Sprint 24 staging deployment",
      projectId: t.web,
      testPlanId: planIds.webSmoke,
      status: "failed",
      environmentId: env.webStaging,
      cycleId: c.webSprint24,
      workspaceCycleId: wc.release21,
      startedAt: daysAgo(5),
      completedAt: daysAgo(5),
      executedBy: u.david,
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
      teamKey: "WEB",
      profile: "failed",
      members: webMembers,
    },
    {
      id: runIds.webTr3,
      name: "Sprint 24 Full Regression",
      runNumber: 3,
      runKey: "WEB-TR-3",
      description: "Complete regression suite for Sprint 24 QA sign-off",
      projectId: t.web,
      testPlanId: planIds.webRegression,
      status: "in_progress",
      environmentId: env.webQa,
      cycleId: c.webSprint24,
      workspaceCycleId: wc.release21,
      startedAt: daysAgo(2),
      completedAt: null,
      executedBy: u.marcus,
      createdBy: u.marcus,
      updatedBy: u.marcus,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(1),
      teamKey: "WEB",
      profile: "in_progress",
      members: webMembers,
    },
    {
      id: runIds.mobTr1,
      name: "Release 2.1 Validation",
      runNumber: 1,
      runKey: "MOB-TR-1",
      description: "Full validation suite for Mobile App release 2.1",
      projectId: t.mob,
      testPlanId: planIds.mobRelease,
      status: "passed",
      environmentId: env.mobStaging,
      cycleId: c.mobSprint23,
      workspaceCycleId: wc.release21,
      startedAt: daysAgo(48),
      completedAt: daysAgo(47),
      executedBy: u.priya,
      createdBy: u.priya,
      updatedBy: u.priya,
      createdAt: daysAgo(48),
      updatedAt: daysAgo(47),
      teamKey: "MOB",
      profile: "passed",
      members: mobMembers,
    },
    {
      id: runIds.mobTr2,
      name: "Sprint 24 Mobile Smoke",
      runNumber: 2,
      runKey: "MOB-TR-2",
      description: "Quick smoke tests on development build for Sprint 24",
      projectId: t.mob,
      testPlanId: null,
      status: "failed",
      environmentId: env.mobDev,
      cycleId: c.mobSprint24,
      workspaceCycleId: null,
      startedAt: daysAgo(6),
      completedAt: daysAgo(6),
      executedBy: u.emily,
      createdBy: u.emily,
      updatedBy: u.emily,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
      teamKey: "MOB",
      profile: "failed",
      members: mobMembers,
    },
    {
      id: runIds.apiTr1,
      name: "API v2 Contract Tests",
      runNumber: 1,
      runKey: "API-TR-1",
      description: "Contract validation for all public API v2 endpoints",
      projectId: t.api,
      testPlanId: planIds.apiContract,
      status: "passed",
      environmentId: env.apiQa,
      cycleId: c.apiSprint23,
      workspaceCycleId: wc.release21,
      startedAt: daysAgo(52),
      completedAt: daysAgo(51),
      executedBy: u.david,
      createdBy: u.david,
      updatedBy: u.david,
      createdAt: daysAgo(52),
      updatedAt: daysAgo(51),
      teamKey: "API",
      profile: "passed",
      members: apiMembers,
    },
    {
      id: runIds.apiTr2,
      name: "Sprint 24 Security Audit",
      runNumber: 2,
      runKey: "API-TR-2",
      description: "Security-focused testing for Sprint 24 API changes",
      projectId: t.api,
      testPlanId: planIds.apiSecurity,
      status: "in_progress",
      environmentId: env.apiStaging,
      cycleId: c.apiSprint24,
      workspaceCycleId: wc.release21,
      startedAt: daysAgo(3),
      completedAt: null,
      executedBy: u.alex,
      createdBy: u.alex,
      updatedBy: u.alex,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
      teamKey: "API",
      profile: "in_progress",
      members: apiMembers,
    },
    {
      id: runIds.apiTr3,
      name: "Sprint 24 Regression",
      runNumber: 3,
      runKey: "API-TR-3",
      description: "Full API regression suite for Sprint 24",
      projectId: t.api,
      testPlanId: planIds.apiContract,
      status: "pending",
      environmentId: env.apiQa,
      cycleId: c.apiSprint24,
      workspaceCycleId: null,
      startedAt: null,
      completedAt: null,
      executedBy: null,
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
      teamKey: "API",
      profile: "pending",
      members: apiMembers,
    },
  ];

  await db.insert(schema.testRun).values(
    runDefs.map((r) => ({
      id: r.id,
      name: r.name,
      runNumber: r.runNumber,
      runKey: r.runKey,
      description: r.description,
      projectId: r.projectId,
      testPlanId: r.testPlanId,
      status: r.status,
      environmentId: r.environmentId,
      cycleId: r.cycleId,
      workspaceCycleId: r.workspaceCycleId,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      executedBy: r.executedBy,
      createdBy: r.createdBy,
      updatedBy: r.updatedBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  );

  // ── Test Results & Step Results ──

  const allTestResults: TestResultRef[] = [];
  const resultRows: {
    id: string;
    testRunId: string;
    testCaseId: string;
    status: string;
    source: string;
    executedBy: string | null;
    executedAt: Date | null;
    duration: number | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];
  const stepResultRows: {
    id: string;
    testResultId: string;
    testStepId: string;
    status: string;
    actualResult: string | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[] = [];

  // Map team key to cases
  const teamCasesMap: Record<string, TestCaseRef[]> = {
    WEB: webCases,
    MOB: mobCases,
    API: apiCases,
  };

  for (const run of runDefs) {
    const cases = teamCasesMap[run.teamKey];
    const statuses = assignResultStatuses(cases.length, run.profile, rng);

    cases.forEach((tc, idx) => {
      const status = statuses[idx];
      const resultId = uid();

      // Rotate executedBy through team members for non-untested results
      const executor =
        status === "untested"
          ? null
          : run.members[idx % run.members.length];

      // executedAt: within a few hours of the run's startedAt
      const executedAt =
        status === "untested" || !run.startedAt
          ? null
          : new Date(run.startedAt.getTime() + randInt(rng, 1, 8) * 3_600_000);

      const duration =
        status === "untested" ? null : randInt(rng, 200, 15000);

      const comment = pickComment(rng, status);

      const resultCreatedAt = run.startedAt ?? run.createdAt;

      resultRows.push({
        id: resultId,
        testRunId: run.id,
        testCaseId: tc.id,
        status,
        source: "manual",
        executedBy: executor,
        executedAt,
        duration,
        comment,
        createdAt: resultCreatedAt,
        updatedAt: executedAt ?? resultCreatedAt,
      });

      allTestResults.push({
        id: resultId,
        testRunId: run.id,
        testCaseId: tc.id,
        status,
        teamKey: run.teamKey,
      });

      // ── Step Results ──
      if (status !== "untested" && tc.stepIds.length > 0) {
        const stepCount = tc.stepIds.length;
        const stepCreatedAt = executedAt ?? resultCreatedAt;

        if (status === "passed") {
          // All steps passed
          tc.stepIds.forEach((stepId) => {
            stepResultRows.push({
              id: uid(),
              testResultId: resultId,
              testStepId: stepId,
              status: "passed",
              actualResult: null,
              comment: null,
              createdAt: stepCreatedAt,
              updatedAt: stepCreatedAt,
            });
          });
        } else if (status === "failed") {
          // All steps passed except last 1-2 which failed
          const failStart = Math.max(0, stepCount - randInt(rng, 1, 2));
          tc.stepIds.forEach((stepId, si) => {
            stepResultRows.push({
              id: uid(),
              testResultId: resultId,
              testStepId: stepId,
              status: si >= failStart ? "failed" : "passed",
              actualResult:
                si >= failStart
                  ? "Expected success message but got error timeout"
                  : null,
              comment: null,
              createdAt: stepCreatedAt,
              updatedAt: stepCreatedAt,
            });
          });
        } else if (status === "blocked") {
          // First few steps passed, rest blocked
          const blockedStart = Math.max(1, Math.floor(stepCount * 0.4));
          tc.stepIds.forEach((stepId, si) => {
            stepResultRows.push({
              id: uid(),
              testResultId: resultId,
              testStepId: stepId,
              status: si < blockedStart ? "passed" : "blocked",
              actualResult: null,
              comment:
                si === blockedStart
                  ? "Blocked by upstream dependency failure"
                  : null,
              createdAt: stepCreatedAt,
              updatedAt: stepCreatedAt,
            });
          });
        } else if (status === "skipped") {
          // All steps skipped
          tc.stepIds.forEach((stepId) => {
            stepResultRows.push({
              id: uid(),
              testResultId: resultId,
              testStepId: stepId,
              status: "skipped",
              actualResult: null,
              comment: null,
              createdAt: stepCreatedAt,
              updatedAt: stepCreatedAt,
            });
          });
        }
      }
    });
  }

  // Bulk insert results
  await db.insert(schema.testResult).values(resultRows);

  // Bulk insert step results (may be large, insert in chunks of 500)
  for (let i = 0; i < stepResultRows.length; i += 500) {
    await db
      .insert(schema.testStepResult)
      .values(stepResultRows.slice(i, i + 500));
  }

  return { testRunIds: runIds, testResults: allTestResults };
}
