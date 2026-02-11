from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user import User
# from models.role import Role
# from models.user_role import UserRole
from typing import List, Optional, Union


class UserRepository:

    async def get_by_email(self, session: AsyncSession, email: str):
        stmt = select(User).where(User.email == email)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, session: AsyncSession, user_identifier: str):
        """
        Accept numeric db id or keycloak_id (uuid).
        """
        # Try numeric DB id
        stmt = select(User).where(
            (User.id == user_identifier) |
            (User.keycloak_id == user_identifier)
        )

        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_existing_usernames(self, session: AsyncSession) -> List[str]:
        stmt = select(User.username)
        result = await session.execute(stmt)
        return [row[0] for row in result.all()]

    async def create(self, session: AsyncSession, user: User):
        """
        Perform DB save but DO NOT swallow errors.
        Commit happens here only after Keycloak success.
        """
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    async def update(self, session: AsyncSession, user: User):
        """
        Generic update method for saving any user changes.
        """
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

    async def list_users(
        self,
        session: AsyncSession,
        email: Optional[str] = None,
        user_id: Optional[str] = None,
        user_name :Optional[str]=None,
        active: Optional[bool] = None
    ) -> List[User]:

        stmt = select(User)

        if email:
            stmt = stmt.where(User.email == email)

        if user_id:
            stmt = stmt.where(
                (User.id == user_id) |
                (User.keycloak_id == user_id)
            )

        
        if user_name:
            stmt = stmt.where(User.username == user_name)

        if active is not None:
            stmt = stmt.where(User.is_active == active)

        result = await session.execute(stmt)
        return result.scalars().all()

    async def get_by_username(self, session: AsyncSession, username: str) -> Optional[User]:
        """
        Get user by username.
        """
        stmt = select(User).where(User.username == username)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()
