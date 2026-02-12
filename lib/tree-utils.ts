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

type TestCaseWithRefs = TestCaseInput & {
  sectionId: string | null;
  suiteId?: string | null;
};

export function buildTree(
  suites: SuiteInput[],
  sections: SectionInput[],
  testCases: TestCaseWithRefs[],
): TreeNode[] {
  // Index sections by parentId
  const sectionsByParent = new Map<string | null, SectionInput[]>();
  for (const s of sections) {
    const key = s.parentId;
    if (!sectionsByParent.has(key)) sectionsByParent.set(key, []);
    sectionsByParent.get(key)!.push(s);
  }

  // Index test cases by sectionId (for cases that belong to a section)
  const casesBySection = new Map<string | null, TestCaseWithRefs[]>();
  // Index test cases by suiteId (for cases directly in a suite, no section)
  const casesBySuite = new Map<string, TestCaseWithRefs[]>();

  for (const tc of testCases) {
    if (tc.sectionId) {
      // Test case belongs to a section
      if (!casesBySection.has(tc.sectionId))
        casesBySection.set(tc.sectionId, []);
      casesBySection.get(tc.sectionId)!.push(tc);
    } else if (tc.suiteId) {
      // Test case belongs directly to a suite (no section)
      if (!casesBySuite.has(tc.suiteId)) casesBySuite.set(tc.suiteId, []);
      casesBySuite.get(tc.suiteId)!.push(tc);
    } else {
      // Orphan test case (no section, no suite)
      if (!casesBySection.has(null)) casesBySection.set(null, []);
      casesBySection.get(null)!.push(tc);
    }
  }

  function testCaseNode(tc: TestCaseWithRefs): TreeNode {
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
        children,
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
    const sectionChildren: TreeNode[] = rootSections.map((s) => {
      const children: TreeNode[] = [
        ...buildSectionChildren(s.id),
        ...(casesBySection.get(s.id) ?? []).map(testCaseNode),
      ];
      return {
        id: s.id,
        name: s.name,
        type: "section" as const,
        children,
      };
    });

    // Test cases directly in this suite (no section)
    const directCases = (casesBySuite.get(suite.id) ?? []).map(testCaseNode);

    tree.push({
      id: suite.id,
      name: suite.name,
      type: "suite",
      children: [...sectionChildren, ...directCases],
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
      children,
    });
  }

  // Orphan test cases (no section)
  const orphanCases = casesBySection.get(null) ?? [];
  for (const tc of orphanCases) {
    tree.push(testCaseNode(tc));
  }

  return tree;
}

/**
 * Moves a node within the tree data structure (pure function, returns new tree).
 * Used for optimistic UI updates before the server confirms the change.
 */
export function moveNodeInTree(
  tree: TreeNode[],
  dragId: string,
  targetParentId: string | null,
  targetIndex: number,
): TreeNode[] {
  let draggedNode: TreeNode | null = null;

  function removeNode(nodes: TreeNode[]): TreeNode[] {
    return nodes.reduce<TreeNode[]>((acc, node) => {
      if (node.id === dragId) {
        draggedNode = node;
        return acc;
      }
      if (node.children) {
        return [...acc, { ...node, children: removeNode(node.children) }];
      }
      return [...acc, node];
    }, []);
  }

  const treeWithoutDragged = removeNode(tree);
  if (!draggedNode) return tree;

  if (targetParentId === null) {
    const result = [...treeWithoutDragged];
    result.splice(targetIndex, 0, draggedNode);
    return result;
  }

  function insertNode(nodes: TreeNode[]): TreeNode[] {
    return nodes.map((node) => {
      if (node.id === targetParentId) {
        const newChildren = [...(node.children ?? [])];
        newChildren.splice(targetIndex, 0, draggedNode!);
        return { ...node, children: newChildren };
      }
      if (node.children) {
        return { ...node, children: insertNode(node.children) };
      }
      return node;
    });
  }

  return insertNode(treeWithoutDragged);
}
