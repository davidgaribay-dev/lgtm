import { describe, it, expect, vi } from "vitest";
import { resolveConfig } from "./config.js";

const validOptions = {
  apiUrl: "https://lgtm.test",
  apiToken: "lgtm_v1_testtoken",
  projectKey: "ENG",
};

describe("resolveConfig", () => {
  describe("with explicit options", () => {
    it("resolves all required fields", () => {
      const config = resolveConfig(validOptions);
      expect(config.apiUrl).toBe("https://lgtm.test");
      expect(config.apiToken).toBe("lgtm_v1_testtoken");
      expect(config.projectKey).toBe("ENG");
    });

    it("passes through optional environment and cycle", () => {
      const config = resolveConfig({
        ...validOptions,
        environment: "staging",
        cycle: "Sprint 1",
      });
      expect(config.environment).toBe("staging");
      expect(config.cycle).toBe("Sprint 1");
    });

    it("uses custom runName when provided", () => {
      const config = resolveConfig({
        ...validOptions,
        runName: "My Custom Run",
      });
      expect(config.runName).toBe("My Custom Run");
    });

    it("generates default runName with timestamp", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-15T12:00:00.000Z"));

      const config = resolveConfig(validOptions);
      expect(config.runName).toBe("Playwright Run 2026-01-15T12:00:00.000Z");

      vi.useRealTimers();
    });
  });

  describe("defaults", () => {
    it("defaults autoCreateTestCases to true", () => {
      const config = resolveConfig(validOptions);
      expect(config.autoCreateTestCases).toBe(true);
    });

    it("defaults autoCreateDefects to false", () => {
      const config = resolveConfig(validOptions);
      expect(config.autoCreateDefects).toBe(false);
    });

    it("defaults uploadLogs to true", () => {
      const config = resolveConfig(validOptions);
      expect(config.uploadLogs).toBe(true);
    });

    it("defaults debug to false", () => {
      const config = resolveConfig(validOptions);
      expect(config.debug).toBe(false);
    });

    it("allows overriding autoCreateTestCases to false", () => {
      const config = resolveConfig({
        ...validOptions,
        autoCreateTestCases: false,
      });
      expect(config.autoCreateTestCases).toBe(false);
    });

    it("allows enabling autoCreateDefects", () => {
      const config = resolveConfig({
        ...validOptions,
        autoCreateDefects: true,
      });
      expect(config.autoCreateDefects).toBe(true);
    });

    it("allows disabling uploadLogs", () => {
      const config = resolveConfig({ ...validOptions, uploadLogs: false });
      expect(config.uploadLogs).toBe(false);
    });

    it("allows enabling debug", () => {
      const config = resolveConfig({ ...validOptions, debug: true });
      expect(config.debug).toBe(true);
    });
  });

  describe("environment variable fallbacks", () => {
    it("falls back to LGTM_API_URL env var", () => {
      vi.stubEnv("LGTM_API_URL", "https://env.example.com");
      vi.stubEnv("LGTM_API_TOKEN", "lgtm_v1_env");
      vi.stubEnv("LGTM_PROJECT_KEY", "ENV");

      const config = resolveConfig({});
      expect(config.apiUrl).toBe("https://env.example.com");
    });

    it("falls back to LGTM_API_TOKEN env var", () => {
      vi.stubEnv("LGTM_API_TOKEN", "lgtm_v1_fromenv");

      const config = resolveConfig({
        apiUrl: "https://lgtm.test",
        projectKey: "ENG",
      });
      expect(config.apiToken).toBe("lgtm_v1_fromenv");
    });

    it("falls back to LGTM_PROJECT_KEY env var", () => {
      vi.stubEnv("LGTM_PROJECT_KEY", "FROMENV");

      const config = resolveConfig({
        apiUrl: "https://lgtm.test",
        apiToken: "lgtm_v1_x",
      });
      expect(config.projectKey).toBe("FROMENV");
    });

    it("enables debug when LGTM_DEBUG is 'true'", () => {
      vi.stubEnv("LGTM_DEBUG", "true");

      const config = resolveConfig(validOptions);
      expect(config.debug).toBe(true);
    });

    it("does not enable debug when LGTM_DEBUG is other value", () => {
      vi.stubEnv("LGTM_DEBUG", "1");

      const config = resolveConfig(validOptions);
      expect(config.debug).toBe(false);
    });

    it("prefers explicit options over env vars", () => {
      vi.stubEnv("LGTM_API_URL", "https://env.example.com");
      vi.stubEnv("LGTM_API_TOKEN", "lgtm_v1_env");
      vi.stubEnv("LGTM_PROJECT_KEY", "ENV");

      const config = resolveConfig(validOptions);
      expect(config.apiUrl).toBe("https://lgtm.test");
      expect(config.apiToken).toBe("lgtm_v1_testtoken");
      expect(config.projectKey).toBe("ENG");
    });
  });

  describe("validation", () => {
    it("throws when apiUrl is missing", () => {
      expect(() =>
        resolveConfig({ apiToken: "lgtm_v1_x", projectKey: "X" }),
      ).toThrowError(/apiUrl/);
    });

    it("throws when apiToken is missing", () => {
      expect(() =>
        resolveConfig({ apiUrl: "https://x.com", projectKey: "X" }),
      ).toThrowError(/apiToken/);
    });

    it("throws when projectKey is missing", () => {
      expect(() =>
        resolveConfig({ apiUrl: "https://x.com", apiToken: "lgtm_v1_x" }),
      ).toThrowError(/projectKey/);
    });

    it("throws when called with no options", () => {
      expect(() => resolveConfig()).toThrowError(/apiUrl/);
    });
  });
});
