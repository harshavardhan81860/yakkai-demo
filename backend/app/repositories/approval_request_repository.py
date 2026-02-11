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

        # ✅ NEW: Use UserService to get complete access mappings
        from services.user_service import UserService
        from repositories.user_repository import UserRepository
        
        user_service = UserService()
        user_repo = UserRepository()
        
        # Get user by username
        user = await user_repo.get_by_username(session, exclude_user)
        if not user:
            return []
        
        # Get complete access mappings (includes inherited roles!)
        access_mappings = await user_service.get_user_access_mappings(session, str(user.id))
        
        # Extract role names and group names (both DIRECT and INHERITED)
        user_roles = {role["name"] for role in access_mappings["roles"]}
        user_groups = {group["name"] for group in access_mappings["groups"]}

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
            
            # 1️⃣ Check template approvers
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

            # 2️⃣ Check explicit approvers (current level only)
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
        from services.user_service import UserService
        
        # Get role ID
        stmt = select(Role.id).where(Role.name == role_name)
        result = await session.execute(stmt)
        role_id = result.scalar_one_or_none()

        if not role_id:
            return []

        # Get users with DIRECT role assignments
        stmt = select(RoleAssignment.user_id).where(
            RoleAssignment.role_id == role_id
        )
        result = await session.execute(stmt)
        direct_users = {str(r[0]) for r in result.all()}

        # Get users who have this role through GROUP inheritance
        # We need to check all users in groups that have this role
        from models.group_role_assignment import GroupRoleAssignment
        
        # Get groups that have this role
        stmt = select(GroupRoleAssignment.group_id).where(
            GroupRoleAssignment.role_id == role_id
        )
        result = await session.execute(stmt)
        group_ids = [r[0] for r in result.all()]

        inherited_users = set()
        if group_ids:
            # Get all users in these groups
            stmt = select(GroupAssignment.user_id).where(
                GroupAssignment.group_id.in_(group_ids)
            )
            result = await session.execute(stmt)
            inherited_users = {str(r[0]) for r in result.all()}

        # Return combined set as list
        return list(direct_users | inherited_users)

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
        # ✅ NEW: Use UserService for complete access mappings
        from services.user_service import UserService
        from repositories.user_repository import UserRepository
        
        user_service = UserService()
        user_repo = UserRepository()
        
        # Get user by username
        user = await user_repo.get_by_username(session, username)
        if not user:
            return False
        
        # Get complete access mappings (includes inherited roles!)
        access_mappings = await user_service.get_user_access_mappings(session, str(user.id))
        
        # Extract role names and group names (both DIRECT and INHERITED)
        user_roles = {role["name"] for role in access_mappings["roles"]}
        user_groups = {group["name"] for group in access_mappings["groups"]}

        template_levels = await self.get_template_levels(
            session, req.template_id, req.template_version
        )
        explicit = await self.get_explicit_approvers(session, req.id)

        for level in template_levels:
            if level["level_order"] != req.current_level:
                continue

            # Check template approvers
            for a in level["approvers"]:
                if a["approver_type"] == "USER" and a["approver_value"] == username:
                    return True
                if a["approver_type"] == "ROLE" and a["approver_value"] in user_roles:
                    return True
                if a["approver_type"] == "GROUP" and a["approver_value"] in user_groups:
                    return True

            # Check explicit approvers
            for ea in explicit:
                if ea.level_order != req.current_level:
                    continue
                if ea.approver_type == "USER" and ea.approver_value == username:
                    return True
                if ea.approver_type == "ROLE" and ea.approver_value in user_roles:
                    return True
                if ea.approver_type == "GROUP" and ea.approver_value in user_groups:
                    return True

        return False

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
