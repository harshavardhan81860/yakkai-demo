# YakkAI Standalone FinOps Engine

This directory contains the YakkAI FinOps Engine. It is specifically designed as a standalone worker process instead of a built-in background task on the main API to ensure heavy cloud data-scraping workflows never impact the performance of dashboard interactions.

## Architecture

1. **Shared Ecosystem:** The Engine imports tools directly from the main API (`core.cloud_auth.auth_provider`, `db.engine`). This ensures that it utilizes the exact same verified credentials, AWS Assume Role chains, and Azure federated tokens without code duplication.
2. **Database Queue:** It does not operate on a timer internally. Instead, it relies on the `finops.fetch_jobs` Postgres table. When a user requests a cost sync via the UI, the API inserts `PENDING` jobs into this queue.
3. **Queue Polling & Concurrency:** The engine uses Postgres locked queries (`SELECT ... FOR UPDATE SKIP LOCKED`). This guarantees that you can run 5 identical FinOps Engine containers at once, and they will safely pick off different jobs without duplicating work or hitting race conditions.
4. **Data Normalization:** All scraped data (via Boto3 or Azure Cost Management) is processed, strictly localized to USD, and injected safely into `finops.daily_costs`.

## Running the Engine

The Engine uses the same configuration system as the main API. You must provide the `APP_CONFIG` environment variable and run it with `PYTHONPATH=.` from the `backend/app` directory.

### Local Execution (Manual)
```bash
# Navigate to the backend app directory
cd backend/app

# Point to your desired config and run
APP_CONFIG=config/config.yaml PYTHONPATH=. python3 engines/finops_job/main.py
```

### Expected Output
```text
2026-02-24 15:45:00,000 - finops_engine - INFO - Starting FinOps Engine Worker...
2026-02-24 15:45:00,500 - finops_engine - INFO - Processing Job 1234-abcd for Account MyCorp on 2026-02-23
2026-02-24 15:45:03,000 - finops_engine - INFO - Job 1234-abcd completed. Inserted 45 records.
...
2026-02-24 15:45:05,000 - finops_engine - INFO - Queue is empty. Engine transitioning to SLEEP (Terminating).
```

### Production Execution (Kubernetes)
In a production Kubernetes environment, you should run this script as a `CronJob` that executes every hour or every day. The script naturally terminates once the `finops.fetch_jobs` table is empty.

## Data Schema
- **`finops.fetch_jobs`**: The Queue. Contains `account_id`, `target_date`, and `status`.
- **`finops.daily_costs`**: The normalized data store. This table serves responses to the frontend MTD dashboards instantly. Cost metrics are mapped generically (e.g., Azure VM / AWS EC2 both map to `portal_resource_type = "Compute"`).
