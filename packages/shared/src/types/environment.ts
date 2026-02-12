import type { EnvironmentType } from "../constants/index.js";
import type { AuditFields } from "./common.js";

export interface Environment extends AuditFields {
  id: string;
  name: string;
  url: string | null;
  description: string | null;
  type: EnvironmentType;
  isDefault: boolean;
  displayOrder: number;
  projectId: string;
}

export interface CreateEnvironmentRequest {
  name: string;
  projectId: string;
  url?: string;
  description?: string;
  type?: EnvironmentType;
  isDefault?: boolean;
}
