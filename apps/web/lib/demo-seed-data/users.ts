import * as schema from "@/db/schema";
import { hashPassword } from "better-auth/crypto";
import { type SeedDb, DEMO_PASSWORD, uid, daysAgo } from "./helpers";

export interface UserIds {
  demo: string;
  sarah: string;
  marcus: string;
  emily: string;
  david: string;
  priya: string;
  alex: string;
  jessica: string;
  ryan: string;
  aisha: string;
}

export function generateUserIds(): UserIds {
  return {
    demo: uid(),
    sarah: uid(),
    marcus: uid(),
    emily: uid(),
    david: uid(),
    priya: uid(),
    alex: uid(),
    jessica: uid(),
    ryan: uid(),
    aisha: uid(),
  };
}

/** All user IDs as an ordered array (useful for rotating assignments). */
export function allUserIds(u: UserIds): string[] {
  return [
    u.demo,
    u.sarah,
    u.marcus,
    u.emily,
    u.david,
    u.priya,
    u.alex,
    u.jessica,
    u.ryan,
    u.aisha,
  ];
}

export async function seedUsers(db: SeedDb, u: UserIds, orgId: string) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const users = [
    {
      id: u.demo,
      name: "Demo User",
      email: "demo@lgtm.dev",
      description: "Full-stack developer and QA enthusiast",
    },
    {
      id: u.sarah,
      name: "Sarah Chen",
      email: "sarah@lgtm.dev",
      description: "QA Lead with 8+ years in test automation",
    },
    {
      id: u.marcus,
      name: "Marcus Johnson",
      email: "marcus@lgtm.dev",
      description: "Senior QA Engineer specializing in performance testing",
    },
    {
      id: u.emily,
      name: "Emily Rodriguez",
      email: "emily@lgtm.dev",
      description: "QA Engineer focused on accessibility and usability",
    },
    {
      id: u.david,
      name: "David Kim",
      email: "david@lgtm.dev",
      description: "Automation Engineer — Playwright & Cypress expert",
    },
    {
      id: u.priya,
      name: "Priya Patel",
      email: "priya@lgtm.dev",
      description: "QA Engineer passionate about mobile testing",
    },
    {
      id: u.alex,
      name: "Alex Thompson",
      email: "alex@lgtm.dev",
      description:
        "DevOps/QA — bridging the gap between CI/CD and testing",
    },
    {
      id: u.jessica,
      name: "Jessica Wu",
      email: "jessica@lgtm.dev",
      description: "Junior QA learning the ropes of test management",
    },
    {
      id: u.ryan,
      name: "Ryan O'Brien",
      email: "ryan@lgtm.dev",
      description: "Product Manager ensuring quality from the product side",
    },
    {
      id: u.aisha,
      name: "Aisha Mohammed",
      email: "aisha@lgtm.dev",
      description: "UX Tester specializing in cross-browser compatibility",
    },
  ];

  // 1. users
  await db.insert(schema.user).values(
    users.map((usr) => ({
      ...usr,
      emailVerified: true,
      onboardingStep: null,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90),
    })),
  );

  // 2. accounts (credential provider)
  await db.insert(schema.account).values(
    users.map((usr) => ({
      id: uid(),
      accountId: usr.id,
      providerId: "credential",
      userId: usr.id,
      password: passwordHash,
      createdAt: daysAgo(90),
      updatedAt: daysAgo(90),
    })),
  );

  // 3. organization
  await db.insert(schema.organization).values({
    id: orgId,
    name: "Demo Workspace",
    slug: "demo",
    createdAt: daysAgo(90),
  });

  // 4. org members
  const orgRoles: { userId: string; role: string }[] = [
    { userId: u.demo, role: "owner" },
    { userId: u.sarah, role: "admin" },
    { userId: u.marcus, role: "member" },
    { userId: u.emily, role: "member" },
    { userId: u.david, role: "member" },
    { userId: u.priya, role: "member" },
    { userId: u.alex, role: "member" },
    { userId: u.jessica, role: "member" },
    { userId: u.ryan, role: "member" },
    { userId: u.aisha, role: "member" },
  ];

  await db.insert(schema.member).values(
    orgRoles.map((m) => ({
      id: uid(),
      organizationId: orgId,
      userId: m.userId,
      role: m.role,
      createdAt: daysAgo(90),
    })),
  );
}
