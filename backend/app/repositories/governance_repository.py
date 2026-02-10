from sqlalchemy import select, tuple_
from sqlalchemy.ext.asyncio import AsyncSession
from models.governance import (
    GovernancePolicy,
    GovernancePolicySubject,
    GovernanceResourceAccess
)


class GovernanceRepository:

    # ---------- POLICY ----------
    async def create_policy(
        self, session: AsyncSession, policy: GovernancePolicy
    ) -> GovernancePolicy:
        session.add(policy)
        return policy

    async def update_policy(
        self, session: AsyncSession, policy: GovernancePolicy
    ) -> GovernancePolicy:
        session.add(policy)
        return policy

    async def get_policies(self, session: AsyncSession, **filters):
        stmt = select(GovernancePolicy)
        for k, v in filters.items():
            if v is not None:
                stmt = stmt.where(getattr(GovernancePolicy, k) == v)

        res = await session.execute(stmt)
        return res.scalars().all()

    async def get_policy_by_id(
        self, session: AsyncSession, policy_id: str
    ):
        stmt = select(GovernancePolicy).where(GovernancePolicy.id == policy_id)
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def find_existing_policy(
        self,
        session: AsyncSession,
        resource_type: str,
        action_name: str,
        scope_type: str,
        scope_id: str | None,
    ):
        stmt = select(GovernancePolicy).where(
            GovernancePolicy.resource_type == resource_type,
            GovernancePolicy.action_name == action_name,
            GovernancePolicy.scope_type == scope_type,
        )

        if scope_type != "SYSTEM":
            stmt = stmt.where(GovernancePolicy.scope_id == scope_id)

        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    # ---------- SUBJECT ----------
    async def add_subject(
        self, session: AsyncSession, subject: GovernancePolicySubject
    ):
        session.add(subject)
        return subject

    async def find_existing_subject(
        self,
        session: AsyncSession,
        policy_id: str,
        subject_type: str,
        subject_id: str,
    ):
        stmt = select(GovernancePolicySubject).where(
            GovernancePolicySubject.policy_id == policy_id,
            GovernancePolicySubject.subject_type == subject_type,
            GovernancePolicySubject.subject_id == subject_id,
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    async def fetch_subjects(
        self, session: AsyncSession, policy_ids: list[str]
    ):
        stmt = select(GovernancePolicySubject).where(
            GovernancePolicySubject.policy_id.in_(policy_ids)
        )
        res = await session.execute(stmt)
        return res.scalars().all()

    # ---------- SUBJECT LIST (FILTERED) ----------
    async def fetch_subjects_filtered(
        self,
        session: AsyncSession,
        policy_id: str | None = None,
        subject_type: str | None = None,
        subject_id: str | None = None,
        is_active: bool | None = None,
    ):
        stmt = select(GovernancePolicySubject)

        if policy_id is not None:
            stmt = stmt.where(GovernancePolicySubject.policy_id == policy_id)

        if subject_type is not None:
            stmt = stmt.where(GovernancePolicySubject.subject_type == subject_type)

        if subject_id is not None:
            stmt = stmt.where(GovernancePolicySubject.subject_id == subject_id)

        if is_active is not None:
            stmt = stmt.where(GovernancePolicySubject.is_active == is_active)

        res = await session.execute(stmt)
        return res.scalars().all()


    # ---------- RESOURCE ACCESS ----------
    async def create_resource_access(
        self, session: AsyncSession, access: GovernanceResourceAccess
    ):
        session.add(access)
        return access

    async def find_existing_resource_access(
        self,
        session: AsyncSession,
        resource_type: str,
        resource_id: str,
        action_name: str,
        subject_type: str,
        subject_id: str,
    ):
        stmt = select(GovernanceResourceAccess).where(
            GovernanceResourceAccess.resource_type == resource_type,
            GovernanceResourceAccess.resource_id == resource_id,
            GovernanceResourceAccess.action_name == action_name,
            GovernanceResourceAccess.subject_type == subject_type,
            GovernanceResourceAccess.subject_id == subject_id,
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()

    # ---------- SUBJECT ----------
    async def get_subject_by_id(self, session: AsyncSession, subject_id: str):
        stmt = select(GovernancePolicySubject).where(
            GovernancePolicySubject.id == subject_id
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


    # ---------- RESOURCE ACCESS ----------
    async def get_resource_access_by_id(self, session: AsyncSession, access_id: str):
        stmt = select(GovernanceResourceAccess).where(
            GovernanceResourceAccess.id == access_id
        )
        res = await session.execute(stmt)
        return res.scalar_one_or_none()


    # repositories/governance_repository.py

    async def fetch_eval_policies(
        self,
        session,
        resource_type: str,
        action_name: str,
        scope_type: str,
        scope_id,
        subjects: list[tuple[str, str]]
    ):
        stmt = select(GovernancePolicy).join(
            GovernancePolicySubject,
            GovernancePolicy.id == GovernancePolicySubject.policy_id
        ).where(
            GovernancePolicy.resource_type == resource_type,
            GovernancePolicy.action_name == action_name,
            GovernancePolicy.scope_type == scope_type,
            GovernancePolicy.is_active == True,
            tuple_(
                GovernancePolicySubject.subject_type,
                GovernancePolicySubject.subject_id
            ).in_(subjects)
        )

        if scope_type != "SYSTEM":
            stmt = stmt.where(GovernancePolicy.scope_id == scope_id)

        res = await session.execute(stmt)
        return res.scalars().all()
