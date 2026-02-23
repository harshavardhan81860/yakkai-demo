from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.ci_pipeline_service import CIPipelineService
from schemas.ci_pipeline_schema import CIPipelineTrigger
from core.response import ApiResponse

from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/ci/pipelines", tags=["CI Pipelines"])
service = CIPipelineService()
resource = RESOURCE.CI_PIPELINE


@router.post("/trigger")
@registry(resource=resource, action=ACTION.SUBMIT)
async def trigger_pipeline(
    req: CIPipelineTrigger,
    session: AsyncSession = Depends(get_session)
):
    result = await service.trigger_pipeline(session, req)
    return ApiResponse.success(
        message="Pipeline triggered successfully",
        data=result
    )
