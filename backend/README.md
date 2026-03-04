# YakkAI Backend - Core Engine

The YakkAI backend is an asynchronous API engine built with **FastAPI**. It manages the state of the platform, interacts with cloud provider SDKs, and integrates with **Keycloak** for secure identity and access management.

## 🛠️ Tech Stack
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL (via SQLAlchemy & Alembic)
- **Identity**: Keycloak (OIDC/JWKS)
- **Cloud SDKs**: Boto3 (AWS), Azure Management SDK

## ⚙️ Installation & Setup

### 1. Environment Setup
We recommend using a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration
The application uses a YAML-based configuration.
- Locate `app/config/config.yaml` (or similar).
- Update the following sections:
  - **Database**: Host, user, and password for your PostgreSQL instance.
  - **Keycloak**: Server URL, realm, and client configuration.
  - **Environment Variables**: Can be defined in a `.env` file at the root of the backend folder.

### 3. Database Migrations
If using a new database, run migrations:
```bash
alembic upgrade head
```

### 4. Running the Server
```bash
# Standard reload mode
uvicorn app.main:app --reload

# With custom configuration path
uvicorn app.main:app --reload -- --config ./app/config/prod.yaml
```

## 🔌 API Documentation
Once running, you can access the interactive Swagger documentation at:
- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

## 📁 Folder Structure
- `app/api/`: API route definitions (v1).
- `app/engines/`: Asynchronous background synchronization scripts (`resource_sync` and `finops_job`).
- `app/services/`: Business logic and cloud provider integrations.
- `app/models/`: SQLAlchemy database models.
- `app/core/`: Security, authentication, and core application settings.
- `app/db/`: Database session management and migrations.
