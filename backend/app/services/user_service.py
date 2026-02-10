from sqlalchemy.ext.asyncio import AsyncSession
from repositories.user_repository import UserRepository
from keycloak.client import KeycloakAdminClient
from utils.username_generator import generate_unique_username
from models.user import User
from typing import List, Optional

from services.group_service import GroupService
from services.role_assignment_service import RoleAssignmentService
from services.group_role_assignment_service import GroupRoleAssignmentService
from services.role_service import RoleService
from repositories.group_repository import GroupRepository


from core.config import load_config
import os 

settings = load_config(os.getenv("APP_CONFIG"))

class UserService:
    def __init__(self):
        self.repo = UserRepository()
        self.kc = KeycloakAdminClient()

    async def create_user(
        self,
        session: AsyncSession,
        email: str,
        first_name: str = None,
        last_name: str = None,
        mobile: str = None,
        department: str = None,
        gender: str = None,
        password: str = None,
    ) -> User:

        # Validate DB first (no commit yet)
        existing = await self.repo.get_by_email(session, email)
        if existing:
            raise Exception("Email already exists in DB")

        usernames = await self.repo.get_existing_usernames(session)
        username = generate_unique_username(email, usernames)

        # Handle password policy
        if not password:
            password = settings.KEYCLOAK_TEMP_PASSWORD
            temporary = True
        else:
            temporary = False

        # ─────────────────────────────────────────────
        # Step 1: Create user in Keycloak
        # ─────────────────────────────────────────────
        try:
            keycloak_user_id = self.kc.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=password,
                temporary=temporary,
            )
        except Exception as e:
            raise Exception(f"Keycloak create failed: {e}")

        new_user = User(
            keycloak_id=keycloak_user_id,
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            mobile=mobile,
            department=department,
            gender=gender,
            is_active=True,
        )

        # ─────────────────────────────────────────────
        # Step 2: Save DB record via repository (repository will commit)
        # ─────────────────────────────────────────────
        try:
            created = await self.repo.create(session, new_user)
            return created

        except Exception as db_err:
            # DB failed -> remove user from Keycloak
            try:
                self.kc.delete_user(keycloak_user_id)
            except Exception as err:
                # If Keycloak deletion fails, raise a combined error to surface both issues
                raise Exception(f"DB creation failed, Could not remove keycloak user : {err}")

            # Raise original DB error message (with note)
            raise Exception(f"DB creation failed. Keycloak user removed. {db_err}")

    async def get_user(self, session: AsyncSession, user_identifier: str) -> Optional[User]:
        return await self.repo.get_by_id(session, user_identifier)

    async def list_users(
        self,
        session: AsyncSession,
        email: Optional[str] = None,
        user_id: Optional[str] = None,
        user_name : Optional[str]=None,
        active: Optional[bool] = None,
    ) -> List[User]:
        return await self.repo.list_users(session, email=email, user_id=user_id, user_name=user_name, active=active)

    async def deactivate_user(self, session: AsyncSession, user_identifier: str) -> Optional[User]:
        user = await self.repo.get_by_id(session, user_identifier)
        if not user:
            return None
        if not user.is_active:
            return user
        user.is_active = False
        return await self.repo.update(session, user)

    async def activate_user(self, session: AsyncSession, user_identifier: str) -> Optional[User]:
        user = await self.repo.get_by_id(session, user_identifier)
        if not user:
            return None
        if user.is_active:
            return user
        user.is_active = True
        return await self.repo.update(session, user)

    async def trigger_reset_password(self, email: str) -> bool:
        try:
            token = self.kc._get_admin_token()
        except Exception:
            raise Exception("Failed to obtain admin token for Keycloak")

        try:
            users = self.kc.find_users(token, email=email)
            if not users:
                return True

            kc_id = users[0]["id"]
            return self.kc.send_reset_password_email(kc_id)
        except Exception:
            return True

    async def get_user_access_mappings(self, session: AsyncSession, user_id: str):
        # ─────────────────────────────────────────────
        # 1. Validate user (NO FAILURE)
        # ─────────────────────────────────────────────
        user = await self.repo.get_by_id(session, user_id)

        if not user:
            return {
                "message": "Invalid user",
                "user": None,
                "groups": [],
                "roles": []
            }

        group_service = GroupService()
        role_assignment_service = RoleAssignmentService()
        group_role_service = GroupRoleAssignmentService()
        role_service = RoleService()
        group_repo = GroupRepository()

        # ─────────────────────────────────────────────
        # 2. User → Groups
        # ─────────────────────────────────────────────
        group_assignments = await group_service.list_user_groups(session, user_id)

        groups = []
        group_map = {}

        for ga in group_assignments:
            group = await group_repo.get_by_id(session, ga.group_id)
            if not group:
                continue

            groups.append({
                "id": group.id,
                "name": group.name
            })

            group_map[group.id] = group.name

        # ─────────────────────────────────────────────
        # 3. User → Direct Roles
        # ─────────────────────────────────────────────
        roles_map = {}

        direct_roles = await role_assignment_service.list_user_assignments(
            session, user_id
        )

        for ra in direct_roles:
            role = await role_service.get_role(session, ra.role_id)
            if not role:
                continue

            roles_map[role.id] = {
                "id": role.id,
                "name": role.name,
                "assignment_type": "DIRECT",
                "inherited_from_groups": []  # ALWAYS PRESENT
            }

        # ─────────────────────────────────────────────
        # 4. Roles inherited via Groups
        # ─────────────────────────────────────────────
        for group_id, group_name in group_map.items():
            group_role_assignments = await group_role_service.list_group_roles(
                session, group_id
            )

            for gra in group_role_assignments:
                role = await role_service.get_role(session, gra.role_id)
                if not role:
                    continue

                # Direct role always wins
                if role.id in roles_map and roles_map[role.id]["assignment_type"] == "DIRECT":
                    continue

                if role.id not in roles_map:
                    roles_map[role.id] = {
                        "id": role.id,
                        "name": role.name,
                        "assignment_type": "INHERITED",
                        "inherited_from_groups": []
                    }

                roles_map[role.id]["inherited_from_groups"].append({
                    "id": group_id,
                    "name": group_name
                })

        # ─────────────────────────────────────────────
        # 5. Final response
        # ─────────────────────────────────────────────
        return {
            "user": {
                "id": user.id,
                "name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
                "email": user.email
            },
            "groups": groups,
            "roles": list(roles_map.values())
        }
