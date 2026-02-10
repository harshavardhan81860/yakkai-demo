from typing import Dict, Set
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException

from models.registry import ResourceRegistry, ActionRegistry


# ----------------------------
# Runtime registry map (NAMES)
# ----------------------------
# Structure:
# {
#   "USER": {
#       "actions": {"CREATE", "DELETE"}
#   }
# }
_REGISTRY_MAP: Dict[str, Dict[str, Set[str]]] = {}


# ----------------------------
# Decorator
# ----------------------------
def registry(resource: str, action: str):
    """
    Decorator to register resource + action metadata
    using NAME (not UUID).
    """

    def decorator(func):
        setattr(func, "_registry_resource_name", resource)
        setattr(func, "_registry_action_name", action)

        if resource not in _REGISTRY_MAP:
            _REGISTRY_MAP[resource] = {"actions": set()}

        _REGISTRY_MAP[resource]["actions"].add(action)

        return func

    return decorator


# ----------------------------
# Runtime catalog getter (NAMES ONLY)
# ----------------------------
def get_runtime_registry_catalog():
    """
    Returns runtime-discovered resource/action map (names).
    Used by /registry/catalog endpoint.
    """
    catalog = {}

    for resource_name, data in _REGISTRY_MAP.items():
        catalog[resource_name] = {
            "actions": list(data["actions"])
        }

    return catalog


# ----------------------------
# Validation Service
# ----------------------------
class RegistryValidationService:
    @staticmethod
    async def validate_registry_map(session: AsyncSession):
        """
        Validates:
        1. No duplicate resource names in runtime map
        2. No duplicate action names under same resource
        3. All resource names exist in DB
        4. All action names exist in DB
        """

        if not _REGISTRY_MAP:
            return  # No registry-decorated endpoints yet

        runtime_resource_names = set(_REGISTRY_MAP.keys())
        runtime_action_names = set()

        for data in _REGISTRY_MAP.values():
            runtime_action_names.update(data["actions"])

        # -------- Single-shot DB fetch --------
        db_resources = await session.execute(
            select(ResourceRegistry.resource_name)
        )
        db_resource_names = {row[0] for row in db_resources.fetchall()}

        db_actions = await session.execute(
            select(ActionRegistry.action_name)
        )
        db_action_names = {row[0] for row in db_actions.fetchall()}

        # -------- Validate resources --------
        missing_resources = runtime_resource_names - db_resource_names
        if missing_resources:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Registry validation failed. Missing resources in DB: "
                    f"{list(missing_resources)}"
                )
            )

        # -------- Validate actions --------
        missing_actions = runtime_action_names - db_action_names
        if missing_actions:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Registry validation failed. Missing actions in DB: "
                    f"{list(missing_actions)}"
                )
            )
