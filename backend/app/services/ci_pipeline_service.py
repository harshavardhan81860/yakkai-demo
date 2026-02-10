# services/ci_pipeline_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from services.ci_credentials_service import CICredentialsService
from services.cloud_account_service import CloudAccountService
from repositories.ci_pipeline_execution_repository import CIPipelineExecutionRepository
from models.ci_pipeline_execution import CIPipelineExecution
from sqlalchemy import update
from datetime import datetime
import httpx
import asyncio


class CIPipelineService:

    def __init__(self):
        self.cred_service = CICredentialsService()
        self.cloud_service = CloudAccountService()
        self.exec_repo = CIPipelineExecutionRepository()

    async def trigger_pipeline(self, session: AsyncSession, req):
        account = await self.cloud_service.repo.get_by_id(session, req.cloud_account_id)
        if not account:
            raise HTTPException(404, "Cloud account not found")

        cred = await self.cred_service.repo.get_by_id(session, account.ci_credentials_id)
        if not cred or not cred.is_active:
            raise HTTPException(400, "Invalid CI credentials")

        execution = CIPipelineExecution(
            cloud_account_id=account.id,
            ci_credentials_id=cred.id,
            provider="gitlab",
            action=req.action,
            status="triggered"
        )

        await self.exec_repo.create(session, execution)
        await session.commit()
        await session.refresh(execution)

        trigger_resp = await self._trigger_gitlab_pipeline(cred)

        execution.pipeline_id = trigger_resp["id"]
        execution.ref = trigger_resp["ref"]
        execution.status = trigger_resp["status"]
        execution.raw_response = trigger_resp

        await session.commit()

        # 🔁 Poll pipeline
        final_status, logs = await self._poll_gitlab_pipeline(
            cred, execution.pipeline_id
        )

        execution.status = final_status
        execution.job_logs = logs

        # 🔄 Update cloud account for connection test
        if req.action == "connection_test":
            await session.execute(
                update(account.__class__)
                .where(account.__class__.id == account.id)
                .values(
                    connection_status="success" if final_status == "success" else "failed",
                    last_validated_at=datetime.utcnow()
                )
            )

        await session.commit()

        return {
            "execution_id": execution.id,
            "pipeline_id": execution.pipeline_id,
            "status": execution.status
        }

    async def _trigger_gitlab_pipeline(self, cred):
        url = f"{cred.base_url.rstrip('/')}/api/v4/projects/{cred.project_id}/trigger/pipeline"
        payload = {"token": cred.token, "ref": "main"}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, data=payload)

        if resp.status_code not in (200, 201):
            raise HTTPException(400, resp.text)

        return resp.json()

    async def _poll_gitlab_pipeline(self, cred, pipeline_id):
        url = f"{cred.base_url.rstrip('/')}/api/v4/projects/{cred.project_id}/pipelines/{pipeline_id}"

        async with httpx.AsyncClient(timeout=30) as client:
            for _ in range(20):
                resp = await client.get(url)
                data = resp.json()

                status = data["status"]
                if status in ("success", "failed", "canceled"):
                    logs = await self._fetch_job_logs(cred, pipeline_id)
                    return status, logs

                await asyncio.sleep(5)

        return "timeout", {}

    async def _fetch_job_logs(self, cred, pipeline_id):
        jobs_url = f"{cred.base_url.rstrip('/')}/api/v4/projects/{cred.project_id}/pipelines/{pipeline_id}/jobs"
        headers = {"PRIVATE-TOKEN": cred.token}

        logs = {}

        async with httpx.AsyncClient(timeout=30) as client:
            jobs_resp = await client.get(jobs_url, headers=headers)
            for job in jobs_resp.json():
                trace_url = f"{jobs_url}/{job['id']}/trace"
                trace_resp = await client.get(trace_url, headers=headers)
                logs[job["name"]] = trace_resp.text

        return logs
