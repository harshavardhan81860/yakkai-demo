import api from "./api";

/* ---------- TYPES ---------- */

export type PendingApproval = {
  id: string;
  template_id: string;
  template_version: number;
  requested_by: string;
  request_payload: any;
  status: string;
  current_level: number;
  created_at: string;
};

/* ---------- FETCH PENDING ---------- */

export const fetchPendingApprovals = async (params: {
  use_current_user: boolean;
}) => {
  const res = await api.get("api/v1/approval/approvals/pending", { params });
  return res.data;
};

/* ---------- SUBMIT DECISION ---------- */

export const submitApprovalDecision = async (
  requestId: string,
  payload: { decision: "APPROVED" | "REJECTED"; comment?: string }
) => {
  const res = await api.post(
    `/api/v1/approval/requests/${requestId}/decision`,
    payload
  );
  return res.data;
};

/* ---------- REQUEST DETAILS ---------- */

export const fetchApprovalRequestDetails = async (requestId: string) => {
  const res = await api.get(`/api/v1/approval/requests/${requestId}/details`);
  return res.data;
};
