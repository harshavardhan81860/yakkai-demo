# YakkAI Helm Charts - Kubernetes Deployment

This directory contains the Helm charts required to deploy the YakkAI platform to a Kubernetes cluster. It manages the orchestration of both frontend and backend services, along with their dependencies.

## 📦 Chart Overview: `suyasevai`

The primary chart is `suyasevai`, located in the `suyasevai/` subdirectory.

### Key Components
- **Backend Deployment**: FastAPI application running on port 8000.
- **Frontend Deployment**: Nginx-served React application on port 80.
- **Services**: ClusterIP services for internal communication.
- **Ingress**: Configurable ingress rules for external access.

## 🚀 Installation

### 1. Prerequisites
- **Helm v3+** installed.
- A running **Kubernetes cluster**.
- Access to your cluster configured (e.g., `kubectl get nodes`).

### 2. Configure Values
Edit the `suyasevai/values.yaml` file to match your environment. Key configurations include:
- `backend.image`: The container image for the backend.
- `frontend.image`: The container image for the frontend.
- `ingress.host`: The domain name for the application.
- `backend.config`: Environment variables for database and Keycloak.

### 3. Install Chart
```bash
cd suyasevai
helm install yakkai . -n yakkai --create-namespace
```

### 4. Upgrade Chart
```bash
helm upgrade yakkai . -n yakkai
```

### 5. Uninstall
```bash
helm uninstall yakkai -n yakkai
```

## 📁 Structure
- `suyasevai/templates/`: Kubernetes YAML templates (Deploys, Services, Ingress).
- `suyasevai/values/`: Specific value overrides for different environments (e.g., prod, dev).
- `suyasevai/Chart.yaml`: Chart metadata and versioning.

## 🛡️ Security
Ensure that sensitive secrets (like database passwords and Keycloak client secrets) are managed using Kubernetes Secrets or an external secret manager (Vault, AWS Secret Manager) and referenced in the `values.yaml`.
