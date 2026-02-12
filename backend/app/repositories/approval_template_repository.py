from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from fastapi import HTTPException

from models.approval_template import (
    ApprovalTemplate,
    ApprovalTemplateLevel,
    ApprovalTemplateApprover
)
from schemas.approval_template_schema import CreateApprovalTemplateRequest
from sqlalchemy.orm import selectinload
from uuid import UUID


class ApprovalTemplateRepository:

    async def list_templates(
        self,
        session: AsyncSession,
        template_name: str | None,
        is_active: bool | None,
        scope: str | None = None,
        tenant_id: str | None = None
    ):
        stmt = select(ApprovalTemplate)

        if template_name:
            stmt = stmt.where(ApprovalTemplate.template_name == template_name)

        if is_active is not None:
            stmt = stmt.where(ApprovalTemplate.is_active == is_active)

        if scope:
            stmt = stmt.where(ApprovalTemplate.scope == scope)
            if scope == "TENANT" and tenant_id:
                stmt = stmt.where(ApprovalTemplate.tenant_id == tenant_id)

        result = await session.execute(stmt.order_by(desc(ApprovalTemplate.created_at)))
        return result.scalars().all()

    async def get_active_template(self, session: AsyncSession, template_name: str, scope: str = "SYSTEM", tenant_id: str | None = None):
        stmt = select(ApprovalTemplate).where(
            ApprovalTemplate.template_name == template_name,
            ApprovalTemplate.is_active.is_(True),
            ApprovalTemplate.scope == scope
        )
        if scope == "TENANT":
            stmt = stmt.where(ApprovalTemplate.tenant_id == tenant_id)
        
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_template(
        self,
        session: AsyncSession,
        req: CreateApprovalTemplateRequest
    ):
        template = ApprovalTemplate(
            template_name=req.template_name,
            scope=req.scope,
            tenant_id=req.tenant_id,
            version=1,
            is_active=req.is_active,
            default_sla_minutes=req.default_sla_minutes
        )

        session.add(template)
        await session.flush()

        for lvl in req.levels:
            level = ApprovalTemplateLevel(
                template_id=template.id,
                level_order=lvl.level_order,
                approval_mode=lvl.approval_mode,
                approval_strategy=lvl.approval_strategy,
                required_approvals=lvl.required_approvals,
                sla_minutes=lvl.sla_minutes
            )
            session.add(level)
            await session.flush()

            for ap in lvl.approvers:
                session.add(
                    ApprovalTemplateApprover(
                        template_level_id=level.id,
                        approver_type=ap.approver_type,
                        approver_value=ap.approver_value,
                        is_mandatory=ap.is_mandatory
                    )
                )

        await session.commit()
        await session.refresh(template)
        return template

    async def set_active(
        self,
        session: AsyncSession,
        template_id: str,
        active: bool
    ):
        template = await session.get(ApprovalTemplate, template_id)
        if not template:
            raise HTTPException(404, "Template not found")

        template.is_active = active
        await session.commit()
        await session.refresh(template)
        return template

    async def get_template_by_id(
        self,
        session: AsyncSession,
        template_id: str
    ):
        template = await session.get(ApprovalTemplate, template_id)
        if not template:
            raise HTTPException(404, "Template not found")
        return template


    async def create_new_version(
        self,
        session: AsyncSession,
        old_template: ApprovalTemplate,
        req
    ):
        # deactivate old
        old_template.is_active = False

        # create new version
        new_template = ApprovalTemplate(
            template_name=old_template.template_name,
            scope=old_template.scope,
            tenant_id=old_template.tenant_id,
            version=old_template.version + 1,
            is_active=True,
            default_sla_minutes=req.default_sla_minutes
        )
        session.add(new_template)
        await session.flush()

        for lvl in req.levels:
            level = ApprovalTemplateLevel(
                template_id=new_template.id,
                level_order=lvl.level_order,
                approval_mode=lvl.approval_mode,
                approval_strategy=lvl.approval_strategy,
                required_approvals=lvl.required_approvals,
                sla_minutes=lvl.sla_minutes
            )
            session.add(level)
            await session.flush()

            for ap in lvl.approvers:
                session.add(
                    ApprovalTemplateApprover(
                        template_level_id=level.id,
                        approver_type=ap.approver_type,
                        approver_value=ap.approver_value,
                        is_mandatory=ap.is_mandatory
                    )
                )

        await session.commit()
        await session.refresh(new_template)
        return new_template



    async def get_template_details_by_id(
                    self,
                    session: AsyncSession,
                    template_id: UUID
                ):
                    stmt = (
                        select(ApprovalTemplate)
                        .where(ApprovalTemplate.id == template_id)
                        .options(
                            selectinload(ApprovalTemplate.levels)
                            .selectinload(ApprovalTemplateLevel.approvers)
                        )
                    )

                    result = await session.execute(stmt)
                    template = result.scalar_one_or_none()

                    if not template:
                        raise HTTPException(404, "Template not found")

                    return self._serialize_template(template)
    async def get_template_details_by_name(
                        self,
                        session: AsyncSession,
                        template_name: str,
                        version: int | None
                    ):
                        stmt = (
                            select(ApprovalTemplate)
                            .where(ApprovalTemplate.template_name == template_name)
                            .options(
                                selectinload(ApprovalTemplate.levels)
                                .selectinload(ApprovalTemplateLevel.approvers)
                            )
                        )

                        if version is not None:
                            stmt = stmt.where(ApprovalTemplate.version == version)
                        else:
                            stmt = stmt.order_by(desc(ApprovalTemplate.version)).limit(1)

                        result = await session.execute(stmt)
                        template = result.scalar_one_or_none()

                        if not template:
                            raise HTTPException(404, "Template not found")

                        return self._serialize_template(template)

    def _serialize_template(self, template: ApprovalTemplate):
        return {
            "id": str(template.id),
            "template_name": template.template_name,
            "scope": template.scope,
            "tenant_id": str(template.tenant_id) if template.tenant_id else None,
            "version": template.version,
            "is_active": template.is_active,
            "default_sla_minutes": template.default_sla_minutes,
            "created_at": template.created_at,
            "updated_at": template.updated_at,
            "levels": [
                {
                    "id": str(level.id),
                    "level_order": level.level_order,
                    "approval_mode": level.approval_mode,
                    "approval_strategy": level.approval_strategy,
                    "required_approvals": level.required_approvals,
                    "sla_minutes": level.sla_minutes,
                    "approvers": [
                        {
                            "id": str(ap.id),
                            "approver_type": ap.approver_type,
                            "approver_value": ap.approver_value,
                            "is_mandatory": ap.is_mandatory,
                        }
                        for ap in level.approvers
                    ],
                }
                for level in sorted(template.levels, key=lambda x: x.level_order)
            ],
        }
