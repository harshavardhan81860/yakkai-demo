from sqlalchemy.ext.asyncio import AsyncSession
from models.quota import QuotaLimit, QuotaUsage, QuotaOverrideRequest, QuotaReservation
from repositories.quota_repository import QuotaRepository, QuotaUsageRepository, QuotaOverrideRepository, QuotaReservationRepository
from schemas.quota_schema import QuotaLimitRequest, QuotaOverrideRequestCreate, QuotaEvaluationRequest,QuotaFinalizeRequest,QuotaReserveRequest
from fastapi import HTTPException
from datetime import datetime
import uuid


class QuotaService:
    def __init__(self):
        self.repo = QuotaRepository()
        self.usage_repo = QuotaUsageRepository()
        self.override_repo = QuotaOverrideRepository()
        self.reservation_repo = QuotaReservationRepository()
    # -----------------------------
    # Quota Limit Methods
    # -----------------------------
    async def list_limits(self, session: AsyncSession):
        return await self.repo.list_limits(session)

    async def create_limit(self, session: AsyncSession, req: QuotaLimitRequest) -> QuotaLimit:
        limit = QuotaLimit(
            scope_type=req.scope_type,
            scope_id=req.scope_id,
            resource_type=req.resource_type,
            limit_count=req.limit_count,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        await self.repo.create_limit(session, limit)
        await session.commit()
        await session.refresh(limit)
        return limit

    async def update_limit(self, session: AsyncSession, limit_id: uuid.UUID, req: QuotaLimitRequest):
        limit = await self.repo.get_limit_by_id(session, limit_id)
        if not limit:
            raise HTTPException(status_code=404, detail="Quota limit not found")
        limit.scope_type = req.scope_type
        limit.scope_id = req.scope_id
        limit.resource_type = req.resource_type
        limit.limit_count = req.limit_count
        limit.updated_at = datetime.utcnow()
        await self.repo.update_limit(session, limit)
        await session.commit()
        await session.refresh(limit)
        return limit

    # -----------------------------
    # Override Methods
    # -----------------------------
    async def create_override_request(self, session: AsyncSession, req: QuotaOverrideRequestCreate):
        override = QuotaOverrideRequest(
            quota_id=req.quota_id,
            requested_by=req.requested_by,
            requested_count=req.requested_count,
            is_emergency=req.is_emergency,
            reason=req.reason,
            status="PENDING",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        await self.override_repo.create_override(session, override)
        await session.commit()
        await session.refresh(override)
        return override

    # -----------------------------
    # Quota Evaluation
    # -----------------------------
    async def evaluate_quota(self, session: AsyncSession, req: QuotaEvaluationRequest):
        # fetch limit
        stmt = await self.repo.list_limits(session)
        limit = next((l for l in stmt if l.scope_type == req.scope_type and l.scope_id == req.scope_id and l.resource_type == req.resource_type), None)
        if not limit:
            return {"allowed": False, "reason": "No quota limit defined"}

        # fetch usage
        usage = await self.usage_repo.get_by_quota(session, limit.id)
        current = usage.current_count if usage else 0
        pending = usage.pending_count if usage else 0
        available = limit.limit_count - (current + pending)

        if req.requested_count > available:
            return {"allowed": False, "reason": "Quota exceeded, override required"}
        return {"allowed": True, "available_count": available}


    # -----------------------------
    # RESERVE (Pending)
    # -----------------------------
    async def reserve_quota(
        self,
        session: AsyncSession,
        req: QuotaReserveRequest
    ):
        usage = await self.usage_repo.get_for_update(session, req.quota_id)

        if not usage:
            usage = QuotaUsage(
                quota_id=req.quota_id,
                current_count=0,
                pending_count=0,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            await self.usage_repo.create_usage(session, usage)

        # fetch limit
        limit = await session.get(QuotaLimit, req.quota_id)
        if not limit:
            raise HTTPException(404, "Quota not found")

        available = limit.limit_count - (
            usage.current_count + usage.pending_count
        )

        if available < req.requested_count:
            raise HTTPException(
                status_code=403,
                detail="Quota exceeded during reservation"
            )

        usage.pending_count += req.requested_count
        usage.updated_at = datetime.utcnow()

        await session.commit()
        return {"reserved": True}

    # -----------------------------
    # FINALIZE (Approve / Reject)
    # -----------------------------
    async def finalize_quota(
        self,
        session: AsyncSession,
        req: QuotaFinalizeRequest
    ):
        usage = await self.usage_repo.get_for_update(session, req.quota_id)

        if not usage:
            raise HTTPException(404, "Quota usage not found")

        limit = await session.get(QuotaLimit, req.quota_id)
        if not limit:
            raise HTTPException(404, "Quota not found")

        # 🔐 RE-VALIDATION AFTER APPROVAL
        effective_available = limit.limit_count - usage.current_count

        if req.decision == "APPROVED":
            if effective_available < req.requested_count:
                raise HTTPException(
                    status_code=409,
                    detail="Quota changed after approval – blocking allocation"
                )

            usage.pending_count -= req.requested_count
            usage.current_count += req.requested_count

        elif req.decision == "REJECTED":
            usage.pending_count -= req.requested_count

        usage.updated_at = datetime.utcnow()
        await session.commit()

        return {"finalized": True, "decision": req.decision}
