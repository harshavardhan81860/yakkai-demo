from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from db.engine import get_session
from services.approval_template_service import ApprovalTemplateService
from schemas.approval_template_schema import CreateApprovalTemplateRequest,CloneApprovalTemplateRequest
from core.response import ApiResponse
from utils.serializer import orm_to_dict
from uuid import UUID

router = APIRouter(
    prefix="/approval/templates",
    tags=["Approval Templates"]
)

service = ApprovalTemplateService()


@router.get("/")
async def list_templates(
    template_name: str | None = None,
    is_active: bool | None = None,
    session: AsyncSession = Depends(get_session)
):
    templates = await service.list_templates(session, template_name, is_active)
    return ApiResponse.success(
        message="Templates fetched",
        data={"templates": [orm_to_dict(t) for t in templates]}
    )


@router.get("/details")
async def get_template_details(
    template_id: UUID | None = None,
    template_name: str | None = None,
    version: int | None = None,
    session: AsyncSession = Depends(get_session)
):
    if not template_id and not template_name:
        return ApiResponse.error(
            message="Either template_id or template_name must be provided",
            status_code=400
        )

    if template_id and template_name:
        return ApiResponse.error(
            message="Provide only one of template_id or template_name",
            status_code=400
        )

    template = await service.get_template_details(
        session=session,
        template_id=template_id,
        template_name=template_name,
        version=version
    )

    return ApiResponse.success(
        message="Approval template fetched successfully",
        data={"template": template}
    )


@router.post("/")
async def create_template(
    req: CreateApprovalTemplateRequest,
    session: AsyncSession = Depends(get_session)
):
    template = await service.create_template(session, req)
    return ApiResponse.success(
        message="Template created",
        status_code=201,
        data={"template": orm_to_dict(template)}
    )


@router.patch("/{template_id}/activate")
async def activate_template(
    template_id: str,
    session: AsyncSession = Depends(get_session)
):
    template = await service.activate_template(session, template_id)
    return ApiResponse.success(
        message="Template activated",
        data={"template": orm_to_dict(template)}
    )


@router.patch("/{template_id}/deactivate")
async def deactivate_template(
    template_id: str,
    session: AsyncSession = Depends(get_session)
):
    template = await service.deactivate_template(session, template_id)
    return ApiResponse.success(
        message="Template deactivated",
        data={"template": orm_to_dict(template)}
    )


from schemas.approval_template_schema import UpdateApprovalTemplateRequest


@router.put("/{template_id}")
async def update_template(
    template_id: str,
    req: UpdateApprovalTemplateRequest,
    session: AsyncSession = Depends(get_session)
):
    template = await service.update_template(
        session,
        template_id,
        req
    )

    return ApiResponse.success(
        message="Template updated (new version created)",
        data={"template": orm_to_dict(template)}
    )

