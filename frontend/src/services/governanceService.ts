import api from "./api";

/* ================= TYPES ================= */

export interface Policy {
  id: string;
  resource_type: string;
  action_name: string;
  effect: "ALLOW" | "DENY";
  scope_type: string;
  scope_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UpdatePolicyPayload = {
  effect?: "ALLOW" | "DENY";
  is_active?: boolean;
};

/* ================= APIs ================= */

/* ---------- FETCH POLICIES ---------- */
export const fetchPolicies = async (): Promise<Policy[]> => {
  const res = await api.get("api/v1/governance/policies");
  return res.data?.data?.policies ?? [];
};

/* ---------- UPDATE POLICY (PATCH) ---------- */
export const updatePolicy = async (
  policyId: string,
  payload: UpdatePolicyPayload
) => {
  const res = await api.put(
    `/api/v1/governance/policy_update/${policyId}`,
    payload
  );
  return res.data;
};

/* ---------- CREATE POLICY ---------- */
export type CreatePolicyPayload = {
  resource_type: string;
  action_name: string;
  effect: "ALLOW" | "DENY";
  scope_type: string;
  scope_id?: string;
};

export const createPolicy = async (payload: CreatePolicyPayload) => {
  const res = await api.post("api/v1/governance/policy_create", payload);
  return res.data;
};


/* ================= SUBJECT TYPES ================= */

export interface PolicySubject {
  id: string;
  policy_id: string;
  subject_type: string;
  subject_id?: string;
  is_active: boolean;
  created_at: string;
}

/* ---------- FETCH POLICY SUBJECTS ---------- */
export const fetchPolicySubjects = async (): Promise<PolicySubject[]> => {
  const res = await api.get("api/v1/governance/policy-subjects");
  return res.data?.data?.items ?? [];
};

/* ---------- UPDATE SUBJECT (ACTIVATE / DEACTIVATE) ---------- */
export const updatePolicySubject = async (
  subjectId: string,
  isActive: boolean
) => {
  const res = await api.put(
    `/api/v1/governance/policy-subject/${subjectId}`,
    { is_active: isActive }
  );
  return res.data;
};


/* ---------- POLICY SUBJECT ---------- */
export type CreatePolicySubjectPayload = {
  policy_id: string;
  subject_type: "USER" | "GROUP" | "ROLE";
  subject_id?: string;
};

/* ---------- CREATE POLICY SUBJECT ---------- */
export const createPolicySubject = async (
  payload: CreatePolicySubjectPayload
) => {
  const res = await api.post(
    "api/v1/governance/policy-subject",
    payload
  );
  return res.data;
};
