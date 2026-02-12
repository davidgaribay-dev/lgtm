import type { AuditFields } from "./common.js";

export interface Project extends AuditFields {
  id: string;
  name: string;
  key: string;
  description: string | null;
  organizationId: string;
  status: string;
  displayOrder: number;
  nextTestCaseNumber: number;
  nextRunNumber: number;
  nextDefectNumber: number;
}
