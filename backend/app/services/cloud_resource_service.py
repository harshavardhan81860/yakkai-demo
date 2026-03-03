from sqlalchemy.ext.asyncio import AsyncSession
from repositories.cloud_resource_repository import CloudResourceRepository
from typing import Optional, List, Dict, Any
from fastapi import HTTPException

class CloudResourceService:
    def __init__(self):
        self.repo = CloudResourceRepository()

    async def get_inventory(
        self,
        session: AsyncSession,
        tenant_id: str,
        cloud_account_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves global cloud resources inventory with FinOps join.
        """
        if not tenant_id:
            raise HTTPException(status_code=400, detail="Tenant ID is required")

        return await self.repo.list_inventory(
            session=session,
            tenant_id=tenant_id,
            cloud_account_id=cloud_account_id
        )
