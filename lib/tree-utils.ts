export type TreeNodeType = "suite" | "section" | "testCase";

export interface TreeNode {
  id: string;
  name: string;
  type: TreeNodeType;
  children?: TreeNode[];
  data?: Record<string, unknown>;
}

interface SuiteInput {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
}

interface SectionInput {
  id: string;
  name: string;
  description: string | null;
  suiteId: string | null;
  parentId: string | null;
  displayOrder: number;
}

interface TestCaseInput {
  id: string;
  title: string;
  priority: string;
  status: string;
  type: string;
  displayOrder: number;
}

export function buildTree(
  suites: SuiteInput[],
  sections: SectionInput[],
  testCases: (TestCaseInput & { sectionId: string | null })[],
): TreeNode[] {
  // Index sections by parentId
  const sectionsByParent = new Map<string | null, SectionInput[]>();
  for (const s of sections) {
    const key = s.parentId;
    if (!sectionsByParent.has(key)) sectionsByParent.set(key, []);
    sectionsByParent.get(key)!.push(s);
  }

  // Index test cases by sectionId
  const casesBySection = new Map<string | null, typeof testCases>();
  for (const tc of testCases) {
    const key = tc.sectionId;
    if (!casesBySection.has(key)) casesBySection.set(key, []);
    casesBySection.get(key)!.push(tc);
  }

  function testCaseNode(
    tc: TestCaseInput & { sectionId: string | null },
  ): TreeNode {
    return {
      id: tc.id,
      name: tc.title,
      type: "testCase",
      data: { priority: tc.priority, status: tc.status, type: tc.type },
    };
  }

  // Recursively build section children
  function buildSectionChildren(parentId: string): TreeNode[] {
    const childSections = sectionsByParent.get(parentId) ?? [];
    return childSections.map((s) => {
      const children: TreeNode[] = [
        ...buildSectionChildren(s.id),
        ...(casesBySection.get(s.id) ?? []).map(testCaseNode),
      ];
      return {
        id: s.id,
        name: s.name,
        type: "section" as const,
        ...(children.length > 0 ? { children } : {}),
      };
    });
  }

  // Group root sections (parentId === null) by suiteId
  const rootSectionsBySuite = new Map<string | null, SectionInput[]>();
  for (const s of sections) {
    if (s.parentId === null) {
      const key = s.suiteId;
      if (!rootSectionsBySuite.has(key)) rootSectionsBySuite.set(key, []);
      rootSectionsBySuite.get(key)!.push(s);
    }
  }

  const tree: TreeNode[] = [];

  // Build suite nodes
  for (const suite of suites) {
    const rootSections = rootSectionsBySuite.get(suite.id) ?? [];
    const suiteChildren: TreeNode[] = rootSections.map((s) => {
      const children: TreeNode[] = [
        ...buildSectionChildren(s.id),
        ...(casesBySection.get(s.id) ?? []).map(testCaseNode),
      ];
      return {
        id: s.id,
        name: s.name,
        type: "section" as const,
        ...(children.length > 0 ? { children } : {}),
      };
    });

    tree.push({
      id: suite.id,
      name: suite.name,
      type: "suite",
      ...(suiteChildren.length > 0 ? { children: suiteChildren } : {}),
    });
  }

  // Orphan sections (no suite, no parent)
  const orphanSections = rootSectionsBySuite.get(null) ?? [];
  for (const s of orphanSections) {
    const children: TreeNode[] = [
      ...buildSectionChildren(s.id),
      ...(casesBySection.get(s.id) ?? []).map(testCaseNode),
    ];
    tree.push({
      id: s.id,
      name: s.name,
      type: "section",
      ...(children.length > 0 ? { children } : {}),
    });
  }

  // Orphan test cases (no section)
  const orphanCases = casesBySection.get(null) ?? [];
  for (const tc of orphanCases) {
    tree.push(testCaseNode(tc));
  }

  return tree;
}
