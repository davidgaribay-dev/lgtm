import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";
import {
  ac,
  ownerRole,
  adminRole,
  memberRole,
  viewerRole,
} from "@/lib/permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        viewer: viewerRole,
      },
    }),
  ],
});
