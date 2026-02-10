from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.approval_mapping import (
    ApprovalMappingPolicy,
    ApprovalMappingConditionGroup,
    ApprovalMappingCondition
)


class ApprovalMappingRepository:

    # -------- Policy --------
    async def create_policy(self, session: AsyncSession, policy):
        session.add(policy)
        await session.flush()
        return policy

    async def update_policy(self, session: AsyncSession, policy_id, values):
        policy = await session.get(ApprovalMappingPolicy, policy_id)
        for k, v in values.items():
            setattr(policy, k, v)
        return policy

    async def get_policies(
        self,
        session: AsyncSession,
        resource_name=None,
        action_name=None,
        scope_type=None,
        is_mandatory=None,
    ):
        query = select(ApprovalMappingPolicy)

        if resource_name:
            query = query.where(ApprovalMappingPolicy.resource_name == resource_name)
        if action_name:
            query = query.where(ApprovalMappingPolicy.action_name == action_name)
        if scope_type:
            query = query.where(ApprovalMappingPolicy.scope_type == scope_type)
        if is_mandatory is not None:
            query = query.where(ApprovalMappingPolicy.is_mandatory == is_mandatory)

        res = await session.execute(query)
        return res.scalars().all()

    # -------- Group --------
    async def create_group(self, session: AsyncSession, group):
        session.add(group)
        await session.flush()
        return group

    async def update_group(self, session: AsyncSession, group_id, values):
        group = await session.get(ApprovalMappingConditionGroup, group_id)
        for k, v in values.items():
            setattr(group, k, v)
        return group

    async def delete_group(self, session: AsyncSession, group_id):
        group = await session.get(ApprovalMappingConditionGroup, group_id)
        await session.delete(group)

    async def get_policy_groups(self, session: AsyncSession, policy_id):
        res = await session.execute(
            select(ApprovalMappingConditionGroup).where(
                ApprovalMappingConditionGroup.policy_id == policy_id
            )
        )
        return res.scalars().all()

    # -------- Condition --------
    async def create_condition(self, session: AsyncSession, condition):
        session.add(condition)
        await session.flush()
        return condition

    async def update_condition(self, session: AsyncSession, condition_id, values):
        condition = await session.get(ApprovalMappingCondition, condition_id)
        for k, v in values.items():
            setattr(condition, k, v)
        return condition

    async def delete_condition(self, session: AsyncSession, condition_id):
        condition = await session.get(ApprovalMappingCondition, condition_id)
        await session.delete(condition)

    async def get_group_conditions(self, session: AsyncSession, group_id):
        res = await session.execute(
            select(ApprovalMappingCondition).where(
                ApprovalMappingCondition.group_id == group_id
            )
        )
        return res.scalars().all()

    # -------- Evaluation helpers --------
    async def get_eval_policies(self, session, r, a, st, sid):
        res = await session.execute(
            select(ApprovalMappingPolicy).where(
                ApprovalMappingPolicy.resource_name == r,
                ApprovalMappingPolicy.action_name == a,
                ApprovalMappingPolicy.scope_type == st,
                ApprovalMappingPolicy.scope_id == sid,
                ApprovalMappingPolicy.is_active.is_(True),
            )
        )
        return res.scalars().all()

    async def get_policies(
        self,
        session: AsyncSession,
        resource_name=None,
        action_name=None,
        scope_type=None,
        is_mandatory=None,
    ):
        query = select(ApprovalMappingPolicy)

        if resource_name:
            query = query.where(ApprovalMappingPolicy.resource_name == resource_name)
        if action_name:
            query = query.where(ApprovalMappingPolicy.action_name == action_name)
        if scope_type:
            query = query.where(ApprovalMappingPolicy.scope_type == scope_type)
        if is_mandatory is not None:
            query = query.where(ApprovalMappingPolicy.is_mandatory == is_mandatory)

        res = await session.execute(query)
        return res.scalars().all()

    # -------- Get single policy --------
    async def get_policy(self, session: AsyncSession, policy_id: str):
        return await session.get(ApprovalMappingPolicy, policy_id)
