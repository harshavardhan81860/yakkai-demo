from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from repositories.ci_credentials_repository import CICredentialsRepository
from models.ci_credentials import CICredentials
from typing import Optional


class CICredentialsService:

    def __init__(self):
        self.repo = CICredentialsRepository()

    async def list_credentials(
        self,
        session: AsyncSession,
        provider: Optional[str] = None,
        is_active: Optional[bool] = None
    ):
        return await self.repo.list_credentials(session, provider, is_active)

    async def create_credentials(
        self,
        session: AsyncSession,
        provider: str,
        base_url: str,
        project_id: str,
        token: str,
        is_active: bool = True
    ):
        cred = CICredentials(
            provider=provider,
            base_url=base_url,
            project_id=project_id,
            token=token,
            is_active=is_active
        )

        try:
            await self.repo.create(session, cred)
            await session.commit()
            await session.refresh(cred)
            return cred
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def update_credentials(
        self,
        session: AsyncSession,
        record_id: str,
        **kwargs
    ):
        cred = await self.repo.get_by_id(session, record_id)
        if not cred:
            raise HTTPException(status_code=404, detail="CI credentials not found")

        for key, value in kwargs.items():
            setattr(cred, key, value)

        try:
            await self.repo.update(session, cred)
            await session.commit()
            await session.refresh(cred)
            return cred
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))

    async def activate_credentials(self, session: AsyncSession, record_id: str):
        cred = await self.repo.get_by_id(session, record_id)
        if not cred:
            raise HTTPException(status_code=404, detail="CI credentials not found")

        if cred.is_active:
            raise HTTPException(status_code=400, detail="CI credentials already active")

        cred.is_active = True
        return await self._save(session, cred)

    async def deactivate_credentials(self, session: AsyncSession, record_id: str):
        cred = await self.repo.get_by_id(session, record_id)
        if not cred:
            raise HTTPException(status_code=404, detail="CI credentials not found")

        if not cred.is_active:
            raise HTTPException(status_code=400, detail="CI credentials already inactive")

        cred.is_active = False
        return await self._save(session, cred)

    async def _save(self, session: AsyncSession, cred: CICredentials):
        try:
            await self.repo.update(session, cred)
            await session.commit()
            await session.refresh(cred)
            return cred
        except Exception as exc:
            await session.rollback()
            raise HTTPException(status_code=400, detail=str(exc))
