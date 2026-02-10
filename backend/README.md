# FastAPI Self-Service (User Management)

## Setup
1. Create a Python virtualenv and install dependencies:
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt

2. Edit `config/default.yaml` with your DB and Keycloak values.
   - For MySQL set `database.type: mysql` and ensure pymysql installed.

## Run using default config
uvicorn app.main:app --reload

## Run with a custom config
uvicorn app.main:app --reload -- --config ./config/prod.yaml

Note: the `--` tells uvicorn to pass the following args to the app module (so our config parser receives `--config`).
