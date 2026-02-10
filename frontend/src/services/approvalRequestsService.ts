import api from "./api";

/* ---------- SUBMIT REQUEST ---------- */
export const submitApprovalRequest = (payload: {
  template_id: string;
  template_version: number;
  request_payload: Record<string, any>;
  explicit_approvers: {
    approver_type: "USER" | "ROLE" | "GROUP";
    approver_value: string;
  }[];
}) => {
  return api.post("api/v1/approval/requests", payload);
};



export const fetchApprovalRequests = (params: any) =>
  api.get("api/v1/approval/requests", { params }).then((r) => r.data);

export const fetchApprovalRequestDetails = (requestId: string) =>
  api
    .get(`/api/v1/approval/requests/${requestId}/details`)
    .then((r) => r.data);

export const closeApprovalRequest = (requestId: string, reason: string) =>
  api.post(`/api/v1/approval/requests/${requestId}/close`, null, {
    params: { reason },
  });
