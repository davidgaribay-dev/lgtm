import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";
import starlightOpenAPI, {
  openAPISidebarGroups,
} from "starlight-openapi";
import starlightTypeDoc, {
  typeDocSidebarGroup,
} from "starlight-typedoc";
import starlightThemeBlack from "starlight-theme-black";
import starlightImageZoom from "starlight-image-zoom";

export default defineConfig({
  output: "static",
  legacy: {
    collections: true,
  },
  integrations: [
    starlight({
      title: "LGTM",
      description:
        "Documentation for the LGTM test case management platform",
      favicon: "/favicon.svg",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/lgtm-ai/lgtm",
        },
      ],
      plugins: [
        starlightThemeBlack({
          navLinks: [
            { label: "Docs", link: "/getting-started/quickstart/" },
            { label: "API", link: "/api-reference/" },
            { label: "CLI", link: "/cli/" },
          ],
          footerText:
            "Built with [Astro](https://astro.build) & [Starlight](https://starlight.astro.build). © 2025 LGTM.",
        }),
        starlightImageZoom(),
        starlightOpenAPI([
          {
            base: "api-reference",
            schema: "./schemas/openapi.yaml",
            label: "API Reference",
            collapsed: false,
          },
        ]),
        starlightTypeDoc({
          entryPoints: ["../../packages/shared/src/index.ts"],
          tsconfig: "../../packages/shared/tsconfig.json",
          output: "sdk-reference",
          sidebar: {
            label: "SDK Reference",
            collapsed: true,
          },
          typeDoc: {
            excludeExternals: true,
            excludePrivate: true,
          },
        }),
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Quickstart", slug: "getting-started/quickstart" },
            {
              label: "Installation",
              slug: "getting-started/installation",
            },
            {
              label: "Authentication",
              slug: "getting-started/authentication",
            },
          ],
        },
        {
          label: "Concepts",
          collapsed: true,
          items: [
            { label: "Overview", slug: "concepts/overview" },
            { label: "Test Cases", slug: "concepts/test-cases" },
            { label: "Test Runs", slug: "concepts/test-runs" },
            { label: "Test Results", slug: "concepts/test-results" },
            { label: "Defects", slug: "concepts/defects" },
            { label: "Environments", slug: "concepts/environments" },
            { label: "Cycles", slug: "concepts/cycles" },
            { label: "Shared Steps", slug: "concepts/shared-steps" },
            { label: "Teams & RBAC", slug: "concepts/teams-and-rbac" },
            { label: "Attachments", slug: "concepts/attachments" },
            { label: "Comments", slug: "concepts/comments" },
          ],
        },
        {
          label: "CLI",
          items: [
            { label: "Overview", slug: "cli" },
            { label: "Configuration", slug: "cli/configuration" },
            { label: "auth", slug: "cli/auth" },
            { label: "projects", slug: "cli/projects" },
            { label: "test-cases", slug: "cli/test-cases" },
            { label: "test-runs", slug: "cli/test-runs" },
            { label: "test-results", slug: "cli/test-results" },
            { label: "defects", slug: "cli/defects" },
            { label: "environments", slug: "cli/environments" },
            { label: "cycles", slug: "cli/cycles" },
            { label: "shared-steps", slug: "cli/shared-steps" },
          ],
        },
        {
          label: "Playwright Reporter",
          items: [
            { label: "Overview", slug: "playwright-reporter" },
            {
              label: "Configuration",
              slug: "playwright-reporter/configuration",
            },
            {
              label: "Test Linking",
              slug: "playwright-reporter/test-linking",
            },
            {
              label: "Status Mapping",
              slug: "playwright-reporter/status-mapping",
            },
            {
              label: "Lifecycle",
              slug: "playwright-reporter/lifecycle",
            },
            {
              label: "CI Integration",
              slug: "playwright-reporter/ci-integration",
            },
          ],
        },
        ...openAPISidebarGroups,
        typeDocSidebarGroup,
        {
          label: "Guides",
          collapsed: true,
          items: [
            { label: "API Tokens", slug: "guides/api-tokens" },
            {
              label: "CI/CD Integration",
              slug: "guides/ci-cd-integration",
            },
            { label: "Self-Hosting", slug: "guides/self-hosting" },
          ],
        },
      ],
      customCss: ["./src/styles/custom.css"],
    }),
  ],
});
