# services/approval_request_service.py
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.approval_request_repository import ApprovalRequestRepository
from schemas.approval_request_schema import (
    SubmitApprovalRequestSchema,
    ApprovalDecisionSchema
)


class ApprovalRequestService:

    def __init__(self):
        self.repo = ApprovalRequestRepository()

    # ---------------------------
    # Submit request
    # ---------------------------
    async def submit_request(
            self,
            session: AsyncSession,
            current_user: str,
            data: SubmitApprovalRequestSchema
        ):
            template_levels = await self.repo.get_template_levels(
                session, data.template_id, data.template_version
            )

            all_eligible = set()

            for level in template_levels:
                for a in level["approvers"]:
                    if a["approver_type"] == "USER":
                        all_eligible.add(a["approver_value"])

                    elif a["approver_type"] == "ROLE":
                        role_users = await self.repo.get_users_for_role(
                            session, a["approver_value"]
                        )
                        all_eligible.update(role_users)

                    elif a["approver_type"] == "GROUP":
                        group_users = await self.repo.get_users_for_group(
                            session, a["approver_value"]
                        )
                        all_eligible.update(group_users)

            for ea in data.explicit_approvers or []:
                if ea.approver_value == current_user:
                    raise HTTPException(400, "Requested user cannot be an approver")

                if ea.approver_type == "USER" and ea.approver_value not in all_eligible:
                    raise HTTPException(
                        400,
                        f"Explicit user {ea.approver_value} is not part of eligible approvers"
                    )

                if ea.approver_type == "ROLE":
                    role_users = await self.repo.get_users_for_role(
                        session, ea.approver_value
                    )
                    if not role_users:
                        raise HTTPException(
                            400,
                            f"Explicit role {ea.approver_value} has no eligible users"
                        )

                if ea.approver_type == "GROUP":
                    group_users = await self.repo.get_users_for_group(
                        session, ea.approver_value
                    )
                    if not group_users:
                        raise HTTPException(
                            400,
                            f"Explicit group {ea.approver_value} has no members"
                        )

            return await self.repo.create_request(session, current_user, data)


    # ---------------------------
    # Submit decision
    # ---------------------------
    async def submit_decision(
            self,
            session: AsyncSession,
            request_id: str,
            current_user: str,
            data: ApprovalDecisionSchema
        ):
            req = await self.repo.get_request(session, request_id)

            # 🚫 Already closed
            if req.status != "PENDING":
                raise HTTPException(
                    409, "This approval request has already been closed"
                )

            # 🚫 Requested user cannot approve
            if req.requested_by == current_user:
                raise HTTPException(
                    403, "Requested user cannot approve this request"
                )

            # 🚫 Level already completed
            if await self.repo.has_action_for_level(
                session, req.id, req.current_level
            ):
                raise HTTPException(
                    409, "This approval level is already completed"
                )

            # 🔐 Eligibility validation
            if not await self.repo.is_user_eligible_for_level(
                session=session,
                req=req,
                username=current_user
            ):
                raise HTTPException(
                    403, "User is not eligible to approve this level"
                )

            # ✅ Record action
            action = await self.repo.add_action(
                session=session,
                request_id=req.id,
                level=req.current_level,
                user=current_user,
                source="MANUAL",
                decision=data.decision,
                comment=data.comment
            )

            # ❌ REJECT → close immediately
            if data.decision == "REJECTED":
                await self.repo.close_request(session, req, "REJECTED")
                return action

            # ✅ APPROVED → move forward
            next_level = await self.repo.get_next_level(
                session,
                req.template_id,
                req.template_version,
                req.current_level
            )

            if next_level is None:
                # 🎯 Last level approved
                await self.repo.close_request(session, req, "APPROVED")
            else:
                # ➡ Move to next level
                req.current_level = next_level
                await session.commit()

            return action

    # ---------------------------
    # Pending approvals
    # ---------------------------
   # services/approval_request_service.py

    async def get_pending_approvals(
        self,
        session: AsyncSession,
        username: str | None = None,
        current_user: str | None = None
    ):
        if username and current_user:
            raise HTTPException(
                status_code=400,
                detail="Provide either username or use_current_user, not both"
            )

        effective_user = username or current_user

        # Repo will handle eligibility check (USER, ROLE, GROUP) and exclude_user
        return await self.repo.get_pending_approvals(
            session=session,
            exclude_user=effective_user
        )



    # ---------------------------
    # Approval actions
    # ---------------------------
    async def get_approval_actions(
        self,
        session: AsyncSession,
        username: str | None,
        current_user: str | None
    ):
        effective_user = username or current_user
        return await self.repo.get_approval_actions(
            session=session,
            username=effective_user
        )

    async def close_request(
        self,
        session: AsyncSession,
        request_id: str,
        current_user: str,
        reason: str | None
    ):
        req = await self.repo.get_request(session, request_id)

        if req.status != "PENDING":
            raise HTTPException(
                status_code=409,
                detail="Approval request is already closed"
            )

        action = await self.repo.add_action(
            session=session,
            request_id=req.id,
            level=req.current_level,
            user=current_user,
            source="MANUAL",
            decision="CLOSED",
            comment=reason
        )

        await self.repo.close_request(session, req, "CLOSED")
        return action


    async def get_request_details(
        self,
        session: AsyncSession,
        request_id: str
    ):
        req = await self.repo.get_request(session, request_id)

        template_levels = await self.repo.get_template_levels(
            session,
            req.template_id,
            req.template_version
        )

        explicit_approvers = await self.repo.get_explicit_approvers(
            session,
            req.id
        )

        actions = await self.repo.get_actions_by_request(
            session,
            req.id
        )

        action_map = {
            a.level_order: a for a in actions
        }

        explicit_map = {}
        for ea in explicit_approvers:
            explicit_map.setdefault(ea.level_order, []).append({
                "type": ea.approver_type,
                "value": ea.approver_value,
                "source": "EXPLICIT"
            })

        timeline = []

        for level in template_levels:
            lvl_no = level["level_order"]

            if lvl_no < req.current_level:
                act = action_map.get(lvl_no)
                timeline.append({
                    "level_order": lvl_no,
                    "state": "COMPLETED",
                    "decision": act.decision if act else None,
                    "acted_by": act.approver_username if act else None,
                    "comment": act.comment if act else None
                })

            elif lvl_no == req.current_level:
                timeline.append({
                    "level_order": lvl_no,
                    "state": "ACTIVE",
                    "approval_mode": level["approval_mode"],
                    "approval_strategy": level["approval_strategy"],
                    "eligible_approvers": (
                        level["approvers"] +
                        explicit_map.get(lvl_no, [])
                    )
                })

            else:
                timeline.append({
                    "level_order": lvl_no,
                    "state": "UPCOMING",
                    "approval_mode": level["approval_mode"],
                    "approval_strategy": level["approval_strategy"],
                    "eligible_approvers": (
                        level["approvers"] +
                        explicit_map.get(lvl_no, [])
                    )
                })

        return {
            "request_id": str(req.id),
            "status": req.status,
            "current_level": req.current_level,
            "requested_by": req.requested_by,
            "created_at": req.created_at,
            "levels": timeline
        }

    async def list_requests(
        self,
        session: AsyncSession,
        username: str | None,
        current_user: str | None
    ):
        if username and current_user:
            raise HTTPException(
                status_code=400,
                detail="Provide either username or use_current_user, not both"
            )

        effective_user = username or current_user

        return await self.repo.list_requests(
            session=session,
            username=effective_user
        )
