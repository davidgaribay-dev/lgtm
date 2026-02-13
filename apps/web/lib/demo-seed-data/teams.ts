import * as schema from "@/db/schema";
import { type SeedDb, uid, daysAgo } from "./helpers";
import type { UserIds } from "./users";

export interface TeamIds {
  web: string;
  mob: string;
  api: string;
}

export interface CycleIds {
  webSprint23: string;
  webSprint24: string;
  webSprint25: string;
  mobSprint23: string;
  mobSprint24: string;
  mobSprint25: string;
  apiSprint23: string;
  apiSprint24: string;
  apiSprint25: string;
}

export interface WorkspaceCycleIds {
  release21: string;
  release22: string;
}

export interface EnvironmentIds {
  webDev: string;
  webStaging: string;
  webQa: string;
  webProd: string;
  mobDev: string;
  mobStaging: string;
  mobQa: string;
  apiDev: string;
  apiStaging: string;
  apiQa: string;
  apiProd: string;
}

export function generateTeamIds(): TeamIds {
  return { web: uid(), mob: uid(), api: uid() };
}

export function generateCycleIds(): CycleIds {
  return {
    webSprint23: uid(),
    webSprint24: uid(),
    webSprint25: uid(),
    mobSprint23: uid(),
    mobSprint24: uid(),
    mobSprint25: uid(),
    apiSprint23: uid(),
    apiSprint24: uid(),
    apiSprint25: uid(),
  };
}

export function generateWorkspaceCycleIds(): WorkspaceCycleIds {
  return { release21: uid(), release22: uid() };
}

export function generateEnvironmentIds(): EnvironmentIds {
  return {
    webDev: uid(),
    webStaging: uid(),
    webQa: uid(),
    webProd: uid(),
    mobDev: uid(),
    mobStaging: uid(),
    mobQa: uid(),
    apiDev: uid(),
    apiStaging: uid(),
    apiQa: uid(),
    apiProd: uid(),
  };
}

export async function seedTeams(
  db: SeedDb,
  u: UserIds,
  orgId: string,
  t: TeamIds,
  c: CycleIds,
  wc: WorkspaceCycleIds,
  env: EnvironmentIds,
) {
  // ── Workspace cycles (org-level) ──
  await db.insert(schema.workspaceCycle).values([
    {
      id: wc.release21,
      name: "Release 2.1",
      description: "Major release with new dashboard and API v2 endpoints",
      status: "active",
      isCurrent: true,
      startDate: daysAgo(45),
      endDate: daysAgo(-5),
      displayOrder: 0,
      organizationId: orgId,
      createdBy: u.demo,
      updatedBy: u.demo,
      createdAt: daysAgo(50),
      updatedAt: daysAgo(10),
    },
    {
      id: wc.release22,
      name: "Release 2.2",
      description: "Performance improvements and mobile app v3",
      status: "planned",
      isCurrent: false,
      startDate: daysAgo(-5),
      endDate: daysAgo(-50),
      displayOrder: 1,
      organizationId: orgId,
      createdBy: u.demo,
      updatedBy: u.demo,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(30),
    },
  ]);

  // ── Projects (teams) ──
  await db.insert(schema.project).values([
    {
      id: t.web,
      name: "Web Platform",
      key: "WEB",
      description: "Frontend web application — React/Next.js dashboard, auth flows, and reporting",
      organizationId: orgId,
      displayOrder: 0,
      createdBy: u.demo,
      updatedBy: u.demo,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(1),
    },
    {
      id: t.mob,
      name: "Mobile App",
      key: "MOB",
      description: "iOS and Android mobile application — native UI, push notifications, offline sync",
      organizationId: orgId,
      displayOrder: 1,
      createdBy: u.demo,
      updatedBy: u.sarah,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(2),
    },
    {
      id: t.api,
      name: "API Services",
      key: "API",
      description: "Backend REST API — user management, data endpoints, webhooks, rate limiting",
      organizationId: orgId,
      displayOrder: 2,
      createdBy: u.demo,
      updatedBy: u.alex,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(1),
    },
  ]);

  // ── Project members ──
  const memberships: { projectId: string; userId: string; role: string }[] = [
    // WEB team
    { projectId: t.web, userId: u.demo, role: "team_owner" },
    { projectId: t.web, userId: u.sarah, role: "team_admin" },
    { projectId: t.web, userId: u.marcus, role: "team_member" },
    { projectId: t.web, userId: u.emily, role: "team_member" },
    { projectId: t.web, userId: u.david, role: "team_member" },
    { projectId: t.web, userId: u.alex, role: "team_member" },
    { projectId: t.web, userId: u.jessica, role: "team_viewer" },
    { projectId: t.web, userId: u.ryan, role: "team_viewer" },
    { projectId: t.web, userId: u.aisha, role: "team_member" },
    // MOB team
    { projectId: t.mob, userId: u.demo, role: "team_owner" },
    { projectId: t.mob, userId: u.sarah, role: "team_admin" },
    { projectId: t.mob, userId: u.emily, role: "team_member" },
    { projectId: t.mob, userId: u.priya, role: "team_member" },
    { projectId: t.mob, userId: u.alex, role: "team_member" },
    { projectId: t.mob, userId: u.jessica, role: "team_member" },
    { projectId: t.mob, userId: u.ryan, role: "team_viewer" },
    { projectId: t.mob, userId: u.aisha, role: "team_member" },
    // API team
    { projectId: t.api, userId: u.demo, role: "team_owner" },
    { projectId: t.api, userId: u.sarah, role: "team_admin" },
    { projectId: t.api, userId: u.marcus, role: "team_member" },
    { projectId: t.api, userId: u.david, role: "team_member" },
    { projectId: t.api, userId: u.priya, role: "team_member" },
    { projectId: t.api, userId: u.alex, role: "team_member" },
    { projectId: t.api, userId: u.ryan, role: "team_viewer" },
  ];

  await db.insert(schema.projectMember).values(
    memberships.map((m) => ({
      id: uid(),
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      createdBy: u.demo,
      updatedBy: u.demo,
      createdAt: daysAgo(85),
      updatedAt: daysAgo(85),
    })),
  );

  // ── Environments ──
  await db.insert(schema.environment).values([
    // WEB
    { id: env.webDev, name: "Development", url: "https://dev.acme-web.example.com", type: "development", isDefault: false, displayOrder: 0, projectId: t.web, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.webStaging, name: "Staging", url: "https://staging.acme-web.example.com", type: "staging", isDefault: false, displayOrder: 1, projectId: t.web, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.webQa, name: "QA", url: "https://qa.acme-web.example.com", type: "qa", isDefault: true, displayOrder: 2, projectId: t.web, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.webProd, name: "Production", url: "https://acme-web.example.com", type: "production", isDefault: false, displayOrder: 3, projectId: t.web, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    // MOB
    { id: env.mobDev, name: "Development", url: "https://dev-api.acme-mobile.example.com", type: "development", isDefault: false, displayOrder: 0, projectId: t.mob, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.mobStaging, name: "Staging", url: "https://staging-api.acme-mobile.example.com", type: "staging", isDefault: true, displayOrder: 1, projectId: t.mob, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.mobQa, name: "QA", url: "https://qa-api.acme-mobile.example.com", type: "qa", isDefault: false, displayOrder: 2, projectId: t.mob, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    // API
    { id: env.apiDev, name: "Development", url: "https://dev-api.acme.example.com", type: "development", isDefault: false, displayOrder: 0, projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.apiStaging, name: "Staging", url: "https://staging-api.acme.example.com", type: "staging", isDefault: false, displayOrder: 1, projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.apiQa, name: "QA", url: "https://qa-api.acme.example.com", type: "qa", isDefault: true, displayOrder: 2, projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
    { id: env.apiProd, name: "Production", url: "https://api.acme.example.com", type: "production", isDefault: false, displayOrder: 3, projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(80), updatedAt: daysAgo(80) },
  ]);

  // ── Cycles (per team: Sprint 23 completed, Sprint 24 active, Sprint 25 planned) ──
  const cycleDefs = [
    // WEB
    { id: c.webSprint23, name: "Sprint 23", status: "completed", isCurrent: false, startDate: daysAgo(60), endDate: daysAgo(46), projectId: t.web },
    { id: c.webSprint24, name: "Sprint 24", status: "active", isCurrent: true, startDate: daysAgo(14), endDate: daysAgo(-1), projectId: t.web },
    { id: c.webSprint25, name: "Sprint 25", status: "planned", isCurrent: false, startDate: daysAgo(-1), endDate: daysAgo(-15), projectId: t.web },
    // MOB
    { id: c.mobSprint23, name: "Sprint 23", status: "completed", isCurrent: false, startDate: daysAgo(60), endDate: daysAgo(46), projectId: t.mob },
    { id: c.mobSprint24, name: "Sprint 24", status: "active", isCurrent: true, startDate: daysAgo(14), endDate: daysAgo(-1), projectId: t.mob },
    { id: c.mobSprint25, name: "Sprint 25", status: "planned", isCurrent: false, startDate: daysAgo(-1), endDate: daysAgo(-15), projectId: t.mob },
    // API
    { id: c.apiSprint23, name: "Sprint 23", status: "completed", isCurrent: false, startDate: daysAgo(60), endDate: daysAgo(46), projectId: t.api },
    { id: c.apiSprint24, name: "Sprint 24", status: "active", isCurrent: true, startDate: daysAgo(14), endDate: daysAgo(-1), projectId: t.api },
    { id: c.apiSprint25, name: "Sprint 25", status: "planned", isCurrent: false, startDate: daysAgo(-1), endDate: daysAgo(-15), projectId: t.api },
  ];

  await db.insert(schema.cycle).values(
    cycleDefs.map((cyc, i) => ({
      ...cyc,
      displayOrder: i % 3,
      createdBy: u.sarah,
      updatedBy: u.sarah,
      createdAt: daysAgo(65),
      updatedAt: daysAgo(14),
    })),
  );
}
