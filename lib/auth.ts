import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins/organization";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  ac,
  ownerRole,
  adminRole,
  memberRole,
  viewerRole,
} from "@/lib/permissions";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    // Uncomment when Resend is configured to enable password reset:
    // sendResetPassword: async ({ user, url }) => {
    //   await fetch("https://api.resend.com/emails", {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       from: process.env.EMAIL_FROM!,
    //       to: user.email,
    //       subject: "Reset your password",
    //       html: `<a href="${url}">Click here to reset your password</a>`,
    //     }),
    //   });
    // },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cookie cache to reduce DB queries
    },
  },

  plugins: [
    nextCookies(),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        viewer: viewerRole,
      },
      async sendInvitationEmail(data) {
        // Stub: log invitation for now, enable Resend later
        console.log(
          `[INVITATION] ${data.email} invited to org ${data.organization.name} as ${data.role} (id: ${data.id})`,
        );
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
