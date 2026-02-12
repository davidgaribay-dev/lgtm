import { describe, it, expect } from "vitest";
import {
  mapPlaywrightStatus,
  mapPlaywrightRunStatus,
  buildTestTitle,
  formatErrorComment,
  extractLgtmMetadata,
  LGTM_METADATA_CONTENT_TYPE,
} from "./mapper.js";

describe("mapPlaywrightStatus", () => {
  it.each([
    { input: "passed", expected: "passed" },
    { input: "failed", expected: "failed" },
    { input: "timedOut", expected: "failed" },
    { input: "skipped", expected: "skipped" },
    { input: "interrupted", expected: "blocked" },
  ])('maps "$input" to "$expected"', ({ input, expected }) => {
    expect(mapPlaywrightStatus(input)).toBe(expected);
  });

  it('defaults unknown statuses to "failed"', () => {
    expect(mapPlaywrightStatus("something-else")).toBe("failed");
  });
});

describe("mapPlaywrightRunStatus", () => {
  it.each([
    { input: "passed", expected: "passed" },
    { input: "failed", expected: "failed" },
    { input: "timedout", expected: "failed" },
    { input: "interrupted", expected: "blocked" },
  ])('maps "$input" to "$expected"', ({ input, expected }) => {
    expect(mapPlaywrightRunStatus(input)).toBe(expected);
  });

  it('defaults unknown statuses to "failed"', () => {
    expect(mapPlaywrightRunStatus("anything")).toBe("failed");
  });
});

describe("buildTestTitle", () => {
  it("skips root and project name (first two segments)", () => {
    const titlePath = ["", "chromium", "login.spec.ts", "Login", "succeeds"];
    expect(buildTestTitle(titlePath)).toBe("login.spec.ts > Login > succeeds");
  });

  it("handles a minimal titlePath", () => {
    expect(buildTestTitle(["", "project", "test name"])).toBe("test name");
  });

  it("returns empty string when titlePath has only root and project", () => {
    expect(buildTestTitle(["", "project"])).toBe("");
  });

  it("returns empty string for empty array", () => {
    expect(buildTestTitle([])).toBe("");
  });
});

describe("formatErrorComment", () => {
  it("returns undefined when no error is provided", () => {
    expect(formatErrorComment(undefined)).toBeUndefined();
  });

  it("returns undefined when error has no fields", () => {
    expect(formatErrorComment({})).toBeUndefined();
  });

  it("includes only the message when only message is present", () => {
    const result = formatErrorComment({ message: "Expected true" });
    expect(result).toBe("Expected true");
  });

  it("includes message and snippet", () => {
    const result = formatErrorComment({
      message: "Assertion failed",
      snippet: "expect(x).toBe(y)",
    });
    expect(result).toContain("Assertion failed");
    expect(result).toContain("--- Source ---");
    expect(result).toContain("expect(x).toBe(y)");
  });

  it("includes message and stack", () => {
    const result = formatErrorComment({
      message: "Error",
      stack: "at test.spec.ts:10",
    });
    expect(result).toContain("Error");
    expect(result).toContain("--- Stack ---");
    expect(result).toContain("at test.spec.ts:10");
  });

  it("includes all three sections when all are present", () => {
    const result = formatErrorComment({
      message: "fail",
      snippet: "code",
      stack: "trace",
    })!;
    expect(result).toContain("fail");
    expect(result).toContain("--- Source ---\ncode");
    expect(result).toContain("--- Stack ---\ntrace");
    // Verify ordering: message first, snippet second, stack third
    expect(result.indexOf("fail")).toBeLessThan(result.indexOf("--- Source ---"));
    expect(result.indexOf("--- Source ---")).toBeLessThan(
      result.indexOf("--- Stack ---"),
    );
  });
});

describe("extractLgtmMetadata", () => {
  it("extracts caseKey from a valid attachment", () => {
    const attachments = [
      {
        name: "lgtm-metadata",
        contentType: LGTM_METADATA_CONTENT_TYPE,
        body: Buffer.from(JSON.stringify({ caseKey: "ENG-42" })),
      },
    ];
    expect(extractLgtmMetadata(attachments)).toEqual({ caseKey: "ENG-42" });
  });

  it("extracts caseId from a valid attachment", () => {
    const attachments = [
      {
        name: "lgtm-metadata",
        contentType: LGTM_METADATA_CONTENT_TYPE,
        body: Buffer.from(JSON.stringify({ caseId: 42 })),
      },
    ];
    expect(extractLgtmMetadata(attachments)).toEqual({ caseId: 42 });
  });

  it("returns null when no matching attachment exists", () => {
    const attachments = [
      { name: "screenshot", contentType: "image/png", body: Buffer.from("") },
    ];
    expect(extractLgtmMetadata(attachments)).toBeNull();
  });

  it("returns null when attachments array is empty", () => {
    expect(extractLgtmMetadata([])).toBeNull();
  });

  it("returns null when body is undefined", () => {
    const attachments = [
      {
        name: "lgtm-metadata",
        contentType: LGTM_METADATA_CONTENT_TYPE,
      },
    ] as ReadonlyArray<{ name: string; contentType: string; body?: Buffer }>;
    expect(extractLgtmMetadata(attachments)).toBeNull();
  });

  it("returns null when body contains invalid JSON", () => {
    const attachments = [
      {
        name: "lgtm-metadata",
        contentType: LGTM_METADATA_CONTENT_TYPE,
        body: Buffer.from("not valid json"),
      },
    ];
    expect(extractLgtmMetadata(attachments)).toBeNull();
  });

  it("ignores non-lgtm attachments and finds the correct one", () => {
    const attachments = [
      { name: "screenshot", contentType: "image/png", body: Buffer.from("") },
      {
        name: "lgtm",
        contentType: LGTM_METADATA_CONTENT_TYPE,
        body: Buffer.from(JSON.stringify({ caseKey: "QA-1" })),
      },
      { name: "trace", contentType: "application/zip", body: Buffer.from("") },
    ];
    expect(extractLgtmMetadata(attachments)).toEqual({ caseKey: "QA-1" });
  });
});
