import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { SeedDb } from "./helpers";
import { uid } from "./helpers";
import { generateUserIds, seedUsers } from "./users";
import {
  generateTeamIds,
  generateCycleIds,
  generateWorkspaceCycleIds,
  generateEnvironmentIds,
  seedTeams,
} from "./teams";
import { seedTestCases } from "./test-cases";
import { seedTestRuns } from "./test-runs";
import { seedDefects } from "./defects";
import { seedComments, type CommentTargets } from "./comments";

/**
 * Seeds the database with rich, realistic demo data.
 * Call after `reset(db, schema)` to populate from scratch.
 */
export async function seedAllData(
  db: SeedDb,
): Promise<{ userId: string; orgId: string }> {
  // ── Generate all top-level IDs ──
  const u = generateUserIds();
  const orgId = uid();
  const t = generateTeamIds();
  const c = generateCycleIds();
  const wc = generateWorkspaceCycleIds();
  const env = generateEnvironmentIds();

  // ── 1. Users, accounts, organization, org members ──
  await seedUsers(db, u, orgId);

  // ── 2. Teams, project members, environments, cycles ──
  await seedTeams(db, u, orgId, t, c, wc, env);

  // ── 3. Suites, sections, test cases, steps, tags ──
  const testCases = await seedTestCases(db, u, t, c, wc);

  // ── 4. Test plans, test runs, test results, step results ──
  const { testRunIds, testResults } = await seedTestRuns(
    db,
    u,
    t,
    c,
    wc,
    env,
    testCases,
  );

  // ── 5. Defects ──
  const defectIds = await seedDefects(
    db,
    u,
    t,
    c,
    env,
    testRunIds,
    testResults,
  );

  // ── 6. Update project counters ──
  const webCaseCount = testCases.filter((tc) => tc.teamKey === "WEB").length;
  const mobCaseCount = testCases.filter((tc) => tc.teamKey === "MOB").length;
  const apiCaseCount = testCases.filter((tc) => tc.teamKey === "API").length;

  await Promise.all([
    db
      .update(schema.project)
      .set({
        nextTestCaseNumber: webCaseCount + 1,
        nextRunNumber: 4, // WEB-TR-1..3
        nextDefectNumber: defectIds.web.length + 1,
      })
      .where(eq(schema.project.id, t.web)),
    db
      .update(schema.project)
      .set({
        nextTestCaseNumber: mobCaseCount + 1,
        nextRunNumber: 3, // MOB-TR-1..2
        nextDefectNumber: defectIds.mob.length + 1,
      })
      .where(eq(schema.project.id, t.mob)),
    db
      .update(schema.project)
      .set({
        nextTestCaseNumber: apiCaseCount + 1,
        nextRunNumber: 4, // API-TR-1..3
        nextDefectNumber: defectIds.api.length + 1,
      })
      .where(eq(schema.project.id, t.api)),
  ]);

  // ── 7. Comments, reactions, mentions ──
  const webCases = testCases.filter((tc) => tc.teamKey === "WEB");
  const mobCases = testCases.filter((tc) => tc.teamKey === "MOB");
  const apiCases = testCases.filter((tc) => tc.teamKey === "API");

  const targets: CommentTargets = {
    webDefectIds: defectIds.web,
    mobDefectIds: defectIds.mob,
    apiDefectIds: defectIds.api,
    webTestCaseIds: webCases.slice(0, 3).map((tc) => tc.id),
    mobTestCaseIds: mobCases.slice(0, 3).map((tc) => tc.id),
    apiTestCaseIds: apiCases.slice(0, 3).map((tc) => tc.id),
    failedResultIds: testResults
      .filter((r) => r.status === "failed")
      .slice(0, 3)
      .map((r) => ({ id: r.id, teamKey: r.teamKey })),
  };

  await seedComments(db, u, t, targets);

  return { userId: u.demo, orgId };
}
