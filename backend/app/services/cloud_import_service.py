# services/cloud_import_service.py
"""
Handles importing discovered cloud accounts into the database:
  - Bulk import with hierarchy (parent → children)
  - Credential updates (inherited ↔ own)
  - Hierarchy updates (parent_id, organization_context)
"""

import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from models.cloud_account import CloudAccount
from repositories.cloud_account_repository import CloudAccountRepository
from schemas.cloud_discovery_schema import (
    ImportRequest, ImportResult, ImportedAccountSummary,
    CredentialUpdateRequest, CredentialUpdateResult,
    DiscoveredAccount,
)
from utils.cloud_helpers import (
    build_aws_management_metadata,
    build_aws_member_metadata,
    build_aws_standalone_metadata,
    build_azure_tenant_metadata,
    build_azure_subscription_metadata,
    build_azure_management_group_metadata,
    build_aws_ou_metadata,
    extract_cloud_identifier,
)

logger = logging.getLogger(__name__)


class CloudAccountImportService:
    """Import discovered cloud accounts into the database."""

    def __init__(self):
        self.repo = CloudAccountRepository()

    # ═══════════════════════════════════════════════
    #  Import Accounts
    # ═══════════════════════════════════════════════

    async def import_accounts(
        self,
        req: ImportRequest,
        db: AsyncSession,
    ) -> ImportResult:
        """
        Import discovered accounts based on import_mode:
          - add_all: create parent + all discovered children
          - add_selected: create parent + selected children
          - add_management_only / add_tenant_only: create only the parent
        """
        provider = req.cloud_provider.lower()
        imported: List[ImportedAccountSummary] = []
        skipped = 0

        try:
            if provider == "aws":
                imported, skipped = await self._import_aws(req, db)
            elif provider == "azure":
                imported, skipped = await self._import_azure(req, db)
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Unsupported provider: {provider}",
                )

            await db.commit()

            return ImportResult(
                status="success",
                message=f"Imported {len(imported)} accounts, skipped {skipped}",
                imported_accounts=imported,
                skipped_count=skipped,
            )

        except HTTPException:
            raise
        except Exception as e:
            await db.rollback()
            logger.error("Import failed: %s", e)
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

    # ─────────────── AWS import ───────────────

    # ─────────────── AWS import ───────────────

    async def _import_aws(
        self, req: ImportRequest, db: AsyncSession
    ) -> tuple:
        imported: List[ImportedAccountSummary] = []
        skipped = 0

        creds = req.aws_credentials
        if not creds:
            raise HTTPException(status_code=400, detail="AWS credentials required")

        org = req.organization_details
        mgmt_id = None

        # Determine if we're adding an org or standalone
        if org and org.is_management_account:
            # Create/Update the management account record
            mgmt_meta = build_aws_management_metadata(
                account_id=creds.account_id,
                role_name=creds.role_name,
                organization_id=org.organization_id,
                organization_arn=org.organization_arn,
                external_id=creds.external_id,
                feature_set=org.feature_set or "ALL",
            )

            existing = await self.repo.get_by_cloud_identifier(
                db, req.tenant_id, "aws", creds.account_id
            )
            if existing:
                existing.cred_metadata = mgmt_meta
                await self.repo.update(db, existing)
                mgmt_id = str(existing.id)
                imported.append(ImportedAccountSummary(
                    id=mgmt_id, name=existing.name, cloud_provider="aws", account_type="management"
                ))
            else:
                # Resolve name: 
                # 1. Organization Details (if mgmt name provided)
                # 2. Look in discovered_accounts for the management account
                # 3. Fallback to AWS Org (...)
                mgmt_name = f"AWS Org ({creds.account_id})"
                
                if org and org.management_account_name:
                     mgmt_name = org.management_account_name
                
                # Check discovered accounts for override
                for a in req.discovered_accounts:
                    if a.account_id == creds.account_id and a.name:
                        mgmt_name = a.name
                        break
                
                mgmt_account = CloudAccount(
                    tenant_id=req.tenant_id,
                    parent_id=None,
                    name=mgmt_name,
                    cloud_provider="aws",
                    cred_metadata=mgmt_meta,
                    is_active=True,
                )
                await self.repo.create(db, mgmt_account)
                await db.flush()
                mgmt_id = str(mgmt_account.id)
                imported.append(ImportedAccountSummary(
                    id=mgmt_id, name=mgmt_account.name, cloud_provider="aws", account_type="management"
                ))

            # Cloud ID -> DB ID mapping
            # Initialize with Management Account
            cloud_id_map = {creds.account_id: mgmt_id}
            # Also add root OUs if needed? 
            # In AWS, Root 'r-xxxx' is strictly inside the Mgmt account logic? 
            # No, Root is a container. Mgmt account is a member of Root? 
            # AWS Structure: Root -> Mgmt Account (as Valid Member) AND Root -> OUs -> Members.
            # But the management account *owns* the organization.
            # For simplicity: Management Account is the Top Node in our DB.
            # OUs and other members are children of Management Account (conceptually) or Root?
            # We'll treat Management Account as the root of the tree in DB. 
            # If an account has parent_id = Root (r-xxx), we map that to the Management Account DB Record.
            # OR we import the Root 'r-xxx' as an OU child of Management Account.
            # Let's map Root -> Management Account directly for now to save depth.
            cloud_id_map["Root"] = mgmt_id

            # Prepare list to import
            all_discovered_map = {a.account_id: a for a in req.discovered_accounts}
            # Map by OU ID as well
            for a in req.discovered_accounts:
                if a.organizational_unit_id:
                    all_discovered_map[a.organizational_unit_id] = a
                # Also map by "Root" if it comes through?
            
            queue = []
            if req.import_mode == "add_all":
                queue = list(req.discovered_accounts)
            elif req.import_mode == "add_selected":
                selected_set = set(req.selected_account_ids)
                queue = [a for a in req.discovered_accounts if a.account_id in selected_set or (a.organizational_unit_id and a.organizational_unit_id in selected_set)]

            # Resolve Ancestors
            final_list = {} # key: unique cloud identifier (account_id or ou_id)
            
            processing_queue = list(queue)
            while processing_queue:
                curr = processing_queue.pop(0)
                
                # Identify ID
                uid = curr.organizational_unit_id if curr.type in ["organizational_unit", "root"] else curr.account_id
                
                if uid in final_list: 
                    continue
                final_list[uid] = curr
                
                # Check parent
                pid = curr.parent_id
                if pid and pid not in cloud_id_map and pid not in final_list:
                    # Parent needs to be imported
                    # Find parent object in all_discovered
                    # If parent is Root (r-xxx), map it to Management Account?
                    if pid.startswith("r-"):
                        cloud_id_map[pid] = mgmt_id
                        continue

                    # Find in list
                    # We need to find the object that represents this parent ID
                    # Check if any account has this ID?
                    parent_obj = None
                    if pid in all_discovered_map:
                        parent_obj = all_discovered_map[pid]
                    else:
                        # Scan?
                        for candidate in req.discovered_accounts:
                             if candidate.organizational_unit_id == pid:
                                 parent_obj = candidate
                                 break
                    
                    if parent_obj:
                        processing_queue.append(parent_obj)
                    else:
                        # Parent unknown, link to Mgmt ID as fallback
                        cloud_id_map[pid] = mgmt_id

            # Sort hierarchy: OUs first, then short paths
            sorted_accounts = sorted(
                final_list.values(), 
                key=lambda x: (
                    0 if x.type in ["organizational_unit", "root"] else 1, 
                    x.ou_path.count('/') if x.ou_path else 0
                )
            )

            # Process Import
            for acct in sorted_accounts:
                uid = acct.organizational_unit_id if acct.type in ["organizational_unit", "root"] else acct.account_id
                
                # Determine Parent DB ID
                parent_db_id = mgmt_id
                if acct.parent_id and acct.parent_id in cloud_id_map:
                    parent_db_id = cloud_id_map[acct.parent_id]
                elif acct.parent_id and acct.parent_id.startswith("r-"):
                     parent_db_id = mgmt_id

                if uid in cloud_id_map:
                    continue

                existing_member = await self.repo.get_by_cloud_identifier(
                    db, req.tenant_id, "aws", uid
                )
                
                if acct.type in ["organizational_unit", "root"]:
                    if existing_member:
                        cloud_id_map[uid] = str(existing_member.id)
                        # skipped += 1 
                        # Update parent if needed?
                        continue
                        
                    ou_meta = build_aws_ou_metadata(
                        ou_id=uid,
                        ou_name=acct.name or acct.organizational_unit_name,
                        organization_id=org.organization_id,
                        ou_path=acct.ou_path,
                        parent_ou_id=acct.parent_id
                    )
                    
                    new_ou = CloudAccount(
                        tenant_id=req.tenant_id,
                        parent_id=parent_db_id,
                        name=acct.name or f"OU {uid}",
                        cloud_provider="aws",
                        cred_metadata=ou_meta,
                        is_active=True
                    )
                    await self.repo.create(db, new_ou)
                    await db.flush()
                    cloud_id_map[uid] = str(new_ou.id)
                    imported.append(ImportedAccountSummary(
                         id=str(new_ou.id), name=new_ou.name, cloud_provider="aws", account_type="organizational_unit",
                         parent_id=parent_db_id
                    ))
                    
                else: 
                    # Member Account
                    if existing_member:
                        skipped += 1
                        continue

                    member_meta = build_aws_member_metadata(
                        account_id=uid,
                        organization_id=org.organization_id,
                        ou_id=acct.organizational_unit_id,
                        ou_name=acct.organizational_unit_name,
                        ou_path=acct.ou_path,
                    )
                    member_name = acct.name or f"Member ({uid})"
                    member = CloudAccount(
                        tenant_id=req.tenant_id,
                        parent_id=parent_db_id,
                        name=member_name,
                        cloud_provider="aws",
                        cred_metadata=member_meta,
                        is_active=True,
                    )
                    await self.repo.create(db, member)
                    await db.flush()
                    cloud_id_map[uid] = str(member.id)
                    imported.append(ImportedAccountSummary(
                        id=str(member.id),
                        name=member_name,
                        cloud_provider="aws",
                        account_type="member",
                        parent_id=parent_db_id,
                    ))

        else:
            # Standalone logic (unchanged)
            standalone_meta = build_aws_standalone_metadata(
                account_id=creds.account_id,
                role_name=creds.role_name,
                external_id=creds.external_id,
            )
            existing = await self.repo.get_by_cloud_identifier(
                db, req.tenant_id, "aws", creds.account_id
            )
            if existing:
                skipped += 1
            else:
                standalone_name = f"AWS Account ({creds.account_id})"
                # Check discovered accounts for override
                for a in req.discovered_accounts:
                    if a.account_id == creds.account_id and a.name:
                        standalone_name = a.name
                        break
                        
                standalone = CloudAccount(
                    tenant_id=req.tenant_id,
                    parent_id=None,
                    name=standalone_name,
                    cloud_provider="aws",
                    cred_metadata=standalone_meta,
                    is_active=True,
                )
                await self.repo.create(db, standalone)
                await db.flush()
                imported.append(ImportedAccountSummary(
                    id=str(standalone.id),
                    name=standalone_name,
                    cloud_provider="aws",
                    account_type="standalone",
                ))

        return imported, skipped

    # ─────────────── Azure import ───────────────

    async def _import_azure(
        self, req: ImportRequest, db: AsyncSession
    ) -> tuple:
        imported: List[ImportedAccountSummary] = []
        skipped = 0

        creds = req.azure_credentials
        if not creds:
            raise HTTPException(status_code=400, detail="Azure credentials required")

        # 1. Create/Update Tenant Record (Root)
        tenant_meta = build_azure_tenant_metadata(
            az_tenant_id=creds.tenant_id,
            client_id=creds.client_id,
            client_secret=creds.client_secret,
            total_subscriptions=len(req.discovered_accounts),
        )
        existing_tenant = await self.repo.get_by_cloud_identifier(
            db, req.tenant_id, "azure", creds.tenant_id
        )
        tenant_record_id = None
        
        if existing_tenant:
            existing_tenant.cred_metadata = tenant_meta
            await self.repo.update(db, existing_tenant)
            tenant_record_id = str(existing_tenant.id)
            imported.append(ImportedAccountSummary(
                id=tenant_record_id, name=existing_tenant.name, cloud_provider="azure", account_type="tenant"
            ))
        else:
            tenant_name = f"Azure Tenant ({creds.tenant_id[:8]}...)"
            
            # Check for name override in discovered accounts (looking for tenant entry)
            # OR Check if any discovered account has account_id/subscription_id matching tenant_id (unlikely for Azure)
            # OR Check organization_details if provided
            if req.organization_details and req.organization_details.management_account_name:
                 tenant_name = req.organization_details.management_account_name
            
            # Also check discovered_accounts for a specialized "tenant" entry if we decide to pass one
            for a in req.discovered_accounts:
                if (a.account_id == creds.tenant_id or a.management_group_id == creds.tenant_id) and a.name:
                    tenant_name = a.name
                    break

            tenant_record = CloudAccount(
                tenant_id=req.tenant_id, parent_id=None, name=tenant_name,
                cloud_provider="azure", cred_metadata=tenant_meta, is_active=True
            )
            await self.repo.create(db, tenant_record)
            await db.flush()
            tenant_record_id = str(tenant_record.id)
            imported.append(ImportedAccountSummary(
                id=tenant_record_id, name=tenant_name, cloud_provider="azure", account_type="tenant"
            ))

        # Cloud ID -> DB ID cache
        # Map tenant_id to DB ID
        cloud_id_map = {creds.tenant_id: tenant_record_id}

        # 2. Resolve items to import
        # We need all discovered items to look up parents
        all_discovered = {
            (a.management_group_id if a.type == "management_group" else a.subscription_id): a 
            for a in req.discovered_accounts
        }

        # Filter initial selection
        queue = []
        if req.import_mode == "add_all":
            queue = list(req.discovered_accounts)
        elif req.import_mode == "add_selected":
             selected_set = set(req.selected_account_ids)
             queue = [
                 a for a in req.discovered_accounts
                 if (a.subscription_id or a.management_group_id or a.account_id) in selected_set
             ]

        # Resolve Dependencies (Parents)
        final_list = {}
        processing_queue = list(queue)
        
        while processing_queue:
            curr = processing_queue.pop(0)
            uid = curr.management_group_id if curr.type == "management_group" else (curr.subscription_id or curr.account_id)
            
            if uid in final_list: continue
            
            final_list[uid] = curr
            
            # Check Parent
            pid = curr.parent_id
            if pid and pid != creds.tenant_id: # Tenant already added
                 if pid not in final_list:
                     # Find parent object
                     if pid in all_discovered:
                         processing_queue.append(all_discovered[pid])
                     else:
                         # Fallback: link to Tenant if parent not found in discovery
                         cloud_id_map[pid] = tenant_record_id

        # Sort: MGs first (containers), effectively logic is Management Groups (type=management_group) -> Subscriptions
        # But even better: sort by dependency chain depth or just MGs then Subs.
        # Since MGs can be nested, we sort MGs by name length? Unreliable.
        # Better: We iterate until we resolve parents. Or topological sort.
        # Simple heuristic: MGs first, then Subs. If proper hierarchy, MGs parents will be imported or defaulted.
        # For strict correctness, we'll process MGs in a loop until progress stops.
        
        sorted_mgs = [x for x in final_list.values() if x.type == "management_group"]
        sorted_subs = [x for x in final_list.values() if x.type != "management_group"]
        
        # Process MGs (Multi-pass to resolve nested MGs)
        pending_mgs = list(sorted_mgs)
        for _ in range(5):
             if not pending_mgs: break
             next_pending = []
             for mg in pending_mgs:
                 mg_id = mg.management_group_id
                 parent_cloud_id = mg.parent_id or creds.tenant_id
                 
                 # Resolve Parent DB ID
                 parent_db_id = tenant_record_id
                 if parent_cloud_id in cloud_id_map:
                     parent_db_id = cloud_id_map[parent_cloud_id]
                 else:
                     # Parent not imported yet? Try again next pass
                     if any(p.management_group_id == parent_cloud_id for p in pending_mgs):
                         next_pending.append(mg)
                         continue
                     # Parent won't be imported? Default to Tenant
                     parent_db_id = tenant_record_id

                 # Import MG
                 existing_mg = await self.repo.get_by_cloud_identifier(db, req.tenant_id, "azure", mg_id)
                 if existing_mg:
                     cloud_id_map[mg_id] = str(existing_mg.id)
                     continue
                 
                 mg_meta = build_azure_management_group_metadata(
                     az_tenant_id=creds.tenant_id,
                     mg_id=mg_id,
                     mg_name=mg.name,
                     parent_mg_id=parent_cloud_id
                 )
                 new_mg = CloudAccount(
                     tenant_id=req.tenant_id, parent_id=parent_db_id, name=mg.name,
                     cloud_provider="azure", cred_metadata=mg_meta, is_active=True
                 )
                 await self.repo.create(db, new_mg)
                 await db.flush()
                 cloud_id_map[mg_id] = str(new_mg.id)
                 imported.append(ImportedAccountSummary(
                     id=str(new_mg.id), name=mg.name, cloud_provider="azure", 
                     account_type="management_group", parent_id=parent_db_id
                 ))
             
             pending_mgs = next_pending

        # Process Subscriptions
        for sub in sorted_subs:
            sub_id = sub.subscription_id or sub.account_id
            existing = await self.repo.get_by_cloud_identifier(db, req.tenant_id, "azure", sub_id)
            if existing:
                skipped += 1
                continue
            
            parent_cloud_id = sub.parent_id or creds.tenant_id
            parent_db_id = cloud_id_map.get(parent_cloud_id, tenant_record_id)
            
            sub_meta = build_azure_subscription_metadata(
                az_tenant_id=creds.tenant_id,
                subscription_id=sub_id,
                subscription_name=sub.name,
                subscription_state=sub.status or "Enabled",
                mg_id=sub.management_group_id,
            )
            sub_record = CloudAccount(
                tenant_id=req.tenant_id,
                parent_id=parent_db_id,
                name=sub.name,
                cloud_provider="azure",
                cred_metadata=sub_meta,
                is_active=True,
            )
            await self.repo.create(db, sub_record)
            await db.flush()
            imported.append(ImportedAccountSummary(
                id=str(sub_record.id),
                name=sub.name,
                cloud_provider="azure",
                account_type="subscription",
                parent_id=parent_db_id,
            ))

        return imported, skipped

    # ═══════════════════════════════════════════════
    #  Import Incremental (new accounts only)
    # ═══════════════════════════════════════════════

    async def import_incremental_accounts(
        self,
        parent_account_id: str,
        selected_accounts: List[DiscoveredAccount],
        db: AsyncSession,
    ) -> ImportResult:
        """Import newly discovered accounts under an existing parent."""
        parent = await self.repo.get_by_id(db, parent_account_id)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent account not found")

        provider = parent.cloud_provider.lower()
        meta = parent.cred_metadata
        imported: List[ImportedAccountSummary] = []
        skipped = 0

        try:
            for acct in selected_accounts:
                cloud_id = acct.subscription_id or acct.account_id
                existing = await self.repo.get_by_cloud_identifier(
                    db, str(parent.tenant_id), provider, cloud_id
                )
                if existing:
                    skipped += 1
                    continue

                if provider == "aws":
                    child_meta = build_aws_member_metadata(
                        account_id=acct.account_id,
                        organization_id=meta.get("organization_context", {}).get("organization_id", ""),
                        ou_id=acct.organizational_unit_id,
                        ou_name=acct.organizational_unit_name,
                        ou_path=acct.ou_path,
                    )
                    child_name = acct.name or f"Member ({acct.account_id})"
                    account_type = "member"
                elif provider == "azure":
                    sub_id = acct.subscription_id or acct.account_id
                    child_meta = build_azure_subscription_metadata(
                        az_tenant_id=meta.get("tenant_id", ""),
                        subscription_id=sub_id,
                        subscription_name=acct.name,
                        subscription_state=acct.status or "Enabled",
                        mg_id=acct.management_group_id,
                        mg_name=acct.management_group_name,
                    )
                    child_name = acct.name or f"Subscription ({sub_id[:8]}...)"
                    account_type = "subscription"
                else:
                    skipped += 1
                    continue

                child = CloudAccount(
                    tenant_id=parent.tenant_id,
                    parent_id=parent_account_id,
                    name=child_name,
                    cloud_provider=provider,
                    cred_metadata=child_meta,
                    is_active=True,
                )
                await self.repo.create(db, child)
                await db.flush()
                imported.append(ImportedAccountSummary(
                    id=str(child.id),
                    name=child_name,
                    cloud_provider=provider,
                    account_type=account_type,
                    parent_id=parent_account_id,
                ))

            await db.commit()
            return ImportResult(
                status="success",
                message=f"Imported {len(imported)} new accounts",
                imported_accounts=imported,
                skipped_count=skipped,
            )

        except Exception as e:
            await db.rollback()
            logger.error("Incremental import failed: %s", e)
            raise HTTPException(status_code=500, detail=str(e))

    # ═══════════════════════════════════════════════
    #  Update Credentials
    # ═══════════════════════════════════════════════

    async def update_account_credentials(
        self,
        account_id: str,
        req: CredentialUpdateRequest,
        db: AsyncSession,
    ) -> CredentialUpdateResult:
        """Update credential_source from inherited→own or vice versa."""
        account = await self.repo.get_by_id(db, account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        meta = dict(account.cred_metadata)  # make mutable copy
        meta["credential_source"] = req.credential_source

        if req.credential_source == "own":
            meta["auth"]["inherits_from_parent"] = False
            if req.aws_credentials:
                meta["auth"]["role_name"] = req.aws_credentials.role_name
                meta["auth"]["role_arn"] = (
                    f"arn:aws:iam::{meta.get('account_id', '')}:role/"
                    f"{req.aws_credentials.role_name}"
                )
                if req.aws_credentials.external_id:
                    meta["auth"]["external_id"] = req.aws_credentials.external_id
            meta["onboarding_method"] = "manual"
        else:
            meta["auth"]["inherits_from_parent"] = True
            # Remove direct cred fields
            meta["auth"].pop("role_arn", None)
            meta["auth"].pop("external_id", None)
            meta["onboarding_method"] = "discovered"

        account.cred_metadata = meta

        try:
            await self.repo.update(db, account)
            await db.commit()
            await db.refresh(account)
            return CredentialUpdateResult(
                status="success",
                message=f"Credentials updated to {req.credential_source}",
                account_id=account_id,
                credential_source=req.credential_source,
            )
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    # ═══════════════════════════════════════════════
    #  Update Hierarchy
    # ═══════════════════════════════════════════════

    async def update_account_hierarchy(
        self,
        account_id: str,
        new_parent_id: Optional[str],
        organization_context: Dict[str, Any],
        account_type: str,
        db: AsyncSession,
    ) -> bool:
        """Update account's parent_id and org context."""
        account = await self.repo.get_by_id(db, account_id)
        if not account:
            return False

        account.parent_id = new_parent_id

        meta = dict(account.cred_metadata)
        meta["account_type"] = account_type
        meta["organization_context"] = organization_context
        account.cred_metadata = meta

        try:
            await self.repo.update(db, account)
            await db.commit()
            return True
        except Exception:
            await db.rollback()
            return False
