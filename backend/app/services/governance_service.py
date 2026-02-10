from models.governance import (
    GovernancePolicy,
    GovernancePolicySubject,
    GovernanceResourceAccess
)
from repositories.governance_repository import GovernanceRepository
from repositories.user_repository import UserRepository
from services.user_service import UserService

class GovernanceService:

    def __init__(self):
        self.repo = GovernanceRepository()
        self.user_repo = UserRepository()
        self.user_service = UserService()

    # ---------- POLICY ----------
    async def create_policy(self, session, req):
        existing = await self.repo.find_existing_policy(
            session,
            resource_type=req.resource_type,
            action_name=req.action_name,
            scope_type=req.scope_type,
            scope_id=req.scope_id,
        )

        if existing:
            return {
                "success": False,
                "message": "Policy already exists. Please activate or update the existing policy",
                "data": {"policy_id": existing.id},
            }

        policy = GovernancePolicy(**req.dict())
        await self.repo.create_policy(session, policy)

        await session.commit()
        await session.refresh(policy)

        return policy

    async def update_policy(self, session, policy_id, req):
        policy = await self.repo.get_policy_by_id(session, policy_id)
        if not policy:
            return None

        for k, v in req.dict(exclude_unset=True).items():
            setattr(policy, k, v)
        await self.repo.update_policy(session, policy)
        await session.commit()
        await session.refresh(policy)

        return policy

    async def get_policies(self, session, **filters):
        return await self.repo.get_policies(session, **filters)

    async def get_policy_details(self, session, policy_id):
        policy = await self.repo.get_policy_by_id(session, policy_id)
        subjects = await self.repo.fetch_subjects(session, [policy.id])
        return {"policy": policy, "subjects": subjects}

    # ---------- SUBJECT ----------
    async def add_subject(self, session, req):
        existing = await self.repo.find_existing_subject(
            session,
            policy_id=req.policy_id,
            subject_type=req.subject_type,
            subject_id=req.subject_id,
        )

        if existing:
            return {
                "success": False,
                "message": "Subject already exists for this policy",
                "data": {"subject_id": existing.id},
            }

        subject = GovernancePolicySubject(**req.dict())
        await self.repo.add_subject(session, subject)

        await session.commit()
        await session.refresh(subject)

        return subject

    async def get_subjects(self, session, **filters):
        return await self.repo.fetch_subjects_filtered(session, **filters)

    # ---------- RESOURCE ACCESS ----------
    async def create_resource_access(self, session, req):
        existing = await self.repo.find_existing_resource_access(
            session,
            resource_type=req.resource_type,
            resource_id=req.resource_id,
            action_name=req.action_name,
            subject_type=req.subject_type,
            subject_id=req.subject_id,
        )

        if existing:
            return {
                "success": False,
                "message": "Resource access already exists for this subject",
                "data": {"resource_access_id": existing.id},
            }

        access = GovernanceResourceAccess(**req.dict())
        await self.repo.create_resource_access(session, access)

        await session.commit()
        await session.refresh(access)

        return access

    async def get_resource_access(self, session, **filters):
        return await self.repo.fetch_resource_access_filtered(session, **filters)

    # ---------- SUBJECT UPDATE ----------
    async def update_policy_subject(self, session, subject_id, req):
        subject = await self.repo.get_subject_by_id(session, subject_id)
        if not subject:
            return None

        for k, v in req.dict(exclude_unset=True).items():
            setattr(subject, k, v)

        await session.commit()
        await session.refresh(subject)
        return subject


    # ---------- RESOURCE ACCESS UPDATE ----------
    async def update_resource_access(self, session, access_id, req):
        access = await self.repo.get_resource_access_by_id(session, access_id)
        if not access:
            return None

        for k, v in req.dict(exclude_unset=True).items():
            setattr(access, k, v)

        await session.commit()
        await session.refresh(access)
        return access



    async def evaluate(self, session, req):
        """
        Evaluation order:
        1. USER (tenant → system)
        2. GROUP (tenant → system)
        3. ROLE (tenant → system)
        """

        # ─────────────────────────────────────────────
        # 1. Validate user (DO NOT FAIL HARD)
        # ─────────────────────────────────────────────
        user = await self.user_repo.get_by_id(session, req.user_id)
        if not user:
            return {
                "decision": "DENY",
                "message": "Invalid user",
                "reference": None
            }

        # ─────────────────────────────────────────────
        # 2. Fetch resolved access mappings
        # ─────────────────────────────────────────────
        access = await self.user_service.get_user_access_mappings(
            session, req.user_id
        )

        user_subject = [("USER", req.user_id)]
        group_subjects = [("GROUP", g["id"]) for g in access["groups"]]
        role_subjects = [("ROLE", r["id"]) for r in access["roles"]]

        # ─────────────────────────────────────────────
        # 3. Scope loop (TENANT → SYSTEM)
        # ─────────────────────────────────────────────
        scopes = []
        if req.tenant_id:
            scopes.append(("TENANT", req.tenant_id))
        scopes.append(("SYSTEM", None))

        for scope_type, scope_id in scopes:

            # ---------- USER ----------
            decision = await self._evaluate_level(
                session,
                subjects=user_subject,
                req=req,
                scope_type=scope_type,
                scope_id=scope_id,
                level="USER"
            )
            if decision:
                return decision

            # ---------- GROUP ----------
            decision = await self._evaluate_level(
                session,
                subjects=group_subjects,
                req=req,
                scope_type=scope_type,
                scope_id=scope_id,
                level="GROUP"
            )
            if decision:
                return decision

            # ---------- ROLE ----------
            decision = await self._evaluate_level(
                session,
                subjects=role_subjects,
                req=req,
                scope_type=scope_type,
                scope_id=scope_id,
                level="ROLE"
            )
            if decision:
                return decision

        # ─────────────────────────────────────────────
        # 4. Default DENY
        # ─────────────────────────────────────────────
        return {
            "decision": "DENY",
            "message": "No matching policy found",
            "reference": None
        }


    async def _evaluate_level(
        self,
        session,
        subjects,
        req,
        scope_type,
        scope_id,
        level
    ):
        if not subjects:
            return None

        policies = await self.repo.fetch_eval_policies(
            session=session,
            resource_type=req.resource_type,
            action_name=req.action_name,
            scope_type=scope_type,
            scope_id=scope_id,
            subjects=subjects
        )

        if not policies:
            return None

        # DENY always wins inside same level
        for p in policies:
            if p.effect == "DENY":
                return {
                    "decision": "DENY",
                    "message": f"Denied via {level} policy",
                    "reference": {
                        "policy_id": p.id,
                        "scope": scope_type,
                        "level": level
                    }
                }

        # ALLOW only if no DENY found
        for p in policies:
            if p.effect == "ALLOW":
                return {
                    "decision": "ALLOW",
                    "message": f"Allowed via {level} policy",
                    "reference": {
                        "policy_id": p.id,
                        "scope": scope_type,
                        "level": level
                    }
                }

        return None
