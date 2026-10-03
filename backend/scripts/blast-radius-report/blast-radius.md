# Yakkai Backend Blast Radius Report

## Commit Information

- Base SHA: N/A
- Head SHA: HEAD
- Changed files: 1

## Impact

**MEDIUM**

Reason:

Deployment, container or dependency change

## Change Categories

| Category | Files |
|---|---:|
| Backend | 0 |
| Helm/Kubernetes | 1 |
| GitHub Actions | 0 |
| IaC | 0 |
| Dependencies | 0 |
| Tests | 0 |
| Docker | 0 |
| Authentication/Security | 0 |
| Database | 0 |
| Network | 0 |

## Changed Files

```text
helm/yaakai/templates/backend-deployment.yaml
```

## Potentially Affected Components

- Kubernetes/Helm deployment

## Validation Recommendation

The blast-radius result is an impact indicator, not a correctness verdict.

Additional validation should be performed for changes affecting:

- CI/CD
- Authentication
- Infrastructure
- Database
- Network exposure
- Dependencies
- Kubernetes deployment configuration

