# repositories/approval_request_repository.py
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, exists, and_
from fastapi import HTTPException
from models.approval_request import (
    ApprovalRequest,
    ApprovalRequestExplicitApprover,
    ApprovalAction
)
from models.approval_template import (
    ApprovalTemplateLevel,
    ApprovalTemplateApprover,
    ApprovalTemplate
)
from models.role_assignment import RoleAssignment
from models.role import Role
from models.group import GroupAssignment, Group
from utils.serializer import orm_to_dict
from models.user import User


class ApprovalRequestRepository:

    # ---------------------------
    # Create request
    # ---------------------------
    async def create_request(self, session, user, data):
        req = ApprovalRequest(
            template_id=data.template_id,
            template_version=data.template_version,
            requested_by=user,
            request_payload=data.request_payload
        )
        session.add(req)
        await session.flush()

        for ap in data.explicit_approvers or []:
            session.add(
                ApprovalRequestExplicitApprover(
                    request_id=req.id,
                    level_order=ap.level_order,
                    approver_type=ap.approver_type,
                    approver_value=ap.approver_value
                )
            )

        await session.commit()
        await session.refresh(req)
        return req

    # ---------------------------
    # Get request
    # ---------------------------
    async def get_request(self, session, request_id):
        req = await session.get(ApprovalRequest, request_id)
        if not req:
            raise HTTPException(404, "Approval request not found")
        return req

    # ---------------------------
    # Check if level already acted
    # ---------------------------
    async def has_action_for_level(self, session, request_id, level):
        stmt = select(
            exists().where(
                ApprovalAction.request_id == request_id,
                ApprovalAction.level_order == level
            )
        )
        return (await session.execute(stmt)).scalar()

    # ---------------------------
    # Add action
    # ---------------------------
    async def add_action(
        self,
        session,
        request_id,
        level,
        user,
        source,
        decision,
        comment
    ):
        action = ApprovalAction(
            request_id=request_id,
            level_order=level,
            approver_username=user,
            approver_source=source,
            decision=decision,
            comment=comment
        )
        session.add(action)
        await session.commit()
        return action

    # ---------------------------
    # Close request
    # ---------------------------
    async def close_request(self, session, req, status):
        req.status = status
        await session.commit()

    # ---------------------------
    # Approval actions (audit)
    # ---------------------------
    async def get_approval_actions(self, session, username=None):
        stmt = select(ApprovalAction)
        if username:
            stmt = stmt.where(ApprovalAction.approver_username == username)
        result = await session.execute(stmt)
        return [orm_to_dict(a) for a in result.scalars().all()]

    # ---------------------------
    # Template levels + approvers
    # ---------------------------
    async def get_template_levels(
        self,
        session: AsyncSession,
        template_id,
        template_version
    ):
        stmt = (
            select(
                ApprovalTemplateLevel,
                ApprovalTemplateApprover
            )
            .join(
                ApprovalTemplateApprover,
                ApprovalTemplateApprover.template_level_id == ApprovalTemplateLevel.id,
                isouter=True
            )
            .where(
                and_(
                    ApprovalTemplateLevel.template_id == template_id,
                    ApprovalTemplateLevel.template.has(
                        ApprovalTemplate.version == template_version
                    )
                )
            )
            .order_by(ApprovalTemplateLevel.level_order)
        )

        result = await session.execute(stmt)
        levels: dict[int, dict] = {}

        for level, approver in result.all():
            lvl_no = level.level_order
            if lvl_no not in levels:
                levels[lvl_no] = {
                    "level_order": lvl_no,
                    "approval_mode": level.approval_mode,
                    "approval_strategy": level.approval_strategy,
                    "required_approvals": level.required_approvals,
                    "sla_minutes": level.sla_minutes,
                    "approvers": []
                }
            if approver:
                levels[lvl_no]["approvers"].append({
                    "approver_type": approver.approver_type,
                    "approver_value": approver.approver_value,
                    "is_mandatory": approver.is_mandatory
                })
        return list(levels.values())

    # ---------------------------
    # Explicit approvers for request
    # ---------------------------
    async def get_explicit_approvers(self, session, request_id):
        stmt = select(ApprovalRequestExplicitApprover).where(
            ApprovalRequestExplicitApprover.request_id == request_id
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    # ---------------------------
    # Actions by request
    # ---------------------------
    async def get_actions_by_request(self, session, request_id):
        stmt = select(ApprovalAction).where(
            ApprovalAction.request_id == request_id
        )
        result = await session.execute(stmt)
        return result.scalars().all()

    # ---------------------------
    # List approval requests (summary)
    # ---------------------------
    async def list_requests(self, session: AsyncSession, username: str | None = None):
        stmt = select(ApprovalRequest).order_by(ApprovalRequest.created_at.desc())
        if username:
            stmt = stmt.where(ApprovalRequest.requested_by == username)
        result = await session.execute(stmt)
        return [
            {
                "request_id": str(r.id),
                "template_id": str(r.template_id),
                "template_version": r.template_version,
                "status": r.status,
                "current_level": r.current_level,
                "requested_by": r.requested_by,
                "created_at": r.created_at
            }
            for r in result.scalars().all()
        ]


    async def get_user_id(self, session: AsyncSession, username: str) -> int:
        stmt = select(User.id).where(User.username == username)
        result = await session.execute(stmt)
        user_id = result.scalar_one_or_none()
        if user_id is None:
            raise HTTPException(status_code=404, detail=f"User '{username}' not found")
        return user_id

    async def get_user_roles(self, session: AsyncSession, username: str):
        user_id = await self.get_user_id(session, username)

        stmt = (
            select(Role.name)
            .join(RoleAssignment, RoleAssignment.role_id == Role.id)
            .where(RoleAssignment.user_id == user_id)
        )

        result = await session.execute(stmt)
        return {r[0] for r in result.all()}

    async def get_user_groups(self, session: AsyncSession, username: str):
        user_id = await self.get_user_id(session, username)

        stmt = (
            select(Group.name)
            .join(GroupAssignment, GroupAssignment.group_id == Group.id)
            .where(GroupAssignment.user_id == user_id)
        )

        result = await session.execute(stmt)
        return {r[0] for r in result.all()}


    # ---------------------------
    # Pending approvals (eligibility check)
    # ---------------------------
    async def get_pending_approvals(self, session: AsyncSession, exclude_user: str | None = None):
        stmt = select(ApprovalRequest).where(ApprovalRequest.status == "PENDING")

        if exclude_user:
            stmt = stmt.where(ApprovalRequest.requested_by != exclude_user)

        result = await session.execute(stmt)
        requests = result.scalars().all()

        if not exclude_user:
            return [orm_to_dict(r) for r in requests]

        # fetch user context ONCE
        user_roles = set(await self.get_user_roles(session, exclude_user))
        user_groups = set(await self.get_user_groups(session, exclude_user))

        filtered = []

        for req in requests:
            # skip if level already acted
            if await self.has_action_for_level(session, req.id, req.current_level):
                continue

            # fetch template approvers for current level only
            template_levels = await self.get_template_levels(
                session, req.template_id, req.template_version
            )

            current_level = next(
                (l for l in template_levels if l["level_order"] == req.current_level),
                None
            )

            if not current_level:
                continue

            eligible = False
            for a in current_level["approvers"]:
                if a["approver_type"] == "USER" and a["approver_value"] == exclude_user:
                    eligible = True
                    break
                if a["approver_type"] == "ROLE" and a["approver_value"] in user_roles:
                    eligible = True
                    break
                if a["approver_type"] == "GROUP" and a["approver_value"] in user_groups:
                    eligible = True
                    break
            if eligible:
                filtered.append(req)
                continue

            # 2️⃣ EXPLICIT approvers (current level only)
            explicit_approvers = await self.get_explicit_approvers(session, req.id)

            for ea in explicit_approvers:
                if ea.level_order != req.current_level:
                    continue

                if ea.approver_type == "USER" and ea.approver_value == exclude_user:
                    eligible = True
                elif ea.approver_type == "ROLE" and ea.approver_value in user_roles:
                    eligible = True
                elif ea.approver_type == "GROUP" and ea.approver_value in user_groups:
                    eligible = True

                if eligible:
                    filtered.append(req)
                    break

        return [orm_to_dict(r) for r in filtered]


    # Fetch all usernames assigned to a role
    async def get_users_for_role(
            self,
            session: AsyncSession,
            role_name: str
        ):
            stmt = select(Role.id).where(Role.name == role_name)
            result = await session.execute(stmt)
            role_id = result.scalar_one_or_none()

            if not role_id:
                return []

            stmt = select(RoleAssignment.user_id).where(
                RoleAssignment.role_id == role_id
            )
            result = await session.execute(stmt)

            return [str(r[0]) for r in result.all()]

    # Fetch all usernames assigned to a group
    async def get_users_for_group(
        self,
        session: AsyncSession,
        group_name: str
    ):
        # 1. Resolve group ID from name
        stmt = select(Group.id).where(Group.name == group_name)
        result = await session.execute(stmt)
        group_id = result.scalar_one_or_none()

        if not group_id:
            return []

        # 2. Fetch users from assignments
        stmt = select(GroupAssignment.user_id).where(
            GroupAssignment.group_id == group_id
        )
        result = await session.execute(stmt)

        return [str(r[0]) for r in result.all()]
        

    async def is_user_eligible_for_level(self, session, req, username: str) -> bool:
            template_levels = await self.get_template_levels(
                session, req.template_id, req.template_version
            )
            explicit = await self.get_explicit_approvers(session, req.id)

            user_roles = set(await self.get_user_roles(session, username))
            user_groups = set(await self.get_user_groups(session, username))

            for level in template_levels:
                if level["level_order"] != req.current_level:
                    continue

                # explicit approvers first
                for ea in explicit:
                    if ea.level_order != req.current_level:
                        continue
                    if ea.approver_type == "USER" and ea.approver_value == username:
                        return True
                    if ea.approver_type == "ROLE" and ea.approver_value in user_roles:
                        return True
                    if ea.approver_type == "GROUP" and ea.approver_value in user_groups:
                        return True   

    async def get_next_level(
                self,
                session: AsyncSession,
                template_id,
                template_version,
                current_level: int
            ):
                stmt = (
                    select(ApprovalTemplateLevel.level_order)
                    .where(
                        ApprovalTemplateLevel.template_id == template_id,
                        ApprovalTemplateLevel.template.has(
                            ApprovalTemplate.version == template_version
                        ),
                        ApprovalTemplateLevel.level_order > current_level
                    )
                    .order_by(ApprovalTemplateLevel.level_order)
                    .limit(1)
                )

                result = await session.execute(stmt)
                return result.scalar()
