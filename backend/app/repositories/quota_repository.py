from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.quota import QuotaLimit, QuotaUsage, QuotaOverrideRequest, QuotaReservation
from typing import List, Optional
import uuid


class QuotaRepository:
    async def list_limits(self, session: AsyncSession, scope_type: Optional[str] = None) -> List[QuotaLimit]:
        stmt = select(QuotaLimit)
        if scope_type:
            stmt = stmt.where(QuotaLimit.scope_type == scope_type)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_limit_by_id(self, session: AsyncSession, limit_id: uuid.UUID) -> Optional[QuotaLimit]:
        stmt = select(QuotaLimit).where(QuotaLimit.id == limit_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_limit(self, session: AsyncSession, limit: QuotaLimit) -> QuotaLimit:
        session.add(limit)
        return limit

    async def update_limit(self, session: AsyncSession, limit: QuotaLimit) -> QuotaLimit:
        session.add(limit)
        return limit
    
    async def get_for_update(
        self,
        session: AsyncSession,
        quota_id: uuid.UUID
    ) -> QuotaUsage:
        stmt = (
            select(QuotaUsage)
            .where(QuotaUsage.quota_id == quota_id)
            .with_for_update()
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()



class QuotaUsageRepository:
    async def get_by_quota(self, session: AsyncSession, quota_id: uuid.UUID) -> Optional[QuotaUsage]:
        stmt = select(QuotaUsage).where(QuotaUsage.quota_id == quota_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_usage(self, session: AsyncSession, usage: QuotaUsage) -> QuotaUsage:
        session.add(usage)
        return usage

    async def update_usage(self, session: AsyncSession, usage: QuotaUsage) -> QuotaUsage:
        session.add(usage)
        return usage


class QuotaReservationRepository:
    async def create_reservation(self, session: AsyncSession, reservation: QuotaReservation) -> QuotaReservation:
        session.add(reservation)
        return reservation

    async def list_reservations(self, session: AsyncSession, quota_id: Optional[uuid.UUID] = None) -> List[QuotaReservation]:
        stmt = select(QuotaReservation)
        if quota_id:
            stmt = stmt.where(QuotaReservation.quota_id == quota_id)
        result = await session.execute(stmt)
        return result.scalars().all()


class QuotaOverrideRepository:
    async def create_override(self, session: AsyncSession, override: QuotaOverrideRequest) -> QuotaOverrideRequest:
        session.add(override)
        return override

    async def list_overrides(self, session: AsyncSession, quota_id: Optional[uuid.UUID] = None) -> List[QuotaOverrideRequest]:
        stmt = select(QuotaOverrideRequest)
        if quota_id:
            stmt = stmt.where(QuotaOverrideRequest.quota_id == quota_id)
        result = await session.execute(stmt)
        return result.scalars().all()


