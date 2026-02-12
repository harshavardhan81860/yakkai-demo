import api from "./api";

/* ================= TYPES ================= */
export interface ApprovalPolicy {
  id: string;
  resource_name: string;
  action_name: string;
  scope_type: string;
  scope_id?: string;
  template_id: string;
  template_name?: string;
  is_mandatory: boolean;
  is_active: boolean;
  groups?: ApprovalGroup[];
  created_at: string;
  updated_at: string;
}

export interface ApprovalGroup {
  id: string;
  operator: string;
  conditions: ApprovalCondition[];
}

export interface ApprovalCondition {
  id: string;
  attribute: string;
  operator: string;
  value: string;
}

/* ================= APIs ================= */

/* ---------- FETCH POLICY LIST ---------- */
export const fetchPolicies = async (): Promise<ApprovalPolicy[]> => {
  const res = await api.get("api/v1/approval-mapping/policies");
  return res.data?.data?.policies ?? [];
};

/* ---------- FETCH POLICY DETAILS ---------- */
export const fetchPolicyDetails = async (
  policyId: string
): Promise<{ policy: ApprovalPolicy; groups: ApprovalGroup[] }> => {
  const res = await api.get(`/api/v1/approval-mapping/policy/${policyId}/details`);
  return res.data?.data ?? { policy: null, groups: [] };
};

/* ---------- CREATE POLICY ---------- */
export type CreatePolicyPayload = {
  resource_name: string;
  action_name: string;
  scope_type: string;
  scope_id?: string;
  template_id: string;
  is_mandatory: boolean;
};

export const createPolicy = async (payload: CreatePolicyPayload) => {
  const res = await api.post("api/v1/approval-mapping/policy", payload);
  return res.data;
};

/* ---------- UPDATE POLICY ---------- */
export type UpdatePolicyPayload = {
  is_active?: boolean;
  template_id?: string;
  is_mandatory?: boolean;
};

export const updatePolicy = async (
  policyId: string,
  payload: UpdatePolicyPayload
) => {
  const res = await api.put(`/api/v1/approval-mapping/policy/${policyId}`, payload);
  return res.data;
};


/* ---------- FETCH OPERATORS ---------- */
export const fetchOperators = async (): Promise<{ label: string; value: string }[]> => {
  const res = await api.get("api/v1/approval-mapping/operators");
  return res.data?.data?.operators ?? [];
};
