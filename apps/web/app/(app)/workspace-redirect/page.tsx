import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFirstWorkspaceSlug } from "@/lib/queries/workspace";

export default async function WorkspaceRedirect() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const slug = await getFirstWorkspaceSlug(session.user.id);

  if (slug) {
    redirect(`/${slug}/dashboard`);
  }

  redirect("/onboarding/workspace");
}
