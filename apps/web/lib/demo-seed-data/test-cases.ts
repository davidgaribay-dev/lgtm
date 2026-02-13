import * as schema from "@/db/schema";
import { type SeedDb, uid, daysAgo } from "./helpers";
import type { UserIds } from "./users";
import type { TeamIds, CycleIds, WorkspaceCycleIds } from "./teams";

// ────────────────────────────────────────────────────────────
// Exported ID interfaces
// ────────────────────────────────────────────────────────────

export interface SuiteIds {
  // WEB
  webAuth: string;
  webDashboard: string;
  webUserMgmt: string;
  // MOB
  mobNav: string;
  mobPush: string;
  // API
  apiUser: string;
  apiData: string;
  apiWebhook: string;
}

export interface SectionIds {
  // WEB — Auth suite
  webLoginFlow: string;
  webEmailLogin: string;
  webPasswordReset: string;
  webOAuth: string;
  webSessionMgmt: string;
  // WEB — Dashboard suite
  webDashboardWidgets: string;
  webCharts: string;
  webMetrics: string;
  webReportGen: string;
  // WEB — User Mgmt suite
  webUserProfiles: string;
  webRoleMgmt: string;
  webPermissionMatrix: string;
  // MOB — Nav suite
  mobTabNav: string;
  mobDeepLinks: string;
  mobUniversalLinks: string;
  mobAppLinks: string;
  // MOB — Push suite
  mobNotifDelivery: string;
  mobInAppAlerts: string;
  mobNotifSettings: string;
  // API — User suite
  apiCrudOps: string;
  apiAuthentication: string;
  apiTokenValidation: string;
  apiRateLimiting: string;
  // API — Data suite
  apiQueryParams: string;
  apiPagination: string;
  apiCursorBased: string;
  apiOffsetBased: string;
  apiFiltering: string;
  // API — Webhook suite
  apiEventDelivery: string;
  apiRetryLogic: string;
}

export interface TagIds {
  // WEB
  webSmoke: string;
  webRegression: string;
  webP1Blocker: string;
  webAccessibility: string;
  webResponsive: string;
  // MOB
  mobSmoke: string;
  mobRegression: string;
  mobP1Blocker: string;
  mobIosOnly: string;
  mobAndroidOnly: string;
  // API
  apiSmoke: string;
  apiRegression: string;
  apiP1Blocker: string;
  apiV2: string;
  apiRateLimit: string;
}

export interface TestCaseRef {
  id: string;
  projectId: string;
  teamKey: string;
  caseNumber: number;
  caseKey: string;
  stepIds: string[];
}

// ────────────────────────────────────────────────────────────
// ID generators
// ────────────────────────────────────────────────────────────

export function generateSuiteIds(): SuiteIds {
  return {
    webAuth: uid(),
    webDashboard: uid(),
    webUserMgmt: uid(),
    mobNav: uid(),
    mobPush: uid(),
    apiUser: uid(),
    apiData: uid(),
    apiWebhook: uid(),
  };
}

export function generateSectionIds(): SectionIds {
  return {
    webLoginFlow: uid(),
    webEmailLogin: uid(),
    webPasswordReset: uid(),
    webOAuth: uid(),
    webSessionMgmt: uid(),
    webDashboardWidgets: uid(),
    webCharts: uid(),
    webMetrics: uid(),
    webReportGen: uid(),
    webUserProfiles: uid(),
    webRoleMgmt: uid(),
    webPermissionMatrix: uid(),
    mobTabNav: uid(),
    mobDeepLinks: uid(),
    mobUniversalLinks: uid(),
    mobAppLinks: uid(),
    mobNotifDelivery: uid(),
    mobInAppAlerts: uid(),
    mobNotifSettings: uid(),
    apiCrudOps: uid(),
    apiAuthentication: uid(),
    apiTokenValidation: uid(),
    apiRateLimiting: uid(),
    apiQueryParams: uid(),
    apiPagination: uid(),
    apiCursorBased: uid(),
    apiOffsetBased: uid(),
    apiFiltering: uid(),
    apiEventDelivery: uid(),
    apiRetryLogic: uid(),
  };
}

export function generateTagIds(): TagIds {
  return {
    webSmoke: uid(),
    webRegression: uid(),
    webP1Blocker: uid(),
    webAccessibility: uid(),
    webResponsive: uid(),
    mobSmoke: uid(),
    mobRegression: uid(),
    mobP1Blocker: uid(),
    mobIosOnly: uid(),
    mobAndroidOnly: uid(),
    apiSmoke: uid(),
    apiRegression: uid(),
    apiP1Blocker: uid(),
    apiV2: uid(),
    apiRateLimit: uid(),
  };
}

// ────────────────────────────────────────────────────────────
// Seed function
// ────────────────────────────────────────────────────────────

export async function seedTestCases(
  db: SeedDb,
  u: UserIds,
  t: TeamIds,
  c: CycleIds,
  wc: WorkspaceCycleIds,
): Promise<TestCaseRef[]> {
  const su = generateSuiteIds();
  const sec = generateSectionIds();
  const tg = generateTagIds();

  // ── Suites ──────────────────────────────────────────────

  await db.insert(schema.testSuite).values([
    // WEB
    { id: su.webAuth, name: "Authentication & Authorization", description: "Login flows, OAuth, session management, and permission enforcement", projectId: t.web, displayOrder: 0, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: su.webDashboard, name: "Dashboard & Reporting", description: "Dashboard widgets, charts, metrics, and report generation", projectId: t.web, displayOrder: 1, createdBy: u.sarah, updatedBy: u.emily, createdAt: daysAgo(68), updatedAt: daysAgo(30) },
    { id: su.webUserMgmt, name: "User Management", description: "User profiles, role management, and permission matrix", projectId: t.web, displayOrder: 2, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(65), updatedAt: daysAgo(25) },
    // MOB
    { id: su.mobNav, name: "App Navigation & UX", description: "Tab navigation, deep linking, and overall user experience flows", projectId: t.mob, displayOrder: 0, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(35) },
    { id: su.mobPush, name: "Push Notifications", description: "Notification delivery, in-app alerts, and notification settings", projectId: t.mob, displayOrder: 1, createdBy: u.priya, updatedBy: u.emily, createdAt: daysAgo(66), updatedAt: daysAgo(28) },
    // API
    { id: su.apiUser, name: "User Endpoints", description: "CRUD operations and authentication for user-related API endpoints", projectId: t.api, displayOrder: 0, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(38) },
    { id: su.apiData, name: "Data Endpoints", description: "Query parameters, pagination, and filtering for data retrieval endpoints", projectId: t.api, displayOrder: 1, createdBy: u.alex, updatedBy: u.david, createdAt: daysAgo(67), updatedAt: daysAgo(32) },
    { id: su.apiWebhook, name: "Webhook Integration", description: "Event delivery, retry logic, and webhook endpoint management", projectId: t.api, displayOrder: 2, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(64), updatedAt: daysAgo(20) },
  ]);

  // ── Sections (top-level first, then nested) ─────────────

  // Top-level sections
  await db.insert(schema.section).values([
    // WEB — Auth
    { id: sec.webLoginFlow, name: "Login Flow", description: "End-to-end login scenarios", projectId: t.web, suiteId: su.webAuth, parentId: null, displayOrder: 0, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: sec.webOAuth, name: "OAuth", description: "Third-party OAuth provider integration", projectId: t.web, suiteId: su.webAuth, parentId: null, displayOrder: 1, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(42) },
    { id: sec.webSessionMgmt, name: "Session Management", description: "Session lifecycle, token refresh, and timeout behavior", projectId: t.web, suiteId: su.webAuth, parentId: null, displayOrder: 2, createdBy: u.sarah, updatedBy: u.david, createdAt: daysAgo(70), updatedAt: daysAgo(38) },
    // WEB — Dashboard
    { id: sec.webDashboardWidgets, name: "Dashboard Widgets", description: "Widget rendering, data loading, and interactions", projectId: t.web, suiteId: su.webDashboard, parentId: null, displayOrder: 0, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(68), updatedAt: daysAgo(30) },
    { id: sec.webReportGen, name: "Report Generation", description: "CSV, PDF, and scheduled report features", projectId: t.web, suiteId: su.webDashboard, parentId: null, displayOrder: 1, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(68), updatedAt: daysAgo(28) },
    // WEB — User Mgmt
    { id: sec.webUserProfiles, name: "User Profiles", description: "Profile viewing, editing, and avatar management", projectId: t.web, suiteId: su.webUserMgmt, parentId: null, displayOrder: 0, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(65), updatedAt: daysAgo(25) },
    { id: sec.webRoleMgmt, name: "Role Management", description: "Role assignment, RBAC enforcement, and audit trails", projectId: t.web, suiteId: su.webUserMgmt, parentId: null, displayOrder: 1, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(65), updatedAt: daysAgo(22) },
    // MOB — Nav
    { id: sec.mobTabNav, name: "Tab Navigation", description: "Bottom tab bar, tab state preservation, badge counts", projectId: t.mob, suiteId: su.mobNav, parentId: null, displayOrder: 0, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(35) },
    { id: sec.mobDeepLinks, name: "Deep Links", description: "Universal links and app links for deep navigation", projectId: t.mob, suiteId: su.mobNav, parentId: null, displayOrder: 1, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(33) },
    // MOB — Push
    { id: sec.mobNotifDelivery, name: "Notification Delivery", description: "Push notification receipt and display", projectId: t.mob, suiteId: su.mobPush, parentId: null, displayOrder: 0, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(66), updatedAt: daysAgo(28) },
    { id: sec.mobInAppAlerts, name: "In-App Alerts", description: "In-app notification banners and overlays", projectId: t.mob, suiteId: su.mobPush, parentId: null, displayOrder: 1, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(66), updatedAt: daysAgo(26) },
    { id: sec.mobNotifSettings, name: "Notification Settings", description: "User preferences for notification channels", projectId: t.mob, suiteId: su.mobPush, parentId: null, displayOrder: 2, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(66), updatedAt: daysAgo(24) },
    // API — User
    { id: sec.apiCrudOps, name: "CRUD Operations", description: "Create, read, update, delete user endpoints", projectId: t.api, suiteId: su.apiUser, parentId: null, displayOrder: 0, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(38) },
    { id: sec.apiAuthentication, name: "Authentication", description: "Token-based authentication and session endpoints", projectId: t.api, suiteId: su.apiUser, parentId: null, displayOrder: 1, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(36) },
    // API — Data
    { id: sec.apiQueryParams, name: "Query Parameters", description: "Parameter parsing, validation, and defaults", projectId: t.api, suiteId: su.apiData, parentId: null, displayOrder: 0, createdBy: u.david, updatedBy: u.david, createdAt: daysAgo(67), updatedAt: daysAgo(32) },
    { id: sec.apiPagination, name: "Pagination", description: "Cursor-based and offset-based pagination strategies", projectId: t.api, suiteId: su.apiData, parentId: null, displayOrder: 1, createdBy: u.david, updatedBy: u.david, createdAt: daysAgo(67), updatedAt: daysAgo(30) },
    { id: sec.apiFiltering, name: "Filtering", description: "Multi-field filtering and search", projectId: t.api, suiteId: su.apiData, parentId: null, displayOrder: 2, createdBy: u.david, updatedBy: u.david, createdAt: daysAgo(67), updatedAt: daysAgo(28) },
    // API — Webhook
    { id: sec.apiEventDelivery, name: "Event Delivery", description: "Webhook event dispatch and payload formatting", projectId: t.api, suiteId: su.apiWebhook, parentId: null, displayOrder: 0, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(64), updatedAt: daysAgo(20) },
    { id: sec.apiRetryLogic, name: "Retry Logic", description: "Exponential back-off and dead-letter handling", projectId: t.api, suiteId: su.apiWebhook, parentId: null, displayOrder: 1, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(64), updatedAt: daysAgo(18) },
  ]);

  // Nested sections (require parent IDs)
  await db.insert(schema.section).values([
    // WEB — Login Flow children
    { id: sec.webEmailLogin, name: "Email Login", description: "Standard email/password login scenarios", projectId: t.web, suiteId: su.webAuth, parentId: sec.webLoginFlow, displayOrder: 0, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: sec.webPasswordReset, name: "Password Reset", description: "Forgot-password and reset flows", projectId: t.web, suiteId: su.webAuth, parentId: sec.webLoginFlow, displayOrder: 1, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    // WEB — Dashboard Widgets children
    { id: sec.webCharts, name: "Charts", description: "Bar, line, and pie chart rendering", projectId: t.web, suiteId: su.webDashboard, parentId: sec.webDashboardWidgets, displayOrder: 0, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(68), updatedAt: daysAgo(30) },
    { id: sec.webMetrics, name: "Metrics", description: "KPI cards and real-time metric tiles", projectId: t.web, suiteId: su.webDashboard, parentId: sec.webDashboardWidgets, displayOrder: 1, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(68), updatedAt: daysAgo(30) },
    // WEB — Role Mgmt child
    { id: sec.webPermissionMatrix, name: "Permission Matrix", description: "Visual permission matrix editor", projectId: t.web, suiteId: su.webUserMgmt, parentId: sec.webRoleMgmt, displayOrder: 0, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(65), updatedAt: daysAgo(22) },
    // MOB — Deep Links children
    { id: sec.mobUniversalLinks, name: "Universal Links", description: "iOS universal link handling", projectId: t.mob, suiteId: su.mobNav, parentId: sec.mobDeepLinks, displayOrder: 0, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(33) },
    { id: sec.mobAppLinks, name: "App Links", description: "Android app link handling", projectId: t.mob, suiteId: su.mobNav, parentId: sec.mobDeepLinks, displayOrder: 1, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(33) },
    // API — Authentication children
    { id: sec.apiTokenValidation, name: "Token Validation", description: "JWT verification and token introspection", projectId: t.api, suiteId: su.apiUser, parentId: sec.apiAuthentication, displayOrder: 0, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(36) },
    { id: sec.apiRateLimiting, name: "Rate Limiting", description: "Per-endpoint and per-user rate limits", projectId: t.api, suiteId: su.apiUser, parentId: sec.apiAuthentication, displayOrder: 1, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(36) },
    // API — Pagination children
    { id: sec.apiCursorBased, name: "Cursor-Based", description: "Cursor-based pagination with opaque tokens", projectId: t.api, suiteId: su.apiData, parentId: sec.apiPagination, displayOrder: 0, createdBy: u.david, updatedBy: u.david, createdAt: daysAgo(67), updatedAt: daysAgo(30) },
    { id: sec.apiOffsetBased, name: "Offset-Based", description: "Traditional limit/offset pagination", projectId: t.api, suiteId: su.apiData, parentId: sec.apiPagination, displayOrder: 1, createdBy: u.david, updatedBy: u.david, createdAt: daysAgo(67), updatedAt: daysAgo(30) },
  ]);

  // ── Tags ────────────────────────────────────────────────

  await db.insert(schema.tag).values([
    // WEB
    { id: tg.webSmoke, name: "Smoke", color: "#22c55e", projectId: t.web, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(70) },
    { id: tg.webRegression, name: "Regression", color: "#3b82f6", projectId: t.web, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(70) },
    { id: tg.webP1Blocker, name: "P1-Blocker", color: "#ef4444", projectId: t.web, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(70) },
    { id: tg.webAccessibility, name: "Accessibility", color: "#8b5cf6", projectId: t.web, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(68), updatedAt: daysAgo(68) },
    { id: tg.webResponsive, name: "Responsive", color: "#f97316", projectId: t.web, createdBy: u.aisha, updatedBy: u.aisha, createdAt: daysAgo(66), updatedAt: daysAgo(66) },
    // MOB
    { id: tg.mobSmoke, name: "Smoke", color: "#22c55e", projectId: t.mob, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(67) },
    { id: tg.mobRegression, name: "Regression", color: "#3b82f6", projectId: t.mob, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(67) },
    { id: tg.mobP1Blocker, name: "P1-Blocker", color: "#ef4444", projectId: t.mob, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(67) },
    { id: tg.mobIosOnly, name: "iOS-Only", color: "#a1a1aa", projectId: t.mob, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(65), updatedAt: daysAgo(65) },
    { id: tg.mobAndroidOnly, name: "Android-Only", color: "#84cc16", projectId: t.mob, createdBy: u.emily, updatedBy: u.emily, createdAt: daysAgo(65), updatedAt: daysAgo(65) },
    // API
    { id: tg.apiSmoke, name: "Smoke", color: "#22c55e", projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(69) },
    { id: tg.apiRegression, name: "Regression", color: "#3b82f6", projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(69) },
    { id: tg.apiP1Blocker, name: "P1-Blocker", color: "#ef4444", projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(69) },
    { id: tg.apiV2, name: "API-v2", color: "#06b6d4", projectId: t.api, createdBy: u.david, updatedBy: u.david, createdAt: daysAgo(60), updatedAt: daysAgo(60) },
    { id: tg.apiRateLimit, name: "Rate-Limit", color: "#f59e0b", projectId: t.api, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(58), updatedAt: daysAgo(58) },
  ]);

  // ── Shared Steps ────────────────────────────────────────

  const sharedWebLogin = uid();
  const sharedMobLaunch = uid();
  const sharedApiAuth = uid();

  await db.insert(schema.sharedStep).values([
    { id: sharedWebLogin, title: "Standard Login Flow", description: "Reusable login flow for authenticated test scenarios", projectId: t.web, status: "active", displayOrder: 0, createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: sharedMobLaunch, title: "App Launch and Auth", description: "Launch the app and authenticate for testing", projectId: t.mob, status: "active", displayOrder: 0, createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(35) },
    { id: sharedApiAuth, title: "Authenticated API Request", description: "Obtain an access token and set up authorization headers", projectId: t.api, status: "active", displayOrder: 0, createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(38) },
  ]);

  await db.insert(schema.sharedStepAction).values([
    // Web login — 4 actions
    { id: uid(), sharedStepId: sharedWebLogin, stepOrder: 1, action: "Navigate to the login page", data: "https://app.example.com/login", expectedResult: "Login form is displayed with email and password fields", createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: uid(), sharedStepId: sharedWebLogin, stepOrder: 2, action: "Enter valid email address", data: "testuser@example.com", expectedResult: "Email field is populated", createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: uid(), sharedStepId: sharedWebLogin, stepOrder: 3, action: "Enter valid password", data: "SecureP@ss123", expectedResult: "Password field shows masked input", createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    { id: uid(), sharedStepId: sharedWebLogin, stepOrder: 4, action: "Click the Sign In button", data: null, expectedResult: "User is redirected to the dashboard and session cookie is set", createdBy: u.sarah, updatedBy: u.sarah, createdAt: daysAgo(70), updatedAt: daysAgo(40) },
    // Mobile launch — 3 actions
    { id: uid(), sharedStepId: sharedMobLaunch, stepOrder: 1, action: "Launch the application from the home screen", data: null, expectedResult: "Splash screen appears and app initializes within 3 seconds", createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(35) },
    { id: uid(), sharedStepId: sharedMobLaunch, stepOrder: 2, action: "Wait for the login screen and enter credentials", data: "testuser@example.com / SecureP@ss123", expectedResult: "Login screen loads and credentials are accepted", createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(35) },
    { id: uid(), sharedStepId: sharedMobLaunch, stepOrder: 3, action: "Tap the Sign In button", data: null, expectedResult: "Home tab is displayed with the user's name in the header", createdBy: u.priya, updatedBy: u.priya, createdAt: daysAgo(67), updatedAt: daysAgo(35) },
    // API auth — 3 actions
    { id: uid(), sharedStepId: sharedApiAuth, stepOrder: 1, action: "Send POST /auth/token with valid client credentials", data: '{"client_id":"test_app","client_secret":"secret","grant_type":"client_credentials"}', expectedResult: "Response status is 200 with a valid access_token in the body", createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(38) },
    { id: uid(), sharedStepId: sharedApiAuth, stepOrder: 2, action: "Extract the access_token from the response", data: null, expectedResult: "Token is a valid JWT with expected claims (iss, exp, sub)", createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(38) },
    { id: uid(), sharedStepId: sharedApiAuth, stepOrder: 3, action: "Set the Authorization header for subsequent requests", data: "Authorization: Bearer <access_token>", expectedResult: "Header is set and ready for authenticated API calls", createdBy: u.alex, updatedBy: u.alex, createdAt: daysAgo(69), updatedAt: daysAgo(38) },
  ]);

  // ── Test Cases ──────────────────────────────────────────

  // Helper to build a test case row with defaults
  interface CaseDef {
    id: string;
    title: string;
    description: string;
    preconditions: string;
    postconditions: string;
    type: string;
    priority: string;
    severity: string;
    automationStatus: string;
    status: string;
    behavior: string;
    layer: string;
    isFlaky: boolean;
    caseNumber: number;
    caseKey: string;
    assigneeId: string;
    projectId: string;
    sectionId: string;
    suiteId: string;
    cycleId: string | null;
    workspaceCycleId: string | null;
    displayOrder: number;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
    templateType: string;
  }

  interface StepDef {
    id: string;
    testCaseId: string;
    stepOrder: number;
    action: string;
    data: string | null;
    expectedResult: string | null;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
  }

  interface TagLink {
    testCaseId: string;
    tagId: string;
    createdAt: Date;
    updatedAt: Date;
  }

  const allCases: CaseDef[] = [];
  const allSteps: StepDef[] = [];
  const allTagLinks: TagLink[] = [];
  const allRefs: TestCaseRef[] = [];

  // WEB team members for assignment rotation
  const webUsers = [u.sarah, u.marcus, u.emily, u.david, u.alex, u.aisha];
  const mobUsers = [u.priya, u.emily, u.alex, u.jessica, u.aisha];
  const apiUsers = [u.alex, u.david, u.marcus, u.priya, u.sarah];

  // ── WEB Test Cases (20) ─────────────────────────────────

  const webCases: Array<{
    title: string;
    description: string;
    preconditions: string;
    postconditions: string;
    sectionId: string;
    suiteId: string;
    type: string;
    priority: string;
    severity: string;
    automationStatus: string;
    status: string;
    behavior: string;
    layer: string;
    isFlaky: boolean;
    cycleId: string | null;
    workspaceCycleId: string | null;
    createdDaysAgo: number;
    tags: string[];
    steps: Array<{ action: string; data: string | null; expectedResult: string | null }>;
  }> = [
    {
      title: "Successful login with valid email and password",
      description: "Verify that a user can log in using a registered email address and correct password",
      preconditions: "User account exists and is active. Browser cookies are cleared.",
      postconditions: "User is logged in and session is established",
      sectionId: sec.webEmailLogin, suiteId: su.webAuth,
      type: "smoke", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 68,
      tags: [tg.webSmoke, tg.webP1Blocker],
      steps: [
        { action: "Navigate to the login page", data: "/login", expectedResult: "Login form is rendered with email and password inputs" },
        { action: "Enter a valid registered email address", data: "user@example.com", expectedResult: "Email field displays the entered value" },
        { action: "Enter the correct password for the account", data: "ValidP@ss1", expectedResult: "Password field shows masked characters" },
        { action: "Click the Sign In button", data: null, expectedResult: "Loading spinner appears briefly" },
        { action: "Verify redirect to the dashboard", data: null, expectedResult: "Dashboard page loads with the user's name in the top-right corner" },
      ],
    },
    {
      title: "Login fails with incorrect password",
      description: "Verify that submitting wrong credentials shows an appropriate error message",
      preconditions: "User account exists. No active session.",
      postconditions: "User remains on the login page with no session created",
      sectionId: sec.webEmailLogin, suiteId: su.webAuth,
      type: "functional", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "negative", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: null, createdDaysAgo: 67,
      tags: [tg.webRegression],
      steps: [
        { action: "Navigate to the login page", data: "/login", expectedResult: "Login form is displayed" },
        { action: "Enter a valid email address", data: "user@example.com", expectedResult: "Email field populated" },
        { action: "Enter an incorrect password", data: "WrongP@ss!", expectedResult: "Password field populated" },
        { action: "Click Sign In", data: null, expectedResult: "Error message 'Invalid email or password' is shown" },
      ],
    },
    {
      title: "Password reset email is sent successfully",
      description: "Verify the forgot-password flow triggers a reset email to the registered address",
      preconditions: "User account exists with verified email",
      postconditions: "Reset email sent; reset token stored in DB with 1-hour expiry",
      sectionId: sec.webPasswordReset, suiteId: su.webAuth,
      type: "functional", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 65,
      tags: [tg.webRegression],
      steps: [
        { action: "Click 'Forgot password?' link on the login page", data: null, expectedResult: "Password reset form is displayed" },
        { action: "Enter the registered email address", data: "user@example.com", expectedResult: "Email field is populated" },
        { action: "Click 'Send Reset Link'", data: null, expectedResult: "Success message: 'Check your email for a reset link'" },
        { action: "Check the email inbox", data: null, expectedResult: "Email from noreply@app.com with a reset link is received within 30 seconds" },
      ],
    },
    {
      title: "Google OAuth login redirects correctly",
      description: "Verify that clicking 'Continue with Google' initiates the OAuth flow and redirects to Google's consent screen",
      preconditions: "Google OAuth client is configured. No active session.",
      postconditions: "User is redirected to Google and state parameter is preserved",
      sectionId: sec.webOAuth, suiteId: su.webAuth,
      type: "integration", priority: "high", severity: "major", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: null, workspaceCycleId: wc.release21, createdDaysAgo: 62,
      tags: [tg.webSmoke],
      steps: [
        { action: "Navigate to the login page", data: "/login", expectedResult: "Login page loads with OAuth buttons visible" },
        { action: "Click 'Continue with Google'", data: null, expectedResult: "Browser redirects to accounts.google.com" },
        { action: "Verify the OAuth request parameters", data: null, expectedResult: "URL contains correct client_id, redirect_uri, scope, and state parameters" },
      ],
    },
    {
      title: "Session expires after idle timeout",
      description: "Verify the session is invalidated and user is redirected to login after the configured idle timeout period",
      preconditions: "User is logged in. Idle timeout is set to 30 minutes.",
      postconditions: "Session cookie is cleared; user sees login page",
      sectionId: sec.webSessionMgmt, suiteId: su.webAuth,
      type: "security", priority: "medium", severity: "normal", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint25, workspaceCycleId: null, createdDaysAgo: 58,
      tags: [tg.webRegression],
      steps: [
        { action: "Log in with valid credentials", data: null, expectedResult: "Dashboard is displayed, session cookie is set" },
        { action: "Wait for the idle timeout period (simulate by advancing clock)", data: "30 minutes", expectedResult: "No network activity from the client" },
        { action: "Attempt to navigate to a protected page", data: "/settings", expectedResult: "User is redirected to the login page with a message 'Session expired'" },
      ],
    },
    {
      title: "Dashboard loads all widgets within performance budget",
      description: "Verify that the main dashboard renders all widget tiles within the 2-second performance budget on a standard connection",
      preconditions: "User is logged in. At least 5 projects exist with data.",
      postconditions: "All widgets display current data",
      sectionId: sec.webDashboardWidgets, suiteId: su.webDashboard,
      type: "performance", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 55,
      tags: [tg.webSmoke, tg.webRegression],
      steps: [
        { action: "Log in and navigate to the dashboard", data: null, expectedResult: "Dashboard skeleton loaders appear immediately" },
        { action: "Measure time until all widgets are rendered (LCP)", data: "Performance API", expectedResult: "Largest Contentful Paint is under 2000ms" },
        { action: "Verify all widget tiles show data (not error states)", data: null, expectedResult: "Each tile shows a numeric value or chart; no error placeholders" },
      ],
    },
    {
      title: "Bar chart renders with correct data points",
      description: "Verify the test execution bar chart displays accurate pass/fail/skip counts for the selected date range",
      preconditions: "User is logged in. Test run data exists for the last 30 days.",
      postconditions: "Chart is interactive with hover tooltips",
      sectionId: sec.webCharts, suiteId: su.webDashboard,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: null, createdDaysAgo: 52,
      tags: [tg.webRegression],
      steps: [
        { action: "Navigate to the dashboard", data: null, expectedResult: "Dashboard loads with the execution chart visible" },
        { action: "Select 'Last 30 days' from the date range picker", data: "Last 30 days", expectedResult: "Chart reloads with updated data" },
        { action: "Hover over a bar segment", data: null, expectedResult: "Tooltip shows exact count for passed, failed, and skipped tests" },
        { action: "Compare displayed values with the raw data from the API", data: "GET /api/metrics?range=30d", expectedResult: "Chart values match the API response exactly" },
      ],
    },
    {
      title: "KPI metric card shows correct pass rate",
      description: "Verify the pass-rate metric card calculates and displays the correct percentage based on recent test runs",
      preconditions: "At least one completed test run exists in the current sprint",
      postconditions: "Metric card reflects the most recent data",
      sectionId: sec.webMetrics, suiteId: su.webDashboard,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 50,
      tags: [tg.webResponsive],
      steps: [
        { action: "Navigate to the dashboard", data: null, expectedResult: "Dashboard loads with metric cards" },
        { action: "Locate the 'Pass Rate' metric card", data: null, expectedResult: "Card displays a percentage value and a trend indicator" },
        { action: "Verify the percentage against manual calculation", data: "(passed / total) * 100, rounded to 1 decimal", expectedResult: "Displayed percentage matches the calculated value" },
      ],
    },
    {
      title: "Export dashboard report as PDF",
      description: "Verify that the 'Export PDF' feature generates a valid PDF containing all visible dashboard data",
      preconditions: "User is logged in with at least viewer role. Dashboard has data.",
      postconditions: "PDF file is downloaded to the user's machine",
      sectionId: sec.webReportGen, suiteId: su.webDashboard,
      type: "functional", priority: "low", severity: "minor", automationStatus: "not_automated", status: "draft", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 45,
      tags: [tg.webAccessibility],
      steps: [
        { action: "Navigate to the dashboard", data: null, expectedResult: "Dashboard is fully loaded" },
        { action: "Click the 'Export' menu and select 'PDF'", data: null, expectedResult: "Export dialog shows options for date range and sections" },
        { action: "Accept defaults and click 'Generate'", data: null, expectedResult: "Progress indicator appears; PDF downloads within 10 seconds" },
        { action: "Open the downloaded PDF", data: null, expectedResult: "PDF contains the same charts and metrics visible on the dashboard" },
      ],
    },
    {
      title: "CSV report includes all filtered test results",
      description: "Verify CSV export respects the currently applied filters and includes the correct column headers",
      preconditions: "User is logged in. Test results exist for the current cycle.",
      postconditions: "CSV file saved locally with correct encoding",
      sectionId: sec.webReportGen, suiteId: su.webDashboard,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 43,
      tags: [tg.webRegression],
      steps: [
        { action: "Navigate to the Reports section", data: "/reports", expectedResult: "Report builder is displayed" },
        { action: "Apply a filter for 'Status = Failed'", data: null, expectedResult: "Only failed results are shown in the preview" },
        { action: "Click 'Export CSV'", data: null, expectedResult: "CSV file downloads with columns: Case ID, Title, Status, Duration, Executed By, Date" },
        { action: "Open CSV and verify row count matches the filtered list", data: null, expectedResult: "Number of data rows equals the preview count" },
      ],
    },
    {
      title: "User can update their profile avatar",
      description: "Verify the profile settings page allows uploading a new avatar image and the change is reflected across the app",
      preconditions: "User is logged in. Current avatar may or may not be set.",
      postconditions: "New avatar is stored and displayed in the sidebar and comments",
      sectionId: sec.webUserProfiles, suiteId: su.webUserMgmt,
      type: "functional", priority: "low", severity: "minor", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 40,
      tags: [tg.webAccessibility],
      steps: [
        { action: "Navigate to Settings > Profile", data: "/settings", expectedResult: "Profile page loads with current avatar or placeholder" },
        { action: "Click the avatar area to open the file picker", data: null, expectedResult: "File dialog opens accepting image types (jpg, png, webp)" },
        { action: "Select a valid image file under 4 MB", data: "avatar.png (200x200, 150 KB)", expectedResult: "Upload progress indicator appears; new avatar preview is shown" },
        { action: "Refresh the page and check the sidebar", data: null, expectedResult: "Updated avatar appears in both the profile page and sidebar" },
      ],
    },
    {
      title: "Profile description supports markdown formatting",
      description: "Verify that the user description field renders basic markdown (bold, italic, links) correctly after save",
      preconditions: "User is logged in",
      postconditions: "Description is stored as markdown and rendered as HTML in view mode",
      sectionId: sec.webUserProfiles, suiteId: su.webUserMgmt,
      type: "functional", priority: "low", severity: "trivial", automationStatus: "not_automated", status: "draft", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 38,
      tags: [],
      steps: [
        { action: "Navigate to Settings > Profile", data: null, expectedResult: "Profile edit form is displayed" },
        { action: "Enter markdown text in the description field", data: "**Bold text** and *italic* with a [link](https://example.com)", expectedResult: "Raw markdown is visible in the textarea" },
        { action: "Save the profile", data: null, expectedResult: "Success toast appears" },
        { action: "Switch to view mode", data: null, expectedResult: "Description renders bold, italic, and clickable link" },
      ],
    },
    {
      title: "Admin can assign a role to an organization member",
      description: "Verify that an admin-level user can change a member's role from the workspace member settings page",
      preconditions: "Logged in as admin. At least one other org member exists.",
      postconditions: "Target member's role is updated in the database and reflected in the UI",
      sectionId: sec.webRoleMgmt, suiteId: su.webUserMgmt,
      type: "functional", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 35,
      tags: [tg.webSmoke, tg.webRegression],
      steps: [
        { action: "Navigate to Settings > Members", data: "/settings/members", expectedResult: "Member list is displayed with roles" },
        { action: "Click the role dropdown for a target member", data: "Member: Jessica Wu", expectedResult: "Dropdown shows available roles: viewer, member, admin" },
        { action: "Select 'admin' from the dropdown", data: null, expectedResult: "Confirmation dialog appears: 'Change Jessica Wu's role to admin?'" },
        { action: "Confirm the change", data: null, expectedResult: "Role badge updates to 'admin'; success toast appears" },
      ],
    },
    {
      title: "Non-admin cannot access the members settings page",
      description: "Verify that users without admin privileges receive a 403 or are redirected when trying to access member management",
      preconditions: "Logged in as a member-role user",
      postconditions: "User remains on a permitted page; no data leaked",
      sectionId: sec.webRoleMgmt, suiteId: su.webUserMgmt,
      type: "security", priority: "high", severity: "critical", automationStatus: "automated", status: "active", behavior: "negative", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: null, createdDaysAgo: 34,
      tags: [tg.webP1Blocker, tg.webRegression],
      steps: [
        { action: "Log in as a member-role user", data: "member@example.com", expectedResult: "Dashboard loads; sidebar shows no 'Members' link under Settings" },
        { action: "Directly navigate to the members URL", data: "/settings/members", expectedResult: "User is redirected to the dashboard or sees a 'Forbidden' page" },
        { action: "Attempt the API call directly", data: "GET /api/organizations/{id}/members", expectedResult: "API returns 403 Forbidden" },
      ],
    },
    {
      title: "Permission matrix reflects role changes in real time",
      description: "Verify the permission matrix view updates immediately after a role change without requiring a page refresh",
      preconditions: "Logged in as admin. Permission matrix page is accessible.",
      postconditions: "Matrix state is consistent with the user's role",
      sectionId: sec.webPermissionMatrix, suiteId: su.webUserMgmt,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: wc.release21, createdDaysAgo: 30,
      tags: [tg.webRegression],
      steps: [
        { action: "Open the permission matrix for a team", data: null, expectedResult: "Matrix grid shows roles as columns and resources as rows" },
        { action: "Toggle a permission checkbox (e.g., 'member' + 'delete test case')", data: null, expectedResult: "Checkbox updates; API PATCH request is sent" },
        { action: "Refresh the page", data: null, expectedResult: "Changed permission state persists" },
      ],
    },
    {
      title: "Login form is accessible via keyboard navigation",
      description: "Verify the entire login form can be completed using only the keyboard (Tab, Enter, Escape)",
      preconditions: "No mouse connected or mouse deliberately not used",
      postconditions: "User logged in successfully using keyboard only",
      sectionId: sec.webEmailLogin, suiteId: su.webAuth,
      type: "usability", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 28,
      tags: [tg.webAccessibility],
      steps: [
        { action: "Navigate to the login page using the URL bar", data: "/login", expectedResult: "Login page loads with the email field focused" },
        { action: "Type the email, press Tab, type the password", data: "user@example.com / Tab / ValidP@ss1", expectedResult: "Focus moves from email to password field" },
        { action: "Press Enter to submit the form", data: null, expectedResult: "Form submits and user is logged in" },
        { action: "Verify focus is set to the main content area after login", data: null, expectedResult: "Dashboard heading or skip-nav link receives focus" },
      ],
    },
    {
      title: "Dashboard is responsive on tablet viewport",
      description: "Verify dashboard widgets reflow correctly on a 768px-wide viewport (iPad portrait)",
      preconditions: "User is logged in. Dashboard has at least 4 widget tiles.",
      postconditions: "All content is visible without horizontal scrolling",
      sectionId: sec.webDashboardWidgets, suiteId: su.webDashboard,
      type: "compatibility", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: null, createdDaysAgo: 25,
      tags: [tg.webResponsive, tg.webRegression],
      steps: [
        { action: "Set browser viewport to 768x1024 (iPad portrait)", data: "768 x 1024", expectedResult: "Page reflows to a 2-column or single-column layout" },
        { action: "Scroll through all widgets", data: null, expectedResult: "No horizontal overflow; all widgets are fully visible" },
        { action: "Interact with a chart (tap a bar)", data: null, expectedResult: "Tooltip appears correctly positioned within the viewport" },
      ],
    },
    {
      title: "Concurrent session limit is enforced",
      description: "Verify that logging in on a new device invalidates the oldest session when the concurrent session limit is reached",
      preconditions: "User has active sessions on 2 devices. Max concurrent sessions = 3.",
      postconditions: "Only the most recent 3 sessions remain active",
      sectionId: sec.webSessionMgmt, suiteId: su.webAuth,
      type: "security", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "draft", behavior: "destructive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 22,
      tags: [],
      steps: [
        { action: "Log in from Device A (browser session 1)", data: null, expectedResult: "Session established on Device A" },
        { action: "Log in from Device B (browser session 2)", data: null, expectedResult: "Session established on Device B; Device A still active" },
        { action: "Log in from Device C (browser session 3)", data: null, expectedResult: "Session established on Device C; all 3 sessions active" },
        { action: "Log in from Device D (browser session 4, exceeding limit)", data: null, expectedResult: "Device A session is terminated; Devices B, C, D are active" },
        { action: "Attempt an action on Device A", data: null, expectedResult: "Device A is redirected to the login page" },
      ],
    },
    {
      title: "User search filters results in real time",
      description: "Verify the user management search box filters the user list as the admin types, with debounced API calls",
      preconditions: "Logged in as admin. At least 10 users exist in the workspace.",
      postconditions: "Search results are displayed without full page reload",
      sectionId: sec.webUserProfiles, suiteId: su.webUserMgmt,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 18,
      tags: [tg.webRegression],
      steps: [
        { action: "Navigate to Settings > Members", data: null, expectedResult: "Full member list is displayed" },
        { action: "Type 'sar' in the search box", data: "sar", expectedResult: "List filters to show 'Sarah Chen' (and any other matches)" },
        { action: "Clear the search box", data: null, expectedResult: "Full member list is restored" },
      ],
    },
    {
      title: "Login rate limiting after failed attempts",
      description: "Verify the account is temporarily locked after 5 consecutive failed login attempts within 15 minutes",
      preconditions: "User account exists. No prior lockouts.",
      postconditions: "Account is locked for 15 minutes; admin can unlock manually",
      sectionId: sec.webEmailLogin, suiteId: su.webAuth,
      type: "security", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "negative", layer: "e2e", isFlaky: false,
      cycleId: c.webSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 12,
      tags: [tg.webP1Blocker, tg.webSmoke],
      steps: [
        { action: "Attempt to log in with an incorrect password (attempt 1-4)", data: "wrong_password x4", expectedResult: "Error 'Invalid email or password' on each attempt" },
        { action: "Attempt a 5th login with an incorrect password", data: "wrong_password x5", expectedResult: "Error changes to 'Account locked. Try again in 15 minutes.'" },
        { action: "Attempt login with the CORRECT password immediately", data: "CorrectP@ss", expectedResult: "Still shows 'Account locked' — correct password does not bypass lockout" },
        { action: "Wait 15 minutes (or advance time) and retry with correct password", data: null, expectedResult: "Login succeeds; lockout counter resets" },
      ],
    },
  ];

  for (let i = 0; i < webCases.length; i++) {
    const tc = webCases[i];
    const caseId = uid();
    const caseNum = i + 1;
    const stepIds: string[] = [];

    allCases.push({
      id: caseId,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      postconditions: tc.postconditions,
      type: tc.type,
      priority: tc.priority,
      severity: tc.severity,
      automationStatus: tc.automationStatus,
      status: tc.status,
      behavior: tc.behavior,
      layer: tc.layer,
      isFlaky: tc.isFlaky,
      caseNumber: caseNum,
      caseKey: `WEB-${caseNum}`,
      assigneeId: webUsers[i % webUsers.length],
      projectId: t.web,
      sectionId: tc.sectionId,
      suiteId: tc.suiteId,
      cycleId: tc.cycleId,
      workspaceCycleId: tc.workspaceCycleId,
      displayOrder: i,
      templateType: "steps",
      createdBy: webUsers[i % webUsers.length],
      updatedBy: webUsers[(i + 1) % webUsers.length],
      createdAt: daysAgo(tc.createdDaysAgo),
      updatedAt: daysAgo(Math.max(5, tc.createdDaysAgo - 10)),
    });

    for (let s = 0; s < tc.steps.length; s++) {
      const stepId = uid();
      stepIds.push(stepId);
      allSteps.push({
        id: stepId,
        testCaseId: caseId,
        stepOrder: s + 1,
        action: tc.steps[s].action,
        data: tc.steps[s].data,
        expectedResult: tc.steps[s].expectedResult,
        createdBy: webUsers[i % webUsers.length],
        updatedBy: webUsers[i % webUsers.length],
        createdAt: daysAgo(tc.createdDaysAgo),
        updatedAt: daysAgo(Math.max(5, tc.createdDaysAgo - 10)),
      });
    }

    for (const tagId of tc.tags) {
      allTagLinks.push({ testCaseId: caseId, tagId, createdAt: daysAgo(tc.createdDaysAgo), updatedAt: daysAgo(tc.createdDaysAgo) });
    }

    allRefs.push({ id: caseId, projectId: t.web, teamKey: "WEB", caseNumber: caseNum, caseKey: `WEB-${caseNum}`, stepIds });
  }

  // ── MOB Test Cases (20) ─────────────────────────────────

  const mobCases: Array<{
    title: string;
    description: string;
    preconditions: string;
    postconditions: string;
    sectionId: string;
    suiteId: string;
    type: string;
    priority: string;
    severity: string;
    automationStatus: string;
    status: string;
    behavior: string;
    layer: string;
    isFlaky: boolean;
    cycleId: string | null;
    workspaceCycleId: string | null;
    createdDaysAgo: number;
    tags: string[];
    steps: Array<{ action: string; data: string | null; expectedResult: string | null }>;
  }> = [
    {
      title: "Bottom tab bar displays all five tabs correctly",
      description: "Verify the bottom navigation renders Home, Search, Activity, Notifications, and Profile tabs with correct icons and labels",
      preconditions: "User is logged in. App is on the home screen.",
      postconditions: "All tabs are tappable and display their respective screens",
      sectionId: sec.mobTabNav, suiteId: su.mobNav,
      type: "smoke", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.mobSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 65,
      tags: [tg.mobSmoke, tg.mobP1Blocker],
      steps: [
        { action: "Launch the app and log in", data: null, expectedResult: "Home tab is selected by default" },
        { action: "Verify all five tabs are visible in the bottom bar", data: null, expectedResult: "Home, Search, Activity, Notifications, Profile tabs with icons and labels" },
        { action: "Tap each tab sequentially", data: null, expectedResult: "Each tab's corresponding screen loads within 500ms" },
        { action: "Verify the active tab indicator updates correctly", data: null, expectedResult: "Active tab is highlighted; previously active tab returns to default state" },
      ],
    },
    {
      title: "Tab state is preserved when switching between tabs",
      description: "Verify scroll position and form state are preserved when the user navigates away and returns to a tab",
      preconditions: "User is logged in. At least one list view has scrollable content.",
      postconditions: "Previous scroll position and state are restored",
      sectionId: sec.mobTabNav, suiteId: su.mobNav,
      type: "functional", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: c.mobSprint24, workspaceCycleId: null, createdDaysAgo: 63,
      tags: [tg.mobRegression],
      steps: [
        { action: "Navigate to the Activity tab and scroll down 500px", data: null, expectedResult: "Activity feed scrolls to show older items" },
        { action: "Switch to the Profile tab", data: null, expectedResult: "Profile screen loads" },
        { action: "Switch back to the Activity tab", data: null, expectedResult: "Scroll position is restored to the previous 500px offset" },
      ],
    },
    {
      title: "Universal link opens the correct screen on iOS",
      description: "Verify that tapping a universal link (HTTPS) in Safari opens the app at the correct deep-linked screen",
      preconditions: "App is installed on iOS. Universal link domain is configured in apple-app-site-association.",
      postconditions: "User lands on the expected in-app screen",
      sectionId: sec.mobUniversalLinks, suiteId: su.mobNav,
      type: "integration", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: c.mobSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 60,
      tags: [tg.mobIosOnly, tg.mobSmoke],
      steps: [
        { action: "Open Safari and navigate to a universal link", data: "https://app.example.com/projects/123/test-cases/456", expectedResult: "iOS shows the app open banner or opens the app directly" },
        { action: "Tap the banner or wait for auto-open", data: null, expectedResult: "App opens and navigates to the test case detail screen for case 456" },
        { action: "Verify the screen displays the correct test case data", data: null, expectedResult: "Title, description, and steps match the linked test case" },
      ],
    },
    {
      title: "Android app link resolves to the correct activity",
      description: "Verify that an Android App Link opens the app directly without the disambiguation dialog",
      preconditions: "App is installed on Android. Digital Asset Links are verified.",
      postconditions: "User sees the intended screen; no browser fallback occurs",
      sectionId: sec.mobAppLinks, suiteId: su.mobNav,
      type: "integration", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.mobSprint24, workspaceCycleId: null, createdDaysAgo: 59,
      tags: [tg.mobAndroidOnly, tg.mobRegression],
      steps: [
        { action: "Tap an app link from a messaging app", data: "https://app.example.com/test-runs/789", expectedResult: "App opens directly without 'Open with' dialog" },
        { action: "Verify the app navigates to the test run detail screen", data: null, expectedResult: "Test run 789 is displayed with results and status" },
        { action: "Press the back button", data: null, expectedResult: "User returns to the messaging app, not the browser" },
      ],
    },
    {
      title: "Deep link with invalid path shows a graceful error",
      description: "Verify that opening a deep link pointing to a non-existent resource shows a user-friendly error instead of crashing",
      preconditions: "App is installed. Resource ID 99999 does not exist.",
      postconditions: "User can navigate back to the home screen from the error state",
      sectionId: sec.mobDeepLinks, suiteId: su.mobNav,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "negative", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 57,
      tags: [tg.mobRegression],
      steps: [
        { action: "Open a deep link to a non-existent resource", data: "https://app.example.com/projects/99999", expectedResult: "App opens without crashing" },
        { action: "Verify error state is displayed", data: null, expectedResult: "A 'Not Found' screen with a 'Go Home' button is shown" },
        { action: "Tap 'Go Home'", data: null, expectedResult: "App navigates to the home tab" },
      ],
    },
    {
      title: "Push notification is received when app is in background",
      description: "Verify that a push notification appears in the device notification tray when the app is backgrounded",
      preconditions: "App is installed and push permissions are granted. App is in background.",
      postconditions: "Notification is visible in the system tray with correct content",
      sectionId: sec.mobNotifDelivery, suiteId: su.mobPush,
      type: "smoke", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: c.mobSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 55,
      tags: [tg.mobSmoke, tg.mobP1Blocker],
      steps: [
        { action: "Send the app to the background (press Home)", data: null, expectedResult: "App is no longer in the foreground" },
        { action: "Trigger a push notification from the server", data: '{"title":"Test Run Complete","body":"Run #42 finished: 18/20 passed"}', expectedResult: "System notification tray shows the notification with correct title and body" },
        { action: "Tap the notification", data: null, expectedResult: "App opens and navigates to the test run detail for Run #42" },
      ],
    },
    {
      title: "Push notification is received when app is killed",
      description: "Verify push delivery and cold-start deep linking when the app process is terminated",
      preconditions: "App is force-quit. Push permissions granted.",
      postconditions: "App launches and displays the linked content",
      sectionId: sec.mobNotifDelivery, suiteId: su.mobPush,
      type: "functional", priority: "high", severity: "major", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: c.mobSprint24, workspaceCycleId: null, createdDaysAgo: 54,
      tags: [tg.mobRegression],
      steps: [
        { action: "Force-quit the app", data: null, expectedResult: "App process is terminated" },
        { action: "Trigger a push notification", data: '{"title":"New Defect","body":"BUG-101: Login crash on Android 14"}', expectedResult: "Notification appears in the system tray" },
        { action: "Tap the notification", data: null, expectedResult: "App cold-starts and opens the defect detail for BUG-101" },
      ],
    },
    {
      title: "In-app alert banner appears for new test result",
      description: "Verify an in-app alert banner slides down when a real-time event arrives while the app is in the foreground",
      preconditions: "App is in the foreground. WebSocket connection is active.",
      postconditions: "Banner auto-dismisses after 5 seconds",
      sectionId: sec.mobInAppAlerts, suiteId: su.mobPush,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.mobSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 50,
      tags: [tg.mobSmoke],
      steps: [
        { action: "With the app in the foreground, trigger a server event", data: "test_result.created for Run #42", expectedResult: "A banner slides down from the top of the screen" },
        { action: "Verify the banner content", data: null, expectedResult: "Banner shows 'New result in Run #42' with a brief description" },
        { action: "Wait 5 seconds without interaction", data: null, expectedResult: "Banner auto-dismisses with a slide-up animation" },
      ],
    },
    {
      title: "Tapping an in-app alert navigates to the related screen",
      description: "Verify that tapping the in-app alert banner navigates the user to the relevant detail screen",
      preconditions: "An in-app alert is currently displayed",
      postconditions: "User is on the relevant detail screen; alert is dismissed",
      sectionId: sec.mobInAppAlerts, suiteId: su.mobPush,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 48,
      tags: [tg.mobRegression],
      steps: [
        { action: "Trigger an in-app alert for a defect assignment", data: "defect.assigned to current user", expectedResult: "Alert banner appears with defect title" },
        { action: "Tap the alert banner", data: null, expectedResult: "App navigates to the defect detail screen" },
        { action: "Verify the defect details are correct", data: null, expectedResult: "Defect title, status, and assignee match the notification payload" },
      ],
    },
    {
      title: "User can disable push notifications for a specific channel",
      description: "Verify that toggling off a notification channel in settings prevents those notifications from being delivered",
      preconditions: "User is logged in. All notification channels are enabled by default.",
      postconditions: "Disabled channel no longer triggers push notifications",
      sectionId: sec.mobNotifSettings, suiteId: su.mobPush,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 45,
      tags: [tg.mobRegression],
      steps: [
        { action: "Navigate to Settings > Notifications", data: null, expectedResult: "Notification preferences screen shows toggles for each channel" },
        { action: "Toggle off 'Test Run Completed' notifications", data: null, expectedResult: "Toggle switches to off; change is saved immediately" },
        { action: "Trigger a 'Test Run Completed' event from the server", data: null, expectedResult: "No push notification is received on the device" },
        { action: "Toggle it back on and trigger the event again", data: null, expectedResult: "Push notification is now received" },
      ],
    },
    {
      title: "Notification badge count updates correctly",
      description: "Verify the Notifications tab badge shows the correct unread count and decrements as notifications are read",
      preconditions: "User is logged in. 3 unread notifications exist.",
      postconditions: "Badge reflects accurate unread count",
      sectionId: sec.mobNotifDelivery, suiteId: su.mobPush,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.mobSprint24, workspaceCycleId: null, createdDaysAgo: 42,
      tags: [tg.mobSmoke],
      steps: [
        { action: "Verify the Notifications tab shows a badge with count 3", data: null, expectedResult: "Red badge on the Notifications tab icon shows '3'" },
        { action: "Tap the Notifications tab and open one notification", data: null, expectedResult: "Notification detail loads; badge decrements to '2'" },
        { action: "Open the remaining two notifications", data: null, expectedResult: "Badge disappears when count reaches zero" },
      ],
    },
    {
      title: "App handles no-network state gracefully",
      description: "Verify the app shows an appropriate offline indicator and queues actions when the device has no network connectivity",
      preconditions: "User is logged in. Some cached data exists.",
      postconditions: "Queued actions sync when connectivity is restored",
      sectionId: sec.mobTabNav, suiteId: su.mobNav,
      type: "functional", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "negative", layer: "e2e", isFlaky: false,
      cycleId: c.mobSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 38,
      tags: [tg.mobRegression, tg.mobP1Blocker],
      steps: [
        { action: "Disable network connectivity (airplane mode)", data: null, expectedResult: "Offline banner appears at the top of the screen" },
        { action: "Navigate between tabs using cached data", data: null, expectedResult: "Cached screens render; loading states for uncached data" },
        { action: "Attempt to submit a test result", data: null, expectedResult: "Action is queued with a 'Will sync when online' indicator" },
        { action: "Re-enable network connectivity", data: null, expectedResult: "Offline banner disappears; queued action syncs automatically" },
      ],
    },
    {
      title: "App cold start performance is under 3 seconds",
      description: "Verify the app reaches an interactive state within 3 seconds from a cold start on a mid-range device",
      preconditions: "App was force-quit. Device: mid-range Android or iPhone.",
      postconditions: "User can interact with the home tab",
      sectionId: sec.mobTabNav, suiteId: su.mobNav,
      type: "performance", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: true,
      cycleId: c.mobSprint24, workspaceCycleId: null, createdDaysAgo: 35,
      tags: [tg.mobSmoke],
      steps: [
        { action: "Force-quit the app to ensure a cold start", data: null, expectedResult: "App process is terminated" },
        { action: "Launch the app and start a timer", data: null, expectedResult: "Splash screen appears" },
        { action: "Measure Time To Interactive (TTI)", data: "Automated perf profiling", expectedResult: "Home tab is interactive within 3000ms" },
      ],
    },
    {
      title: "Notification settings persist across app reinstall",
      description: "Verify that notification preferences stored on the server survive an app uninstall/reinstall cycle",
      preconditions: "User has customized notification preferences and is logged in",
      postconditions: "Preferences are restored from the server after reinstall and login",
      sectionId: sec.mobNotifSettings, suiteId: su.mobPush,
      type: "regression", priority: "low", severity: "minor", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 30,
      tags: [tg.mobRegression],
      steps: [
        { action: "Disable 'Defect Assigned' and 'Comment Mention' notifications", data: null, expectedResult: "Both toggles are saved to off" },
        { action: "Uninstall and reinstall the app", data: null, expectedResult: "App installs fresh" },
        { action: "Log in and navigate to notification settings", data: null, expectedResult: "'Defect Assigned' and 'Comment Mention' are still toggled off" },
      ],
    },
    {
      title: "Swipe-to-dismiss notification in notification center",
      description: "Verify swiping a notification in the in-app notification center marks it as read and removes it from the list",
      preconditions: "User has at least 3 unread notifications in the notification center",
      postconditions: "Swiped notification is marked as read; list updates",
      sectionId: sec.mobInAppAlerts, suiteId: su.mobPush,
      type: "usability", priority: "low", severity: "minor", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 25,
      tags: [],
      steps: [
        { action: "Open the Notifications tab", data: null, expectedResult: "List of unread notifications is displayed" },
        { action: "Swipe left on the first notification", data: null, expectedResult: "Delete/dismiss action is revealed" },
        { action: "Complete the swipe to dismiss", data: null, expectedResult: "Notification is removed from the list; count decrements" },
      ],
    },
    {
      title: "Universal link falls back to browser when app is not installed",
      description: "Verify the universal link opens the web fallback page in Safari when the app is not installed on the device",
      preconditions: "App is NOT installed. iOS device with Safari.",
      postconditions: "User sees the web page with an app install banner",
      sectionId: sec.mobUniversalLinks, suiteId: su.mobNav,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: wc.release22, createdDaysAgo: 20,
      tags: [tg.mobIosOnly],
      steps: [
        { action: "Ensure the app is uninstalled from the iOS device", data: null, expectedResult: "App is not present on the device" },
        { action: "Tap a universal link in Messages or Safari", data: "https://app.example.com/test-cases/456", expectedResult: "Safari opens the web version of the test case page" },
        { action: "Verify the page shows an app install banner", data: null, expectedResult: "Smart App Banner is displayed at the top of the page" },
      ],
    },
    {
      title: "Android back button navigates correctly from deep link",
      description: "Verify pressing the Android hardware back button from a deep-linked screen follows the expected navigation stack",
      preconditions: "App opened via Android app link to a detail screen",
      postconditions: "User is returned to the app home screen, not the external app",
      sectionId: sec.mobAppLinks, suiteId: su.mobNav,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: c.mobSprint25, workspaceCycleId: null, createdDaysAgo: 15,
      tags: [tg.mobAndroidOnly],
      steps: [
        { action: "Open the app via an app link to a test case detail", data: "https://app.example.com/test-cases/789", expectedResult: "Test case detail screen is displayed" },
        { action: "Press the hardware back button once", data: null, expectedResult: "Navigates to the test case list (synthetic back stack)" },
        { action: "Press back again", data: null, expectedResult: "Navigates to the home tab" },
        { action: "Press back once more", data: null, expectedResult: "App moves to the background (does not crash or close abruptly)" },
      ],
    },
    {
      title: "Silent push updates the app badge without user interaction",
      description: "Verify a silent (content-available) push notification updates the app icon badge count without displaying a visible alert",
      preconditions: "App is in background. Silent push is configured.",
      postconditions: "App badge count reflects the server-provided value",
      sectionId: sec.mobNotifDelivery, suiteId: su.mobPush,
      type: "functional", priority: "low", severity: "minor", automationStatus: "not_automated", status: "draft", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 10,
      tags: [],
      steps: [
        { action: "Send a silent push notification with badge count payload", data: '{"content-available":1,"badge":7}', expectedResult: "No visible notification appears" },
        { action: "Check the app icon on the home screen", data: null, expectedResult: "Badge shows '7'" },
        { action: "Open the app and read all notifications", data: null, expectedResult: "Badge clears from the app icon" },
      ],
    },
    {
      title: "Notification grouping on Android",
      description: "Verify multiple notifications from the same channel are grouped under a summary notification on Android",
      preconditions: "App has notification channel configured. Android 8+.",
      postconditions: "Notifications are grouped; expanding shows individual items",
      sectionId: sec.mobNotifDelivery, suiteId: su.mobPush,
      type: "compatibility", priority: "low", severity: "minor", automationStatus: "not_automated", status: "active", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 8,
      tags: [tg.mobAndroidOnly],
      steps: [
        { action: "Trigger 4 push notifications in quick succession from the same channel", data: null, expectedResult: "Notifications are grouped into a summary notification" },
        { action: "Expand the notification group", data: null, expectedResult: "All 4 individual notifications are visible" },
        { action: "Tap one notification from the group", data: null, expectedResult: "App opens to the related screen; tapped notification is removed from group" },
      ],
    },
    {
      title: "Do Not Disturb mode suppresses in-app alerts",
      description: "Verify that enabling the in-app Do Not Disturb mode suppresses banners and sounds while still recording notifications",
      preconditions: "User is logged in. DND mode is available in notification settings.",
      postconditions: "Notifications are recorded but not displayed until DND is turned off",
      sectionId: sec.mobNotifSettings, suiteId: su.mobPush,
      type: "functional", priority: "low", severity: "minor", automationStatus: "not_automated", status: "draft", behavior: "positive", layer: "e2e", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 6,
      tags: [],
      steps: [
        { action: "Enable Do Not Disturb in notification settings", data: null, expectedResult: "DND indicator appears in the app header" },
        { action: "Trigger a test event that would normally show an in-app alert", data: null, expectedResult: "No banner or sound; notification tab badge still increments" },
        { action: "Disable DND", data: null, expectedResult: "DND indicator disappears; all queued notifications are visible in the notification center" },
      ],
    },
  ];

  for (let i = 0; i < mobCases.length; i++) {
    const tc = mobCases[i];
    const caseId = uid();
    const caseNum = i + 1;
    const stepIds: string[] = [];

    allCases.push({
      id: caseId,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      postconditions: tc.postconditions,
      type: tc.type,
      priority: tc.priority,
      severity: tc.severity,
      automationStatus: tc.automationStatus,
      status: tc.status,
      behavior: tc.behavior,
      layer: tc.layer,
      isFlaky: tc.isFlaky,
      caseNumber: caseNum,
      caseKey: `MOB-${caseNum}`,
      assigneeId: mobUsers[i % mobUsers.length],
      projectId: t.mob,
      sectionId: tc.sectionId,
      suiteId: tc.suiteId,
      cycleId: tc.cycleId,
      workspaceCycleId: tc.workspaceCycleId,
      displayOrder: i,
      templateType: "steps",
      createdBy: mobUsers[i % mobUsers.length],
      updatedBy: mobUsers[(i + 1) % mobUsers.length],
      createdAt: daysAgo(tc.createdDaysAgo),
      updatedAt: daysAgo(Math.max(5, tc.createdDaysAgo - 10)),
    });

    for (let s = 0; s < tc.steps.length; s++) {
      const stepId = uid();
      stepIds.push(stepId);
      allSteps.push({
        id: stepId,
        testCaseId: caseId,
        stepOrder: s + 1,
        action: tc.steps[s].action,
        data: tc.steps[s].data,
        expectedResult: tc.steps[s].expectedResult,
        createdBy: mobUsers[i % mobUsers.length],
        updatedBy: mobUsers[i % mobUsers.length],
        createdAt: daysAgo(tc.createdDaysAgo),
        updatedAt: daysAgo(Math.max(5, tc.createdDaysAgo - 10)),
      });
    }

    for (const tagId of tc.tags) {
      allTagLinks.push({ testCaseId: caseId, tagId, createdAt: daysAgo(tc.createdDaysAgo), updatedAt: daysAgo(tc.createdDaysAgo) });
    }

    allRefs.push({ id: caseId, projectId: t.mob, teamKey: "MOB", caseNumber: caseNum, caseKey: `MOB-${caseNum}`, stepIds });
  }

  // ── API Test Cases (20) ─────────────────────────────────

  const apiCases: Array<{
    title: string;
    description: string;
    preconditions: string;
    postconditions: string;
    sectionId: string;
    suiteId: string;
    type: string;
    priority: string;
    severity: string;
    automationStatus: string;
    status: string;
    behavior: string;
    layer: string;
    isFlaky: boolean;
    cycleId: string | null;
    workspaceCycleId: string | null;
    createdDaysAgo: number;
    tags: string[];
    steps: Array<{ action: string; data: string | null; expectedResult: string | null }>;
  }> = [
    {
      title: "POST /users creates a new user with valid payload",
      description: "Verify the user creation endpoint returns 201 with the created user object when given valid input",
      preconditions: "Authenticated with a valid access token. User email does not already exist.",
      postconditions: "New user record exists in the database; response includes generated ID",
      sectionId: sec.apiCrudOps, suiteId: su.apiUser,
      type: "smoke", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 66,
      tags: [tg.apiSmoke, tg.apiP1Blocker, tg.apiV2],
      steps: [
        { action: "Obtain an access token via POST /auth/token", data: '{"grant_type":"client_credentials"}', expectedResult: "200 OK with valid access_token" },
        { action: "Send POST /users with a valid JSON body", data: '{"name":"Jane Doe","email":"jane@example.com","role":"member"}', expectedResult: "201 Created with user object including generated id" },
        { action: "Verify the response schema", data: null, expectedResult: "Response body matches the UserResponse schema (id, name, email, role, createdAt)" },
        { action: "Send GET /users/{id} with the returned ID", data: null, expectedResult: "200 OK; returned user matches the created data" },
      ],
    },
    {
      title: "POST /users returns 400 for missing required fields",
      description: "Verify that omitting required fields in the create user payload returns a 400 error with field-level validation messages",
      preconditions: "Authenticated with valid access token",
      postconditions: "No user is created in the database",
      sectionId: sec.apiCrudOps, suiteId: su.apiUser,
      type: "functional", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "negative", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: null, createdDaysAgo: 65,
      tags: [tg.apiRegression],
      steps: [
        { action: "Send POST /users with an empty body", data: '{}', expectedResult: "400 Bad Request with errors for 'name' and 'email'" },
        { action: "Send POST /users with only 'name'", data: '{"name":"Test"}', expectedResult: "400 Bad Request with error for 'email'" },
        { action: "Verify the error response structure", data: null, expectedResult: "Response includes 'errors' array with field, message, and code for each violation" },
      ],
    },
    {
      title: "GET /users/{id} returns 404 for non-existent user",
      description: "Verify requesting a non-existent user ID returns 404 with a standard error response",
      preconditions: "Authenticated with valid access token. ID does not exist.",
      postconditions: "No side effects",
      sectionId: sec.apiCrudOps, suiteId: su.apiUser,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "negative", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 63,
      tags: [tg.apiRegression],
      steps: [
        { action: "Send GET /users/non-existent-uuid", data: null, expectedResult: "404 Not Found" },
        { action: "Verify error response body", data: null, expectedResult: '{"error":"Not Found","message":"User not found"}' },
        { action: "Verify response headers include correct content-type", data: null, expectedResult: "Content-Type: application/json" },
      ],
    },
    {
      title: "DELETE /users/{id} soft-deletes the user",
      description: "Verify deleting a user sets the deletedAt timestamp rather than physically removing the record",
      preconditions: "User exists. Authenticated as admin.",
      postconditions: "User has deletedAt set; subsequent GET returns 404",
      sectionId: sec.apiCrudOps, suiteId: su.apiUser,
      type: "functional", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "destructive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: null, createdDaysAgo: 60,
      tags: [tg.apiRegression, tg.apiV2],
      steps: [
        { action: "Create a test user via POST /users", data: '{"name":"Temp User","email":"temp@example.com"}', expectedResult: "201 Created with user ID" },
        { action: "Send DELETE /users/{id}", data: null, expectedResult: "204 No Content" },
        { action: "Send GET /users/{id}", data: null, expectedResult: "404 Not Found (soft-deleted)" },
        { action: "Verify in the database that deletedAt is set", data: "SELECT deleted_at FROM users WHERE id = ...", expectedResult: "deleted_at is a recent timestamp; record still exists" },
      ],
    },
    {
      title: "JWT token with expired signature is rejected",
      description: "Verify that an API request with an expired JWT returns 401 Unauthorized",
      preconditions: "A previously valid JWT that has since expired",
      postconditions: "Request is rejected; no resource access occurs",
      sectionId: sec.apiTokenValidation, suiteId: su.apiUser,
      type: "security", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "negative", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 58,
      tags: [tg.apiP1Blocker, tg.apiSmoke],
      steps: [
        { action: "Create a JWT with exp set to 1 hour in the past", data: "exp: now - 3600", expectedResult: "JWT is generated with a past expiration" },
        { action: "Send GET /users with the expired token in Authorization header", data: "Authorization: Bearer <expired_jwt>", expectedResult: "401 Unauthorized with message 'Token expired'" },
        { action: "Verify the response does not contain any user data", data: null, expectedResult: "Response body contains only the error object" },
      ],
    },
    {
      title: "Token with invalid signature is rejected",
      description: "Verify that a JWT signed with the wrong key is rejected with a 401 response",
      preconditions: "A JWT signed with a different secret key",
      postconditions: "No data access granted",
      sectionId: sec.apiTokenValidation, suiteId: su.apiUser,
      type: "security", priority: "critical", severity: "blocker", automationStatus: "automated", status: "active", behavior: "negative", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 56,
      tags: [tg.apiP1Blocker],
      steps: [
        { action: "Create a JWT using a random secret key", data: "HS256 with key 'wrong-secret'", expectedResult: "JWT is generated" },
        { action: "Send GET /users with the tampered token", data: "Authorization: Bearer <tampered_jwt>", expectedResult: "401 Unauthorized with message 'Invalid token'" },
        { action: "Verify no audit log entry is created for a valid user", data: null, expectedResult: "No activity record for the tampered request" },
      ],
    },
    {
      title: "Rate limiter returns 429 after exceeding threshold",
      description: "Verify the per-user rate limit returns HTTP 429 with a Retry-After header once the request threshold is exceeded",
      preconditions: "Rate limit is set to 100 requests per minute per user",
      postconditions: "Requests succeed after the Retry-After period elapses",
      sectionId: sec.apiRateLimiting, suiteId: su.apiUser,
      type: "performance", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "negative", layer: "api", isFlaky: true,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 53,
      tags: [tg.apiRateLimit, tg.apiRegression],
      steps: [
        { action: "Send 100 requests to GET /users in rapid succession", data: "for i in 1..100", expectedResult: "All 100 requests return 200 OK" },
        { action: "Send the 101st request immediately", data: null, expectedResult: "429 Too Many Requests with Retry-After header" },
        { action: "Wait for the Retry-After duration and send another request", data: null, expectedResult: "200 OK — rate limit window has reset" },
      ],
    },
    {
      title: "Rate limit headers are present on every response",
      description: "Verify that X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers are included in all API responses",
      preconditions: "Authenticated with valid token",
      postconditions: "Client can monitor their rate limit consumption",
      sectionId: sec.apiRateLimiting, suiteId: su.apiUser,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 50,
      tags: [tg.apiRateLimit, tg.apiV2],
      steps: [
        { action: "Send a single GET /users request", data: null, expectedResult: "200 OK" },
        { action: "Check response headers for X-RateLimit-Limit", data: null, expectedResult: "Header present with value '100' (or configured limit)" },
        { action: "Check X-RateLimit-Remaining", data: null, expectedResult: "Header present with value '99' (decremented by 1)" },
        { action: "Check X-RateLimit-Reset", data: null, expectedResult: "Header present with a Unix timestamp for the window reset" },
      ],
    },
    {
      title: "GET /data supports sort query parameter",
      description: "Verify the data endpoint supports sorting by any field using the sort query parameter with +/- prefix for direction",
      preconditions: "At least 10 data records exist. Authenticated.",
      postconditions: "Returned data is in the specified order",
      sectionId: sec.apiQueryParams, suiteId: su.apiData,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: null, createdDaysAgo: 48,
      tags: [tg.apiRegression, tg.apiV2],
      steps: [
        { action: "Send GET /data?sort=+createdAt", data: null, expectedResult: "200 OK; results are sorted by createdAt ascending" },
        { action: "Send GET /data?sort=-createdAt", data: null, expectedResult: "200 OK; results are sorted by createdAt descending" },
        { action: "Send GET /data?sort=+name", data: null, expectedResult: "200 OK; results are alphabetically sorted by name" },
      ],
    },
    {
      title: "Invalid query parameter returns descriptive error",
      description: "Verify that using an unsupported query parameter returns a 400 error listing the invalid parameters",
      preconditions: "Authenticated",
      postconditions: "No data returned for the invalid request",
      sectionId: sec.apiQueryParams, suiteId: su.apiData,
      type: "functional", priority: "low", severity: "minor", automationStatus: "automated", status: "active", behavior: "negative", layer: "api", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 45,
      tags: [tg.apiRegression],
      steps: [
        { action: "Send GET /data?sort=invalidField", data: null, expectedResult: "400 Bad Request: 'invalidField' is not a sortable field" },
        { action: "Send GET /data?unknownParam=value", data: null, expectedResult: "400 Bad Request: 'unknownParam' is not a recognized parameter" },
        { action: "Verify the error lists all invalid parameters", data: null, expectedResult: "Error response includes an array of invalid parameter names" },
      ],
    },
    {
      title: "Cursor-based pagination returns correct next cursor",
      description: "Verify the cursor-based pagination returns a next_cursor value that, when used, returns the next page of results without gaps or duplicates",
      preconditions: "At least 30 data records exist. Page size is 10.",
      postconditions: "All records are returned across 3 pages with no overlaps",
      sectionId: sec.apiCursorBased, suiteId: su.apiData,
      type: "functional", priority: "high", severity: "major", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 42,
      tags: [tg.apiSmoke, tg.apiV2],
      steps: [
        { action: "Send GET /data?limit=10 (no cursor)", data: null, expectedResult: "200 OK with 10 items and a next_cursor value" },
        { action: "Send GET /data?limit=10&cursor={next_cursor}", data: null, expectedResult: "200 OK with the next 10 items; no overlap with page 1" },
        { action: "Repeat with the new cursor", data: null, expectedResult: "200 OK with the remaining items; next_cursor is null (last page)" },
        { action: "Verify total unique records across all pages", data: null, expectedResult: "Total equals the full dataset count; no duplicates" },
      ],
    },
    {
      title: "Offset-based pagination with page and perPage",
      description: "Verify the offset pagination returns correct slices and total count metadata",
      preconditions: "At least 25 data records exist. Authenticated.",
      postconditions: "Client receives correct page slices with total metadata",
      sectionId: sec.apiOffsetBased, suiteId: su.apiData,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: null, createdDaysAgo: 40,
      tags: [tg.apiRegression],
      steps: [
        { action: "Send GET /data?page=1&perPage=10", data: null, expectedResult: "200 OK with 10 items; meta.total is 25; meta.totalPages is 3" },
        { action: "Send GET /data?page=3&perPage=10", data: null, expectedResult: "200 OK with 5 items (partial last page)" },
        { action: "Send GET /data?page=4&perPage=10", data: null, expectedResult: "200 OK with 0 items (past the last page)" },
      ],
    },
    {
      title: "Filtering by multiple fields with AND logic",
      description: "Verify that combining multiple filter parameters applies AND logic and returns only records matching all criteria",
      preconditions: "Records exist with varying status and priority values. Authenticated.",
      postconditions: "Only matching records are returned",
      sectionId: sec.apiFiltering, suiteId: su.apiData,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 38,
      tags: [tg.apiRegression, tg.apiV2],
      steps: [
        { action: "Send GET /data?status=active&priority=high", data: null, expectedResult: "200 OK; all returned items have status=active AND priority=high" },
        { action: "Verify no items have mismatched status or priority", data: null, expectedResult: "Every item satisfies both filter conditions" },
        { action: "Compare count with a direct DB query", data: "SELECT COUNT(*) FROM data WHERE status='active' AND priority='high'", expectedResult: "API result count matches the DB query count" },
      ],
    },
    {
      title: "Webhook event is delivered on test run completion",
      description: "Verify that completing a test run triggers a webhook POST to all registered endpoints with the correct event payload",
      preconditions: "Webhook endpoint is registered for 'test_run.completed' event. Test run exists.",
      postconditions: "Webhook endpoint receives the event within 5 seconds",
      sectionId: sec.apiEventDelivery, suiteId: su.apiWebhook,
      type: "integration", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "api", isFlaky: true,
      cycleId: c.apiSprint24, workspaceCycleId: wc.release21, createdDaysAgo: 35,
      tags: [tg.apiSmoke, tg.apiRegression],
      steps: [
        { action: "Register a webhook listener for 'test_run.completed'", data: "POST /webhooks with target URL", expectedResult: "201 Created; webhook subscription is active" },
        { action: "Complete a test run via PATCH /test-runs/{id}", data: '{"status":"passed"}', expectedResult: "200 OK; run status updated to passed" },
        { action: "Check the webhook listener for the incoming event", data: null, expectedResult: "POST received with event='test_run.completed', payload includes run ID, status, and metrics" },
        { action: "Verify the webhook signature header", data: null, expectedResult: "X-Webhook-Signature matches HMAC-SHA256 of the body with the shared secret" },
      ],
    },
    {
      title: "Webhook payload includes all required fields",
      description: "Verify the webhook event payload conforms to the documented schema with all required fields present",
      preconditions: "Webhook endpoint is registered. An event trigger is ready.",
      postconditions: "Payload can be deserialized by a compliant client",
      sectionId: sec.apiEventDelivery, suiteId: su.apiWebhook,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 33,
      tags: [tg.apiRegression],
      steps: [
        { action: "Trigger a webhook event (e.g., defect.created)", data: null, expectedResult: "Webhook endpoint receives a POST request" },
        { action: "Validate the payload against the JSON schema", data: "JSON Schema validation", expectedResult: "Payload passes validation; all required fields (event, timestamp, data) are present" },
        { action: "Verify the Content-Type header", data: null, expectedResult: "Content-Type: application/json; charset=utf-8" },
      ],
    },
    {
      title: "Webhook retries on 5xx failure with exponential backoff",
      description: "Verify that a failed webhook delivery (5xx response) is retried with exponential backoff up to the maximum retry count",
      preconditions: "Webhook endpoint is configured to return 500 for the first 2 requests. Max retries = 3.",
      postconditions: "Event is eventually delivered on the 3rd attempt",
      sectionId: sec.apiRetryLogic, suiteId: su.apiWebhook,
      type: "functional", priority: "high", severity: "major", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "api", isFlaky: true,
      cycleId: c.apiSprint24, workspaceCycleId: null, createdDaysAgo: 30,
      tags: [tg.apiRegression],
      steps: [
        { action: "Configure the mock endpoint to return 500 for the first 2 requests, then 200", data: null, expectedResult: "Endpoint behavior is configured" },
        { action: "Trigger a webhook event", data: null, expectedResult: "First attempt receives 500; system schedules retry" },
        { action: "Verify the retry timing follows exponential backoff", data: "Expected: ~10s, ~30s, ~90s", expectedResult: "Retries occur at approximately the expected intervals" },
        { action: "Verify the 3rd attempt succeeds", data: null, expectedResult: "Endpoint responds 200; webhook delivery is marked as successful" },
      ],
    },
    {
      title: "Webhook dead-letter queue after max retries exhausted",
      description: "Verify that after all retry attempts fail, the webhook event is moved to a dead-letter queue for manual inspection",
      preconditions: "Webhook endpoint always returns 500. Max retries = 3.",
      postconditions: "Event is in the dead-letter queue; admin can see it",
      sectionId: sec.apiRetryLogic, suiteId: su.apiWebhook,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "not_automated", status: "active", behavior: "negative", layer: "api", isFlaky: false,
      cycleId: null, workspaceCycleId: wc.release21, createdDaysAgo: 28,
      tags: [tg.apiRegression],
      steps: [
        { action: "Configure the mock endpoint to always return 500", data: null, expectedResult: "Endpoint configured" },
        { action: "Trigger a webhook event and wait for all retries to exhaust", data: null, expectedResult: "3 retries all receive 500" },
        { action: "Check the dead-letter queue via GET /webhooks/dead-letter", data: null, expectedResult: "Event appears in the DLQ with failure details and all attempt timestamps" },
      ],
    },
    {
      title: "Filtering supports date range with ISO 8601 format",
      description: "Verify the date range filter accepts ISO 8601 formatted dates and returns records within the specified range",
      preconditions: "Data records with varying createdAt timestamps exist. Authenticated.",
      postconditions: "Only records within the date range are returned",
      sectionId: sec.apiFiltering, suiteId: su.apiData,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: null, workspaceCycleId: null, createdDaysAgo: 22,
      tags: [tg.apiV2],
      steps: [
        { action: "Send GET /data?createdAfter=2025-01-01T00:00:00Z&createdBefore=2025-01-31T23:59:59Z", data: null, expectedResult: "200 OK; all items have createdAt within January 2025" },
        { action: "Send the same query with an invalid date format", data: "createdAfter=01-01-2025", expectedResult: "400 Bad Request: 'createdAfter' must be ISO 8601 format" },
        { action: "Send a query with createdAfter > createdBefore", data: "createdAfter=2025-02-01&createdBefore=2025-01-01", expectedResult: "400 Bad Request: 'createdAfter' must be before 'createdBefore'" },
      ],
    },
    {
      title: "PATCH /users/{id} supports partial updates",
      description: "Verify that a PATCH request with a subset of fields updates only those fields and leaves others unchanged",
      preconditions: "User exists with name, email, and role. Authenticated as admin.",
      postconditions: "Only the specified fields are updated; updatedAt changes",
      sectionId: sec.apiCrudOps, suiteId: su.apiUser,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: c.apiSprint24, workspaceCycleId: null, createdDaysAgo: 18,
      tags: [tg.apiRegression, tg.apiV2],
      steps: [
        { action: "Create a user with known initial values", data: '{"name":"Original","email":"orig@example.com","role":"member"}', expectedResult: "201 Created" },
        { action: "Send PATCH /users/{id} with only name change", data: '{"name":"Updated Name"}', expectedResult: "200 OK; name is 'Updated Name'" },
        { action: "Verify email and role are unchanged", data: null, expectedResult: "email is still 'orig@example.com'; role is still 'member'" },
      ],
    },
    {
      title: "API versioning header routes to the correct handler",
      description: "Verify that the Accept-Version header routes requests to the appropriate API version handler",
      preconditions: "Both v1 and v2 handlers are deployed. Authenticated.",
      postconditions: "Response matches the requested API version",
      sectionId: sec.apiQueryParams, suiteId: su.apiData,
      type: "functional", priority: "medium", severity: "normal", automationStatus: "to_be_automated", status: "active", behavior: "positive", layer: "api", isFlaky: false,
      cycleId: null, workspaceCycleId: wc.release22, createdDaysAgo: 12,
      tags: [tg.apiV2],
      steps: [
        { action: "Send GET /data with Accept-Version: v1", data: null, expectedResult: "200 OK; response schema matches v1 format" },
        { action: "Send GET /data with Accept-Version: v2", data: null, expectedResult: "200 OK; response schema matches v2 format (includes new fields)" },
        { action: "Send GET /data with Accept-Version: v99 (unsupported)", data: null, expectedResult: "400 Bad Request: 'Unsupported API version'" },
      ],
    },
  ];

  for (let i = 0; i < apiCases.length; i++) {
    const tc = apiCases[i];
    const caseId = uid();
    const caseNum = i + 1;
    const stepIds: string[] = [];

    allCases.push({
      id: caseId,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      postconditions: tc.postconditions,
      type: tc.type,
      priority: tc.priority,
      severity: tc.severity,
      automationStatus: tc.automationStatus,
      status: tc.status,
      behavior: tc.behavior,
      layer: tc.layer,
      isFlaky: tc.isFlaky,
      caseNumber: caseNum,
      caseKey: `API-${caseNum}`,
      assigneeId: apiUsers[i % apiUsers.length],
      projectId: t.api,
      sectionId: tc.sectionId,
      suiteId: tc.suiteId,
      cycleId: tc.cycleId,
      workspaceCycleId: tc.workspaceCycleId,
      displayOrder: i,
      templateType: "steps",
      createdBy: apiUsers[i % apiUsers.length],
      updatedBy: apiUsers[(i + 1) % apiUsers.length],
      createdAt: daysAgo(tc.createdDaysAgo),
      updatedAt: daysAgo(Math.max(5, tc.createdDaysAgo - 10)),
    });

    for (let s = 0; s < tc.steps.length; s++) {
      const stepId = uid();
      stepIds.push(stepId);
      allSteps.push({
        id: stepId,
        testCaseId: caseId,
        stepOrder: s + 1,
        action: tc.steps[s].action,
        data: tc.steps[s].data,
        expectedResult: tc.steps[s].expectedResult,
        createdBy: apiUsers[i % apiUsers.length],
        updatedBy: apiUsers[i % apiUsers.length],
        createdAt: daysAgo(tc.createdDaysAgo),
        updatedAt: daysAgo(Math.max(5, tc.createdDaysAgo - 10)),
      });
    }

    for (const tagId of tc.tags) {
      allTagLinks.push({ testCaseId: caseId, tagId, createdAt: daysAgo(tc.createdDaysAgo), updatedAt: daysAgo(tc.createdDaysAgo) });
    }

    allRefs.push({ id: caseId, projectId: t.api, teamKey: "API", caseNumber: caseNum, caseKey: `API-${caseNum}`, stepIds });
  }

  // ── Bulk inserts ────────────────────────────────────────

  await db.insert(schema.testCase).values(allCases);
  await db.insert(schema.testStep).values(allSteps);

  if (allTagLinks.length > 0) {
    await db.insert(schema.testCaseTag).values(allTagLinks);
  }

  return allRefs;
}
