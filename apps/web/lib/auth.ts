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

  // CSRF protection: trust localhost in dev, production URL in prod
  trustedOrigins: (() => {
    const raw = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const base = raw.replace(/\/+$/, ""); // strip trailing slashes
    const origins = [base];
    // Also trust the www / non-www variant of the domain
    try {
      const { hostname } = new URL(base);
      if (hostname.startsWith("www.")) {
        origins.push(base.replace("://www.", "://"));
      } else if (!hostname.includes("localhost")) {
        origins.push(base.replace("://", "://www."));
      }
    } catch {
      // invalid URL — just use the raw value
    }
    return origins;
  })(),

  user: {
    additionalFields: {
      description: {
        type: "string",
        required: false,
        defaultValue: null,
      },
      onboardingStep: {
        type: "string",
        required: false,
        defaultValue: null,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
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
    freshAge: 60 * 60, // 1 hour — re-auth required for sensitive ops after this
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5-minute cookie cache to reduce DB queries
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "memory",
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
      "/sign-up/email": {
        window: 60,
        max: 3,
      },
      "/forget-password": {
        window: 300,
        max: 3,
      },
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
    },
  },

  plugins: [
    nextCookies(),
    organization({
      allowUserToCreateOrganization: true,
      creatorRole: "owner",
      organizationLimit: 5,
      membershipLimit: 100,
      invitationLimit: 50,
      invitationExpiresIn: 60 * 60 * 24 * 7, // 7 days
      ac,
      roles: {
        owner: ownerRole,
        admin: adminRole,
        member: memberRole,
        viewer: viewerRole,
      },
      async sendInvitationEmail(data) {
        const inviteUrl = `${process.env.BETTER_AUTH_URL}/invite/${data.id}`;

        if (!process.env.RESEND_API_KEY) {
          console.log(
            `[INVITATION] ${data.email} invited to "${data.organization.name}" as ${data.role}`,
            `\n  Accept: ${inviteUrl}`,
          );
          return;
        }

        // Fire-and-forget: do NOT await to prevent timing attacks
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "looptn <noreply@example.com>",
            to: data.email,
            subject: `You've been invited to join ${data.organization.name} on looptn`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
                <h2 style="margin: 0 0 8px;">Join ${data.organization.name}</h2>
                <p style="color: #666; margin: 0 0 24px;">
                  You've been invited to join <strong>${data.organization.name}</strong> as a <strong>${data.role}</strong> on looptn.
                </p>
                <a href="${inviteUrl}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
                  Accept Invitation
                </a>
                <p style="color: #999; font-size: 13px; margin-top: 32px;">
                  This invitation expires in 7 days. If you didn't expect this, you can safely ignore this email.
                </p>
              </div>
            `,
          }),
        }).catch((err) => {
          console.error("[INVITATION] Failed to send email:", err);
        });
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
