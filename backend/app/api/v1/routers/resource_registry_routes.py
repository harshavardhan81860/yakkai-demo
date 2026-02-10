from fastapi import APIRouter, Depends,Query
from sqlalchemy.ext.asyncio import AsyncSession
from services.registry_service import RegistryService
from schemas.registry_schema import (
    ResourceCreateRequest,
    ResourceUpdateRequest,
    ActionCreateRequest,
    ActionUpdateRequest,
)
from services.registry_validation_service import (
    get_runtime_registry_catalog,
)
from db.engine import get_session
from core.response import ApiResponse
from utils.serializer import orm_to_dict
import uuid



router = APIRouter(prefix="/registry", tags=["Registry"])
service = RegistryService()

# -------- Resources --------
@router.get("/resources")
async def list_resources(session: AsyncSession = Depends(get_session)):
    resources = await service.list_resources(session)
    return ApiResponse.success(
        message="Resources fetched",
        data={"resources": [orm_to_dict(r) for r in resources]},
    )

@router.post("/resources")
async def create_resource(
    req: ResourceCreateRequest, session: AsyncSession = Depends(get_session)
):
    resource = await service.create_resource(session, req)
    return ApiResponse.success(
        message="Resource created",
        status_code=201,
        data={"resource": orm_to_dict(resource)},
    )

@router.put("/resources/{resource_id}")
async def update_resource(
    resource_id: uuid.UUID,
    req: ResourceUpdateRequest,
    session: AsyncSession = Depends(get_session),
):
    resource = await service.update_resource(session, resource_id, req)
    return ApiResponse.success(
        message="Resource updated",
        data={"resource": orm_to_dict(resource)},
    )

# -------- Actions --------
@router.get("/actions")
async def list_actions(session: AsyncSession = Depends(get_session)):
    actions = await service.list_actions(session)
    return ApiResponse.success(
        message="Actions fetched",
        data={"actions": [orm_to_dict(a) for a in actions]},
    )

@router.post("/actions")
async def create_action(
    req: ActionCreateRequest, session: AsyncSession = Depends(get_session)
):
    action = await service.create_action(session, req)
    return ApiResponse.success(
        message="Action created",
        status_code=201,
        data={"action": orm_to_dict(action)},
    )

@router.put("/actions/{action_id}")
async def update_action(
    action_id: uuid.UUID,
    req: ActionUpdateRequest,
    session: AsyncSession = Depends(get_session),
):
    action = await service.update_action(session, action_id, req)
    return ApiResponse.success(
        message="Action updated",
        data={"action": orm_to_dict(action)},
    )



@router.get("/catalog")
async def get_registry_catalog():
    catalog = get_runtime_registry_catalog()

    return ApiResponse.success(
        message="Runtime registry catalog",
        data={"catalog": catalog},
    )
