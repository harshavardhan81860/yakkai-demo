import datetime as dt
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy import select, func, outerjoin, cast, String, case
from sqlalchemy.ext.asyncio import AsyncSession

from models.cloud_resource import CloudResource, CloudResourcePayload
from engines.finops_job.db_models import DailyCost

class CloudResourceRepository:

    async def list_inventory(
        self,
        session: AsyncSession,
        tenant_id: str,
        cloud_account_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves CloudResources and LEFT JOINs on FinOps DailyCost 
        to aggregate the MTD cost and LAST MONTH cost perfectly by `provider_resource_id`.
        """
        now = datetime.utcnow()
        month_start = now.replace(day=1).date()
        last_month_end = month_start - dt.timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)

        # 1. Subquery to aggregate MTD cost and LAST MONTH cost per resource
        cost_subq = (
            select(
                DailyCost.resource_id.label("cost_resource_id"),
                func.sum(
                    case(
                        (DailyCost.date >= month_start, DailyCost.amortized_cost),
                        else_=0
                    )
                ).label("mtd_cost"),
                func.sum(
                    case(
                        ((DailyCost.date >= last_month_start) & (DailyCost.date <= last_month_end), DailyCost.amortized_cost),
                        else_=0
                    )
                ).label("last_month_cost")
            )
            .where(DailyCost.tenant_id == tenant_id)
            .where(DailyCost.resource_id.isnot(None))
            .where(DailyCost.date >= last_month_start)
            .group_by(DailyCost.resource_id)
            .subquery()
        )

        # 2. Main query: match resource ID to cost resource ID
        stmt = (
            select(
                CloudResource, 
                cost_subq.c.mtd_cost,
                cost_subq.c.last_month_cost
            )
            .outerjoin(
                cost_subq, 
                CloudResource.provider_resource_id == cost_subq.c.cost_resource_id
            )
            .where(CloudResource.tenant_id == tenant_id)
        )
        
        if cloud_account_id:
            stmt = stmt.where(cast(CloudResource.cloud_account_id, String) == cloud_account_id)
            
        result = await session.execute(stmt)
        
        # Format the result
        inventory = []
        for resource, mtd_cost, last_month_cost in result:
            resource_dict = {
                "id": str(resource.id),
                "tenant_id": str(resource.tenant_id),
                "cloud_account_id": str(resource.cloud_account_id),
                "provider": resource.provider,
                "resource_type": resource.resource_type,
                "provider_resource_id": resource.provider_resource_id,
                "name": resource.name,
                "region": resource.region,
                "resource_group": resource.resource_group,
                "status": resource.status,
                "tags": resource.tags,
                "creation_request_id": str(resource.creation_request_id) if resource.creation_request_id else None,
                "last_synced_at": resource.last_synced_at,
                "created_at": resource.created_at,
                "updated_at": resource.updated_at,
            }
            
            resource_dict["mtd_cost"] = float(mtd_cost) if mtd_cost is not None else 0.0
            resource_dict["last_month_cost"] = float(last_month_cost) if last_month_cost is not None else 0.0
            
            # Fallback logic for AWS Service-Level aggregates (mocking missing direct mappings)
            if resource.provider.lower() == 'aws' and resource_dict["mtd_cost"] == 0.0 and resource_dict["last_month_cost"] == 0.0:
                resource_dict["is_cost_aggregate"] = True
            else:
                resource_dict["is_cost_aggregate"] = False
                
            inventory.append(resource_dict)
            
        return inventory

    async def get_raw_payload(
        self,
        session: AsyncSession,
        resource_id: str
    ) -> Optional[Dict[str, Any]]:
        from models.cloud_resource import CloudResourcePayload
        import uuid
        stmt = select(CloudResourcePayload).where(CloudResourcePayload.resource_id == uuid.UUID(resource_id))
        result = await session.execute(stmt)
        payload_record = result.scalars().first()
        if payload_record:
            return payload_record.raw_payload
        return None
