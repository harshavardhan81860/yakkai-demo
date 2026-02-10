from fastapi import APIRouter, Query

from services.cloud_services import azure as azure_service
from core.response import ApiResponse
from services.cloud_services.azure import list_subscriptions_for_account

router = APIRouter(prefix="/azure", tags=["Azure"])


@router.get("/test_connection/{cloud_account_id}")
async def test_azure_connection(cloud_account_id: str):
    return await azure_service.test_connection(cloud_account_id)

# --------------------------------------------------
# Regions
# --------------------------------------------------

@router.get("/regions")
async def list_regions(
    cloud_account_id: str = Query(...),
    refresh: bool = Query(False),
):
    try:
        regions = await azure_service.get_regions(
            account_id=cloud_account_id,
            refresh=refresh
        )

        return ApiResponse.success(
            message="Azure regions fetched successfully",
            data={"regions": regions}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            f"Failed to fetch Azure regions: {str(e)}",
            status_code=500
        )

@router.get("/subscriptions")
async def get_subscriptions(cloud_account_id: str = Query(...)):
    """
    List all subscriptions for a given cloud account
    """
    try:
        subs = await list_subscriptions_for_account(cloud_account_id)
        return ApiResponse.success(
            message=f"{len(subs)} subscriptions fetched",
            data={"subscriptions": subs}
        )
    except Exception as e:
        return ApiResponse.error(
            message=f"Failed to fetch subscriptions: {str(e)}",
            status_code=500
        )

# --------------------------------------------------
# Instances (VMs)
# --------------------------------------------------

@router.get("/instances")
async def list_instances(
    cloud_account_id: str = Query(...),
    region: str = Query(...),
):
    try:
        vms = await azure_service.get_instances(
            account_id=cloud_account_id,
            region=region
        )

        return ApiResponse.success(
            message="Azure instances fetched successfully",
            data={"instances": vms}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            f"Failed to fetch Azure instances: {str(e)}",
            status_code=500
        )


# --------------------------------------------------
# Images
# --------------------------------------------------

@router.get("/images")
async def list_images(
    cloud_account_id: str = Query(...),
    region: str = Query(...),
):
    try:
        images = await azure_service.get_images(
            account_id=cloud_account_id,
            region=region
        )

        return ApiResponse.success(
            message="Azure images fetched successfully",
            data={"images": images}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            f"Failed to fetch Azure images: {str(e)}",
            status_code=500
        )


# --------------------------------------------------
# AKS Clusters
# --------------------------------------------------

@router.get("/clusters")
async def list_clusters(
    cloud_account_id: str = Query(...),
    region: str = Query(...),
):
    try:
        clusters = await azure_service.get_clusters(
            account_id=cloud_account_id,
            region=region
        )

        return ApiResponse.success(
            message="Azure clusters fetched successfully",
            data={"clusters": clusters}
        )

    except ValueError as e:
        return ApiResponse.error(str(e), status_code=404)

    except Exception as e:
        return ApiResponse.error(
            f"Failed to fetch Azure clusters: {str(e)}",
            status_code=500
        )
