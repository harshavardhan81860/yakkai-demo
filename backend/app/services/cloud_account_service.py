from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from repositories.cloud_account_repository import CloudAccountRepository
from models.cloud_account import CloudAccount
from typing import Optional, Dict, Any


class CloudAccountService:

    def __init__(self):
        self.repo = CloudAccountRepository()

    # ---------- LIST ----------
    
    async def get_account_by_id(self, session: AsyncSession, account_id: str):
     return await self.repo.get_account_by_id(session, account_id)

    async def list_accounts(
        self,
        session: AsyncSession,
        tenant_id: Optional[str] = None,
        is_active: Optional[bool] = None
    ):
        return await self.repo.list_accounts(session, tenant_id, is_active)


    # ---------- CREATE ----------

    async def create_account(
        self,
        session: AsyncSession,
        tenant_id: str,
        parent_id: Optional[str],
        name: str,
        cloud_provider: str,
        cred_metadata: Dict[str, Any],
        ci_credentials_id: Optional[str]
    ):
        # normalize name (avoid trailing spaces & duplicates)
        normalized_name = name.strip()

        if not normalized_name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")

        # enforce unique name per tenant
        existing = await self.repo.get_by_name(
            session,
            tenant_id=tenant_id,
            name=normalized_name
        )
        if existing:
            raise HTTPException(status_code=400, detail="Cloud account name already exists")

        # validate provider-specific metadata
        self._validate_cred_metadata(cloud_provider, cred_metadata)

        account = CloudAccount(
            tenant_id=tenant_id,
            parent_id=parent_id,
            name=normalized_name,
            cloud_provider=cloud_provider,
            cred_metadata=cred_metadata,
            ci_credentials_id=ci_credentials_id,
            is_active=True
        )

        try:
            await self.repo.create(session, account)
            await session.commit()
            await session.refresh(account)
            return account

        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    # ---------- ACTIVATE / DEACTIVATE ----------

    async def activate_account(self, session: AsyncSession, record_id: str):
        account = await self.repo.get_by_id(session, record_id)
        if not account:
            raise HTTPException(status_code=404, detail="Cloud account not found")

        if account.is_active:
            raise HTTPException(status_code=400, detail="Cloud account is already active")

        account.is_active = True

        try:
            await session.commit()
            await session.refresh(account)
            return account
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def deactivate_account(self, session: AsyncSession, record_id: str):
        account = await self.repo.get_by_id(session, record_id)
        if not account:
            raise HTTPException(status_code=404, detail="Cloud account not found")

        if not account.is_active:
            raise HTTPException(status_code=400, detail="Cloud account is already inactive")

        account.is_active = False

        try:
            await session.commit()
            await session.refresh(account)
            return account
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    # ---------- METADATA VALIDATION ----------

    def _validate_cred_metadata(self, cloud_provider: str, metadata: Dict[str, Any]):
        if not isinstance(metadata, dict):
            raise HTTPException(status_code=400, detail="cred_metadata must be a JSON object")

        provider = cloud_provider.lower()

        # ── Discovery-enriched metadata ──
        # If account_type is present, this is from the discovery flow.
        # Org-level containers and inherited-cred accounts have relaxed validation.
        account_type = metadata.get("account_type")
        credential_source = metadata.get("credential_source")

        if account_type:
            # Org-level containers (management, tenant, management_group)
            # don't need the same credential fields as leaf accounts.
            org_types = {"management", "tenant", "management_group", "organizational_unit"}
            if account_type in org_types:
                return  # validated by the discovery/import flow

            # Accounts inheriting credentials from parent don't need own creds
            if credential_source == "inherited":
                return

        # ── Legacy / simple format validation ──
        # ── Legacy / simple format validation ──
        # We need to check for presence in EITHER the old flat structure OR the new nested structure.
        
        def has_val(key: str, nested_path: list) -> bool:
            # Check flat
            if metadata.get(key): return True
            # Check nested
            val = metadata
            for step in nested_path:
                if isinstance(val, dict):
                    val = val.get(step)
                else:
                    return False
            return bool(val)

        missing = []

        if provider == "aws":
            if not has_val("account_id", ["identity", "cloud_id"]): missing.append("account_id")
            if not has_val("role_name", ["auth", "role_name"]): missing.append("role_name")

        elif provider == "azure":
            if account_type == "subscription":
                 if not has_val("subscription_id", ["identity", "cloud_id"]): missing.append("subscription_id")
            else:
                 if not has_val("tenant_id", ["auth", "tenant_id"]): missing.append("tenant_id")
                 if not has_val("client_id", ["auth", "client_id"]): missing.append("client_id")
                 # Subscription ID is optional for tenant root, but if provided, check logic is handled by frontend/discovery usually
                 # validation here focuses on connectivity basics.

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported cloud provider: {cloud_provider}"
            )

        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required fields within cred_metadata (checked legacy and nested paths): {', '.join(missing)}"
            )


    async def update_account(
        self,
        session: AsyncSession,
        record_id: str,
        name: Optional[str],
        cred_metadata: Optional[dict],
        ci_credentials_id: Optional[str],
    ):
        account = await self.repo.get_by_id(session, record_id)

        if not account:
            raise HTTPException(status_code=404, detail="Cloud account not found")

        # ✅ name uniqueness inside tenant
        if name and name != account.name:
            existing = await self.repo.get_by_name(
                session, account.tenant_id, name
            )
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail="Cloud account name already exists in this tenant"
                )
            account.name = name

        if cred_metadata is not None:
            account.cred_metadata = cred_metadata

        if ci_credentials_id is not None:
            account.ci_credentials_id = ci_credentials_id

        try:
            await self.repo.update(session, account)
            await session.commit()
            await session.refresh(account)
            return account

        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))
