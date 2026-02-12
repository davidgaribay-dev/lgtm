import type {
  DefectStatus,
  DefectResolution,
  DefectSeverity,
  DefectPriority,
  DefectType,
} from "../constants/index.js";
import type { AuditFields } from "./common.js";

export interface Defect extends AuditFields {
  id: string;
  title: string;
  description: string | null;
  defectNumber: number;
  defectKey: string;
  projectId: string;
  severity: DefectSeverity;
  priority: DefectPriority;
  defectType: DefectType;
  status: DefectStatus;
  resolution: DefectResolution | null;
  assigneeId: string | null;
  stepsToReproduce: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  externalUrl: string | null;
  testResultId: string | null;
  testRunId: string | null;
  testCaseId: string | null;
  environmentId: string | null;
  cycleId: string | null;
  workspaceCycleId: string | null;
}

export interface CreateDefectRequest {
  title: string;
  projectId: string;
  description?: string;
  severity?: DefectSeverity;
  priority?: DefectPriority;
  defectType?: DefectType;
  assigneeId?: string;
  stepsToReproduce?: string;
  expectedResult?: string;
  actualResult?: string;
  testResultId?: string;
  testRunId?: string;
  testCaseId?: string;
  externalUrl?: string;
  environmentId?: string;
  cycleId?: string;
  workspaceCycleId?: string;
}
