# YakkAI: Multi-Cloud Self-Service Platform

YakkAI is a comprehensive platform designed to provide a seamless self-service experience for managing cloud infrastructure across multiple providers (**AWS, Azure, GCP, OCI, and VMware**). It simplifies complex cloud operations into intuitive, role-based workflows for enterprise tenants.

---

## 📂 Project Structure

The codebase is organized into three primary modules, each with its own specific focus and documentation:

- **[`/backend`](./backend)**: A high-performance FastAPI server (Python) handling core logic, cloud integrations, and identity management. Includes `/app/api/v1/routers/` for modular endpoints.
- **[`/frontend`](./frontend)**: A modern, responsive React interface built with Material UI and TypeScript. Includes `/src/components/` for generic UI and `/src/pages/` for views.
- **[`/helm`](./helm)**: Kubernetes deployment configurations (Helm charts) for production-ready container orchestration.

---

## 🚀 Quick Start Guide

Follow these steps to get the platform up and running in your local environment.

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **Docker & Docker Compose** (Optional, for containerized setup)

### 2. Services (Postgres & Keycloak)
The fastest way to get the prerequisite database and auth server running locally is via Docker Compose:
```bash
docker-compose -f docker-compose.yml up -d postgres keycloak
```

### 3. Setup Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*For detailed configuration (DB, Keycloak), see [backend/README.md](./backend).*

### 4. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
*Access the UI at `http://localhost:5173`.*

### 5. Deployment (Full Docker Stack)
To run the entire stack (Backend + Frontend + Services) using Docker Compose:
```bash
docker-compose up -d --build
```

### 5. Kubernetes (Helm)
Deployment to Kubernetes clusters using the provided charts:
```bash
cd helm/suyasevai
helm install yakkai . -f values.yaml
```
*See [helm/README.md](./helm) for scaling and ingress configurations.*

---

## 🛡️ Key Features
- **Multi-Tenant Architecture**: Isolate resources and users by organizational units.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for users and groups.
- **Multi-Cloud Inventory**: Unified view of EC2, VMs, Clusters, and more across regions.
- **Approval Workflows**: Multi-stage verification for sensitive infrastructure changes.
- **CI/CD Integration**: Managed automation runners (GitHub/GitLab) with secure credential handling.

---

## 📄 Documentation
For more specific details, please refer to the READMEs in each module:
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Helm Documentation](./helm/README.md)
