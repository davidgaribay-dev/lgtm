import type {
  TestCasePriority,
  TestCaseType,
  TestCaseSeverity,
  TestCaseAutomationStatus,
  TestCaseStatus,
  TestCaseBehavior,
  TestCaseLayer,
} from "../constants/index.js";
import type { AuditFields } from "./common.js";

export interface TestCase extends AuditFields {
  id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  postconditions: string | null;
  projectId: string;
  sectionId: string | null;
  suiteId: string | null;
  type: TestCaseType;
  priority: TestCasePriority;
  severity: TestCaseSeverity;
  automationStatus: TestCaseAutomationStatus;
  status: TestCaseStatus;
  behavior: TestCaseBehavior;
  layer: TestCaseLayer;
  isFlaky: boolean;
  caseNumber: number;
  caseKey: string;
  assigneeId: string | null;
  displayOrder: number;
  cycleId: string | null;
  workspaceCycleId: string | null;
}

export interface CreateTestCaseRequest {
  title: string;
  projectId: string;
  sectionId?: string;
  description?: string;
  preconditions?: string;
  postconditions?: string;
  priority?: TestCasePriority;
  type?: TestCaseType;
  severity?: TestCaseSeverity;
  automationStatus?: TestCaseAutomationStatus;
  status?: TestCaseStatus;
  behavior?: TestCaseBehavior;
  layer?: TestCaseLayer;
  isFlaky?: boolean;
  assigneeId?: string;
}

export interface UpdateTestCaseRequest {
  projectId: string;
  title?: string;
  description?: string;
  preconditions?: string;
  postconditions?: string;
  priority?: TestCasePriority;
  type?: TestCaseType;
  severity?: TestCaseSeverity;
  automationStatus?: TestCaseAutomationStatus;
  status?: TestCaseStatus;
  behavior?: TestCaseBehavior;
  layer?: TestCaseLayer;
  isFlaky?: boolean;
  assigneeId?: string | null;
  sectionId?: string | null;
}
