from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from services.cloud_services import aws as aws_service
from core.response import ApiResponse
from db.engine import get_session
from services.cloud_discovery_service import discovery_service


from core.enums.registry_enum import RESOURCE, ACTION
from services.registry_validation_service import registry

router = APIRouter(prefix="/aws", tags=["AWS"])
resource = RESOURCE.CLOUD_ACCOUNT


@router.get("/test_connection/{cloud_account_id}")
@registry(resource=resource, action=ACTION.READ)
async def test_aws_connection(
    cloud_account_id: str,
    test_type: str = "read",  # "read" or "write"
    test_mode: bool = False,
    db: AsyncSession = Depends(get_session),
):
    """Refactored to use unified discovery service logic."""
    result = await discovery_service.test_connection(
        account_id=cloud_account_id,
        db=db,
        test_mode=test_mode,
        test_type=test_type
    )
    if result["status"] == "success":
        return ApiResponse.success(message=result["message"])
    return ApiResponse.error(message=result["message"])
# --------------------------------------------------
# Regions
# --------------------------------------------------

@router.get("/regions")
@registry(resource=resource, action=ACTION.READ)
async def list_regions(
    cloud_account_id: str = Query(..., description="Cloud account ID"),
    refresh: bool = Query(False, description="Force refresh region cache"),
):
    try:
        regions = await aws_service.get_regions(
            account_id=cloud_account_id,
            refresh=refresh
        )

        return ApiResponse.success(
            message="AWS regions fetched successfully",
            data={"regions": regions}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            message=f"Failed to fetch AWS regions: {str(e)}",
            status_code=500
        )


# --------------------------------------------------
# Instances
# --------------------------------------------------

@router.get("/instances")
@registry(resource=resource, action=ACTION.READ)
async def list_instances(
    cloud_account_id: str = Query(...),
    region: str = Query(...),
):
    try:
        instances = await aws_service.get_instances(
            account_id=cloud_account_id,
            region=region
        )

        return ApiResponse.success(
            message="AWS instances fetched successfully",
            data={"instances": instances}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            message=f"Failed to fetch AWS instances: {str(e)}",
            status_code=500
        )


# --------------------------------------------------
# Images
# --------------------------------------------------

@router.get("/images")
@registry(resource=resource, action=ACTION.READ)
async def list_images(
    cloud_account_id: str = Query(...),
    region: str = Query(...),
):
    try:
        images = await aws_service.get_images(
            account_id=cloud_account_id,
            region=region
        )

        return ApiResponse.success(
            message="AWS images fetched successfully",
            data={"images": images}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            message=f"Failed to fetch AWS images: {str(e)}",
            status_code=500
        )


# --------------------------------------------------
# EKS Clusters
# --------------------------------------------------

@router.get("/clusters")
@registry(resource=resource, action=ACTION.READ)
async def list_clusters(
    cloud_account_id: str = Query(...),
    region: str = Query(...),
):
    try:
        clusters = await aws_service.get_clusters(
            account_id=cloud_account_id,
            region=region
        )

        return ApiResponse.success(
            message="AWS clusters fetched successfully",
            data={"clusters": clusters}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            message=f"Failed to fetch AWS clusters: {str(e)}",
            status_code=500
        )
