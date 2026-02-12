import type { SharedStepStatus } from "../constants/shared-step.js";

export interface SharedStep {
  id: string;
  title: string;
  description: string | null;
  projectId: string;
  status: SharedStepStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SharedStepAction {
  id: string;
  sharedStepId: string;
  stepOrder: number;
  action: string;
  data: string | null;
  expectedResult: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedStepWithActions extends SharedStep {
  actions: SharedStepAction[];
}

export interface CreateSharedStepRequest {
  title: string;
  description?: string;
  projectId: string;
  status?: SharedStepStatus;
}

export interface UpdateSharedStepRequest {
  title?: string;
  description?: string | null;
  status?: SharedStepStatus;
}

export interface CreateSharedStepActionRequest {
  action: string;
  data?: string;
  expectedResult?: string;
}

export interface UpdateSharedStepActionRequest {
  action?: string;
  data?: string | null;
  expectedResult?: string | null;
  stepOrder?: number;
}

export interface ReorderSharedStepActionsRequest {
  actionIds: string[];
}
