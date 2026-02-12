"use client";

import type { SelectedNode } from "@/lib/stores/test-repo-store";
import { TestRepoDetailSuite } from "./test-repo-detail-suite";
import { TestRepoDetailSection } from "./test-repo-detail-section";
import { TestRepoDetailCase } from "./test-repo-detail-case";
import { TestRepoEmpty } from "./test-repo-empty";

interface Suite {
  id: string;
  name: string;
  description: string | null;
}

interface Section {
  id: string;
  name: string;
  description: string | null;
  suiteId: string | null;
  parentId: string | null;
  displayOrder: number;
}

interface TestCase {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  postconditions: string | null;
  type: string;
  priority: string;
  severity: string;
  automationStatus: string;
  status: string;
  behavior: string;
  layer: string;
  isFlaky: boolean;
  assigneeId: string | null;
  templateType: string;
  sectionId: string | null;
  caseKey: string | null;
}

interface TestRepoDetailProps {
  projectId: string;
  selectedNode: SelectedNode;
  suites: Suite[];
  sections: Section[];
  testCases: TestCase[];
}

export function TestRepoDetail({
  projectId,
  selectedNode,
  suites,
  sections,
  testCases,
}: TestRepoDetailProps) {
  switch (selectedNode.type) {
    case "suite": {
      const suite = suites.find((s) => s.id === selectedNode.id);
      if (!suite) return <TestRepoEmpty hasData />;
      const childSections = sections.filter(
        (s) => s.suiteId === suite.id && s.parentId === null,
      );
      const totalCases = testCases.filter((tc) => {
        const sectionIds = new Set(
          sections.filter((s) => s.suiteId === suite.id).map((s) => s.id),
        );
        return tc.sectionId !== null && sectionIds.has(tc.sectionId);
      });
      return (
        <TestRepoDetailSuite
          suite={suite}
          sectionCount={childSections.length}
          testCaseCount={totalCases.length}
        />
      );
    }

    case "section": {
      const sec = sections.find((s) => s.id === selectedNode.id);
      if (!sec) return <TestRepoEmpty hasData />;
      const parentSuite = sec.suiteId
        ? suites.find((s) => s.id === sec.suiteId)
        : null;
      const parentSection = sec.parentId
        ? sections.find((s) => s.id === sec.parentId)
        : null;
      const childSections = sections.filter(
        (s) => s.parentId === sec.id,
      );
      const childCases = testCases.filter(
        (tc) => tc.sectionId === sec.id,
      );
      return (
        <TestRepoDetailSection
          section={sec}
          parentSuite={parentSuite ?? null}
          parentSection={parentSection ?? null}
          childSectionCount={childSections.length}
          childCases={childCases}
        />
      );
    }

    case "testCase": {
      const tc = testCases.find((t) => t.id === selectedNode.id);
      if (!tc) return <TestRepoEmpty hasData />;
      const sec = tc.sectionId
        ? sections.find((s) => s.id === tc.sectionId)
        : null;
      const parentSuite =
        sec?.suiteId ? suites.find((s) => s.id === sec.suiteId) : null;
      return (
        <TestRepoDetailCase
          testCase={tc}
          section={sec ?? null}
          suite={parentSuite ?? null}
          projectId={projectId}
        />
      );
    }
  }
}
