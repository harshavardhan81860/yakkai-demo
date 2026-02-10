from sqlalchemy.ext.asyncio import AsyncSession
from models.approval_mapping import (
    ApprovalMappingPolicy,
    ApprovalMappingConditionGroup,
    ApprovalMappingCondition,
)
from repositories.approval_mapping_repository import ApprovalMappingRepository
from core.enums.operator_enum import OperatorEnum
from fastapi import HTTPException
class ApprovalMappingService:

    def __init__(self):
        self.repo = ApprovalMappingRepository()

    async def create_policy(self, session: AsyncSession, req):
        # Check for existing policy
        existing = await self.repo.get_policies(
            session,
            resource_name=req.resource_name,
            action_name=req.action_name,
            scope_type=req.scope_type,
            is_mandatory=None
        )
        if any(p.scope_id == req.scope_id for p in existing):
            raise HTTPException(status_code=400, detail="Policy already exists for this resource/action/scope")

        # Create policy
        policy = ApprovalMappingPolicy(**req.dict(exclude={"groups"}))
        session.add(policy)
        await session.commit()  # <-- commit to persist policy immediately

        # Add groups and conditions if any
        for g in req.groups or []:
            group = ApprovalMappingConditionGroup(policy_id=policy.id, operator=g.operator)
            session.add(group)
            await session.commit()  # <-- commit each group

            for c in g.conditions or []:
                condition = ApprovalMappingCondition(
                    group_id=group.id,
                    attribute=c.attribute,
                    operator=c.operator,
                    value=c.value
                )
                session.add(condition)
            await session.commit()  # <-- commit all conditions in the group

        return policy


    async def update_policy(self, session: AsyncSession, policy_id, req):
        # Get existing policy
        policy = await session.get(ApprovalMappingPolicy, policy_id)
        if not policy:
            raise HTTPException(status_code=400, detail="Policy not found") 

        # Update policy fields
        for k, v in req.dict(exclude={"groups"}, exclude_unset=True).items():
            setattr(policy, k, v)
        await session.commit()  # <-- commit updated policy

        # Handle groups
        existing_groups = {str(g.id): g for g in await self.repo.get_policy_groups(session, policy.id)}
        sent_group_ids = set()

        for g in req.groups or []:
            if g.id and str(g.id) in existing_groups:
                group = existing_groups[str(g.id)]
                group.operator = g.operator
                await session.commit()
            else:
                group = ApprovalMappingConditionGroup(policy_id=policy.id, operator=g.operator)
                session.add(group)
                await session.commit()

            if g.id:
                sent_group_ids.add(str(g.id))

            # Handle conditions
            existing_conditions = {str(c.id): c for c in await self.repo.get_group_conditions(session, group.id)}
            sent_condition_ids = set()

            for c in g.conditions or []:
                if c.id and str(c.id) in existing_conditions:
                    cond = existing_conditions[str(c.id)]
                    cond.attribute = c.attribute
                    cond.operator = c.operator
                    cond.value = c.value
                else:
                    cond = ApprovalMappingCondition(
                        group_id=group.id,
                        attribute=c.attribute,
                        operator=c.operator,
                        value=c.value
                    )
                    session.add(cond)
                sent_condition_ids.add(str(c.id) if c.id else "")
            await session.commit()  # <-- commit all conditions

            # Delete removed conditions
            for cid, cond in existing_conditions.items():
                if cid not in sent_condition_ids:
                    await session.delete(cond)
            await session.commit()

        # Delete removed groups
        for gid, grp in existing_groups.items():
            if gid not in sent_group_ids:
                await session.delete(grp)
        await session.commit()

        return policy


    # ---------------- Evaluate ----------------
    async def evaluate(self, session: AsyncSession, req):
        policies = await self.repo.get_eval_policies(
            session,
            req.resource_name,
            req.action_name,
            req.scope_type,
            req.scope_id
        )

        if not policies:
            return {"approval_required": False}

        policy = policies[0]

        if policy.is_mandatory:
            return {"approval_required": True}

        groups = await self.repo.get_policy_groups(session, policy.id)
        approval = False

        for g in groups:
            conditions = await self.repo.get_group_conditions(session, g.id)
            results = []

            for c in conditions:
                attr_val = req.context.get(c.attribute)
                cond_val = c.value

                if attr_val is None:
                    results.append(False)
                    continue

                op = c.operator

                # Simplified evaluation for now (string only)
                if op == OperatorEnum.EQUAL:
                    results.append(str(attr_val) == str(cond_val))
                elif op == OperatorEnum.NOT_EQUAL:
                    results.append(str(attr_val) != str(cond_val))
                else:
                    results.append(False)

            if g.operator.upper() == "AND":
                group_result = all(results)
            else:
                group_result = any(results)

            approval = approval or group_result

        return {"approval_required": approval}


    async def get_policies(
        self,
        session: AsyncSession,
        resource_name=None,
        action_name=None,
        scope_type=None,
        is_mandatory=None,
    ):
        return await self.repo.get_policies(
            session,
            resource_name,
            action_name,
            scope_type,
            is_mandatory,
        )

    # -------- Get Policy Details --------
    async def get_policy_details(self, session: AsyncSession, policy_id: str):
        # 1️⃣ Fetch policy
        policy = await self.repo.get_policy(session, policy_id)
        if not policy:
            return None

        # 2️⃣ Fetch groups for this policy
        groups = await self.repo.get_policy_groups(session, policy_id)

        # 3️⃣ For each group, fetch conditions
        group_list = []
        for g in groups:
            conditions = await self.repo.get_group_conditions(session, g.id)
            group_list.append({
                "id": g.id,
                "operator": g.operator,
                "conditions": [
                    {
                        "id": c.id,
                        "attribute": c.attribute,
                        "operator": c.operator,
                        "value": c.value
                    } for c in conditions
                ]
            })

        # 4️⃣ Return combined structure
        return {
            "id": policy.id,
            "resource_name": policy.resource_name,
            "action_name": policy.action_name,
            "scope_type": policy.scope_type,
            "scope_id": policy.scope_id,
            "template_id": policy.template_id,
            "template_name": getattr(policy, "template_name", ""),  # assume joined or mapped elsewhere
            "is_mandatory": policy.is_mandatory,
            "is_active": policy.is_active,
            "groups": group_list,
        }
