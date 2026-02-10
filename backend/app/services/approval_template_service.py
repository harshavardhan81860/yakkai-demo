from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.approval_template_repository import ApprovalTemplateRepository
from schemas.approval_template_schema import CreateApprovalTemplateRequest
from uuid import UUID



class ApprovalTemplateService:

    def __init__(self):
        self.repo = ApprovalTemplateRepository()

    async def list_templates(self, session, template_name, is_active):
        return await self.repo.list_templates(session, template_name, is_active)

    async def create_template(self, session, req: CreateApprovalTemplateRequest):
        active = await self.repo.get_active_template(session, req.template_name)
        if active:
            raise HTTPException(
                status_code=400,
                detail="Active template already exists for this template_name"
            )
        return await self.repo.create_template(session, req)

    async def activate_template(self, session, template_id: str):
        return await self.repo.set_active(session, template_id, True)

    async def deactivate_template(self, session, template_id: str):
        return await self.repo.set_active(session, template_id, False)

    async def update_template(
        self,
        session: AsyncSession,
        template_id: str,
        req
    ):
        old_template = await self.repo.get_template_by_id(
            session,
            template_id
        )

        if not old_template.is_active:
            raise HTTPException(
                status_code=400,
                detail="Only active templates can be updated"
            )

        return await self.repo.create_new_version(
            session,
            old_template,
            req
        )


    async def get_template_details(
            self,
            session: AsyncSession,
            template_id: UUID | None,
            template_name: str | None,
            version: int | None
        ):
            if template_id:
                return await self.repo.get_template_details_by_id(
                    session, template_id
                )

            return await self.repo.get_template_details_by_name(
                session, template_name, version
            )

