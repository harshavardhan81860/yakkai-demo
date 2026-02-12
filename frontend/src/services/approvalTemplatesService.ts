// src/services/approvalTemplatesService.ts
import api from "./api";

/* ---------- TYPES ---------- */

export type ApprovalMode = "MANUAL" | "AUTO";
export type ApprovalStrategy = "ANY" | "ALL" | "QUANTUM";
export type ApproverType = "USER" | "ROLE" | "GROUP";

export interface Approver {
  approver_type: ApproverType;
  approver_value: string;
  is_mandatory: boolean;
}

export interface ApprovalLevel {
  level_order: number;
  approval_mode: ApprovalMode;
  approval_strategy: ApprovalStrategy;
  required_approvals?: number;
  sla_minutes?: number;
  approvers: Approver[];
}

export interface ApprovalTemplate {
  id: string;
  template_name: string;
  scope: "SYSTEM" | "TENANT";
  tenant_id?: string;
  version: number;
  is_active: boolean;
  default_sla_minutes: number;
  levels?: ApprovalLevel[];
  levels_count?: number;
  created_at: string;
}

/* ---------- LIST TEMPLATES ---------- */

export const fetchApprovalTemplates = async (params?: {
  template_name?: string;
  is_active?: boolean;
  scope?: string;
  tenant_id?: string;
}): Promise<ApprovalTemplate[]> => {
  const res = await api.get("api/v1/approval/templates/", { params });

  // ✅ NORMALIZE HERE
  return res.data?.data?.templates ?? [];
};

/* ---------- TEMPLATE DETAILS ---------- */

export const getApprovalTemplateDetails = async (params: {
  template_id?: string;
  template_name?: string;
  version?: number;
}) => {
  const res = await api.get("api/v1/approval/templates/details", { params });
  return res.data;
};

/* ---------- CREATE ---------- */

export const createApprovalTemplate = async (payload: {
  template_name: string;
  scope?: "SYSTEM" | "TENANT";
  tenant_id?: string | null;
  default_sla_minutes: number | null;
  levels: ApprovalLevel[];
}) => {
  const res = await api.post("api/v1/approval/templates/", payload);
  return res.data;
};

/* ---------- UPDATE (NEW VERSION) ---------- */

export const updateApprovalTemplate = async (
  templateId: string,
  payload: {
    default_sla_minutes: number | null;
    levels: ApprovalLevel[];
  }
) => {
  const res = await api.put(
    `/api/v1/approval/templates/${templateId}`,
    payload
  );
  return res.data;
};

/* ---------- ACTIVATE / DEACTIVATE ---------- */

export const activateApprovalTemplate = async (templateId: string) =>
  api.patch(`/api/v1/approval/templates/${templateId}/activate`);

export const deactivateApprovalTemplate = async (templateId: string) =>
  api.patch(`/api/v1/approval/templates/${templateId}/deactivate`);
