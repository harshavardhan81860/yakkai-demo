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
from repositories.tenant_repository import TenantRepository


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

    async def update_user(
        self,
        session: AsyncSession,
        user_identifier: str,
        first_name: str = None,
        last_name: str = None,
        mobile: str = None,
        department: str = None,
        gender: str = None,
    ) -> Optional[User]:
        user = await self.repo.get_by_id(session, user_identifier)
        if not user:
            return None
        if first_name is not None:
            user.first_name = first_name
        if last_name is not None:
            user.last_name = last_name
        if mobile is not None:
            user.mobile = mobile
        if department is not None:
            user.department = department
        if gender is not None:
            user.gender = gender
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

    async def get_user_role_context(self, session: AsyncSession, user_id: str):
        """
        Returns the user's role context for the frontend view system:
        - system_role: str | None  (e.g. "system_admin")
        - tenant_roles: [{ tenant_id, tenant_name, role }]
        """
        role_assignment_service = RoleAssignmentService()
        role_service = RoleService()
        tenant_repo = TenantRepository()

        # Get all effective assignments (direct + inherited via groups)
        effective = await role_assignment_service.list_effective_user_assignments(session, user_id)

        system_role = None
        tenant_roles = []
        tenant_cache = {}

        for assignment in effective:
            role = await role_service.get_role(session, str(assignment["role_id"]))
            if not role or not role.is_active:
                continue

            if role.is_system_role:
                # System-level role (no tenant scope)
                if system_role is None:
                    system_role = role.name
            else:
                # Tenant-scoped role
                tenant_id = assignment.get("tenant_id")
                if not tenant_id:
                    continue

                tenant_id_str = str(tenant_id)

                # Avoid duplicate tenant entries (first role wins — no duplicates per plan)
                if tenant_id_str in tenant_cache:
                    continue

                tenant = await tenant_repo.get_by_id(session, tenant_id_str)
                if not tenant:
                    continue

                tenant_cache[tenant_id_str] = True
                tenant_roles.append({
                    "tenant_id": tenant_id_str,
                    "tenant_name": tenant.display_name or tenant.name,
                    "role": role.name
                })

        return {
            "system_role": system_role,
            "tenant_roles": tenant_roles
        }

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
        tenant_repo = TenantRepository()  # Add tenant repository

        # Cache for tenant lookups
        tenant_cache = {}

        async def get_tenant_info(tenant_id):
            """Helper to get tenant info with caching"""
            if tenant_id is None:
                return {}  # Empty dict for system type
            
            if tenant_id not in tenant_cache:
                tenant = await tenant_repo.get_by_id(session, tenant_id)
                tenant_cache[tenant_id] = {
                    "id": tenant.id,
                    "name": tenant.name
                } if tenant else {}
            
            return tenant_cache[tenant_id]

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

            tenant_info = await get_tenant_info(group.tenant_id)

            group_data = {
                "id": group.id,
                "name": group.name,
                "type": "SYSTEM" if group.tenant_id is None else "TENANT",
                "tenant": tenant_info  # Always present (empty dict or populated)
            }

            groups.append(group_data)
            group_map[group.id] = {
                "name": group.name,
                "tenant_info": tenant_info
            }

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

            tenant_info = await get_tenant_info(role.tenant_id)

            role_data = {
                "id": role.id,
                "name": role.name,
                "type": "SYSTEM" if role.tenant_id is None else "TENANT",
                "tenant": tenant_info,  # Always present (empty dict or populated)
                "assignment_type": "DIRECT",
                "inherited_from_groups": []  # ALWAYS PRESENT
            }

            roles_map[role.id] = role_data

        # ─────────────────────────────────────────────
        # 4. Roles inherited via Groups
        # ─────────────────────────────────────────────
        for group_id, group_info in group_map.items():
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

                tenant_info = await get_tenant_info(role.tenant_id)

                if role.id not in roles_map:
                    role_data = {
                        "id": role.id,
                        "name": role.name,
                        "type": "SYSTEM" if role.tenant_id is None else "TENANT",
                        "tenant": tenant_info,  # Always present (empty dict or populated)
                        "assignment_type": "INHERITED",
                        "inherited_from_groups": []
                    }

                    roles_map[role.id] = role_data

                roles_map[role.id]["inherited_from_groups"].append({
                    "id": group_id,
                    "name": group_info["name"]
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