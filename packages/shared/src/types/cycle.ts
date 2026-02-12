import type { CycleStatus } from "../constants/index.js";
import type { AuditFields } from "./common.js";

export interface Cycle extends AuditFields {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CycleStatus;
  isCurrent: boolean;
  displayOrder: number;
  projectId: string;
}

export interface WorkspaceCycle extends AuditFields {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: CycleStatus;
  isCurrent: boolean;
  displayOrder: number;
  organizationId: string;
}
