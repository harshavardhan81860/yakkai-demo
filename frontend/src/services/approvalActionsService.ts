import api from "./api";

export interface ApprovalAction {
  id: string;
  request_id: string;
  level_order: number;
  approver_username: string;
  approver_source: string;
  decision: string;
  comment: string | null;
  created_at: string;
}

export const fetchApprovalActions = async (params: {
  username?: string;
  use_current_user?: boolean;
}): Promise<ApprovalAction[]> => {
  const res = await api.get(
    "api/v1/approval/approvals/actions",
    { params }
  );
  return Array.isArray(res.data?.data) ? res.data.data : [];
};
