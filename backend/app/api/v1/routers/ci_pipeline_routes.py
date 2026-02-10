from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from db.engine import get_session
from services.ci_pipeline_service import CIPipelineService
from schemas.ci_pipeline_schema import CIPipelineTrigger
from core.response import ApiResponse

router = APIRouter(prefix="/ci/pipelines", tags=["CI Pipelines"])
service = CIPipelineService()


@router.post("/trigger")
async def trigger_pipeline(
    req: CIPipelineTrigger,
    session: AsyncSession = Depends(get_session)
):
    try:
        result = await service.trigger_pipeline(session, req)
        return ApiResponse.success(
            message="Pipeline triggered successfully",
            data=result
        )
    except Exception as e:
        return ApiResponse.error(
            message=str(e),
            status_code=400
        )
