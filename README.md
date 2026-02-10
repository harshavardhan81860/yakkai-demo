# YakkAI - Multi-Cloud Infrastructure Self-Service Platform

Self-service platform for provisioning and managing cloud infrastructure across AWS, Azure, GCP, OCI, and VMware.

## Architecture

```
yakkai/
├── backend/         # FastAPI (async, Python 3.11+)
├── frontend/        # React 19 + MUI 7 + TypeScript + Vite
└── helm/            # Kubernetes Helm charts (suyasevai)
```

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # local development (uses .env.local_dev)
```

### Docker
```bash
docker-compose up -d
```

## Environment Modes

| Mode | Command | Config File |
|------|---------|-------------|
| Local Dev | `npm run dev` | `.env.local_dev` |
| Docker Dev | `npm run dev:docker` | `.env.docker_dev` |
| Dev Deploy | `npm run dev:dev` | `.env.dev` |

## Tech Stack

- **Backend**: FastAPI, SQLAlchemy (async), PostgreSQL, Keycloak
- **Frontend**: React 19, MUI 7, TypeScript, Vite, recharts
- **Auth**: Keycloak SSO (JWKS)
- **Cloud SDKs**: boto3 (AWS), azure-mgmt-* (Azure)
- **Deploy**: Helm, GitLab CI/CD
