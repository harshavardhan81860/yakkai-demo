from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.ci_pipeline_execution import CIPipelineExecution
from typing import Optional, List


class CIPipelineExecutionRepository:

    async def create(
        self,
        session: AsyncSession,
        execution: CIPipelineExecution
    ) -> CIPipelineExecution:
        session.add(execution)
        return execution

    async def update(
        self,
        session: AsyncSession,
        execution: CIPipelineExecution
    ) -> CIPipelineExecution:
        session.add(execution)
        return execution

    async def get_by_id(
        self,
        session: AsyncSession,
        record_id: str
    ) -> Optional[CIPipelineExecution]:
        stmt = select(CIPipelineExecution).where(
            CIPipelineExecution.id == record_id
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_cloud_account(
        self,
        session: AsyncSession,
        cloud_account_id: str
    ) -> List[CIPipelineExecution]:
        stmt = select(CIPipelineExecution).where(
            CIPipelineExecution.cloud_account_id == cloud_account_id
        ).order_by(CIPipelineExecution.created_at.desc())

        result = await session.execute(stmt)
        return result.scalars().all()
