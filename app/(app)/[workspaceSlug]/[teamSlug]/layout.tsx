import { notFound } from "next/navigation";
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/db";
import { project, organization } from "@/db/schema";

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string; teamSlug: string }>;
}) {
  const { workspaceSlug, teamSlug } = await params;

  const team = await db
    .select({ id: project.id, name: project.name })
    .from(project)
    .innerJoin(organization, eq(project.organizationId, organization.id))
    .where(
      and(
        eq(organization.slug, workspaceSlug),
        eq(project.slug, teamSlug),
        isNull(project.deletedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!team) notFound();

  return <>{children}</>;
}
