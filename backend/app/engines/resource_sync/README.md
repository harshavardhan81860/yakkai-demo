# Resource Sync Engine

Standalone worker that polls the `data.resource_sync_jobs` table for **PENDING** jobs and executes them.

## Architecture

```
User clicks "Sync Resources" →  API creates a PENDING job in DB
                                        ↓
Resource Sync Engine (this script) →  Picks up PENDING jobs atomically
                                        ↓
                              Fetches resources via Azure Resource Graph / AWS Resource Explorer
                                        ↓
                              Upserts into data.cloud_resources
                                        ↓
                              Marks job as COMPLETED or FAILED
```

## How it works

1. The **API endpoint** (`POST /cloud-accounts/{id}/sync-resources`) only **schedules** a job by inserting a row with `status = 'PENDING'`.
2. This engine runs **periodically** (via cron, systemd timer, or Kubernetes CronJob).
3. On each run, it atomically pops PENDING jobs using `FOR UPDATE SKIP LOCKED` to prevent race conditions with multiple workers.
4. It processes each job, fetches resources from the cloud provider, upserts them into the database, and marks the job as completed or failed.
5. When no more PENDING jobs exist, the engine exits cleanly.

## Usage

```bash
# From backend/app directory
python -m engines.resource_sync.main -c config/config.yaml

# Or directly
cd backend/app
python engines/resource_sync/main.py -c config/config.yaml
```

## Scheduling

Add a cron job or Kubernetes CronJob to run this engine periodically (e.g., every 5 minutes):

```cron
*/5 * * * * cd /app && python -m engines.resource_sync.main -c config/config.yaml
```
