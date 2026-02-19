from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.cloud_account import CloudAccount
from typing import Optional, List
from uuid import UUID


class CloudAccountRepository:

    async def get_account_by_id(
    self,
    session: AsyncSession,
    account_id: str
    ) -> List[CloudAccount]:
        stmt = select(CloudAccount).where(CloudAccount.id == account_id)
        result = await session.execute(stmt)
        return result.scalars().all()  # returns a list with single account


    async def list_accounts(
        self,
        session: AsyncSession,
        tenant_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[CloudAccount]:

        stmt = select(CloudAccount)

        if tenant_id is not None:
            stmt = stmt.where(CloudAccount.tenant_id == tenant_id)

        if is_active is not None:
            stmt = stmt.where(CloudAccount.is_active == is_active)

        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_id(
        self,
        session: AsyncSession,
        record_id: str
    ) -> Optional[CloudAccount]:

        stmt = select(CloudAccount).where(CloudAccount.id == record_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
    

    async def get_by_name(
        self,
        session: AsyncSession,
        tenant_id: str,
        name: str
    ) -> Optional[CloudAccount]:
        """
        Used to enforce unique cloud account name per tenant
        """
        stmt = select(CloudAccount).where(
            CloudAccount.tenant_id == tenant_id,
            CloudAccount.name == name
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        session: AsyncSession,
        account: CloudAccount
    ) -> CloudAccount:
        session.add(account)
        return account

    async def update(
        self,
        session: AsyncSession,
        account: CloudAccount
    ) -> CloudAccount:
        session.add(account)
        return account

    # ─────────────── Discovery helpers ───────────────

    async def get_by_cloud_identifier(
        self,
        session: AsyncSession,
        tenant_id: str,
        cloud_provider: str,
        identifier: str,
    ) -> Optional[CloudAccount]:
        """
        Find account by cloud-side identifier within a tenant.
        AWS  → cred_metadata->>'account_id'
        Azure → cred_metadata->>'subscription_id' OR cred_metadata->>'tenant_id'
        """
        provider = cloud_provider.lower()
        if provider == "aws":
            json_key = "account_id"
        elif provider == "azure":
            # Try subscription_id first, fall back to tenant_id
            stmt = (
                select(CloudAccount)
                .where(
                    CloudAccount.tenant_id == tenant_id,
                    CloudAccount.cloud_provider == cloud_provider,
                    CloudAccount.cred_metadata["subscription_id"].astext == identifier,
                )
            )
            result = await session.execute(stmt)
            found = result.scalar_one_or_none()
            if found:
                return found
            json_key = "tenant_id"
        else:
            return None

        stmt = (
            select(CloudAccount)
            .where(
                CloudAccount.tenant_id == tenant_id,
                CloudAccount.cloud_provider == cloud_provider,
                CloudAccount.cred_metadata[json_key].astext == identifier,
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_children(
        self,
        session: AsyncSession,
        parent_id: str,
    ) -> List[CloudAccount]:
        """Get all accounts whose parent_id matches."""
        stmt = select(CloudAccount).where(CloudAccount.parent_id == parent_id)
        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_org_id(
        self,
        session: AsyncSession,
        tenant_id: str,
        organization_id: str,
    ) -> Optional[CloudAccount]:
        """
        Find the parent org/tenant record by organization_id inside
        cred_metadata->'organization_context'->>'organization_id'.
        """
        stmt = (
            select(CloudAccount)
            .where(
                CloudAccount.tenant_id == tenant_id,
                CloudAccount.cred_metadata["organization_context"]["organization_id"].astext
                == organization_id,
                CloudAccount.parent_id.is_(None),
            )
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_root_accounts_by_provider(
        self,
        session: AsyncSession,
        tenant_id: str,
        cloud_provider: str,
    ) -> List[CloudAccount]:
        """Get all root-level (no parent) accounts for a provider in a tenant."""
        stmt = (
            select(CloudAccount)
            .where(
                CloudAccount.tenant_id == tenant_id,
                CloudAccount.cloud_provider == cloud_provider,
                CloudAccount.parent_id.is_(None),
            )
        )
        result = await session.execute(stmt)
        return result.scalars().all()
