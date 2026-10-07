# Blast Radius Security Assessment Report

## Assessment Summary

| Field | Result |
|---|---|
| Highest Blast Radius Level | `BR1` |
| BR Numeric Level | 1 |
| Maximum Affected Scope | Application-level change with limited scope |
| Production Action | Run automated tests and standard review |
| Overall Impact | **MEDIUM** |
| Impact Reason | Deployment, container, dependency or backend application change |

## Commit Details

| Field | Value |
|---|---|
| Base SHA | N/A |
| Head SHA | HEAD |
| Total Changed Files | 2 |

## Category Analysis

| Category | Files |
|---|---:|
| Backend | 2 |
| Helm | 0 |
| GitHub Workflows | 0 |
| IaC | 0 |
| Dependencies | 0 |
| Tests | 0 |
| Docker | 0 |
| Authentication/Security | 0 |
| Database | 0 |
| Network | 0 |

## Changed Files

```text
backend/scripts/blast-radius-report/changed-files.txt
backend/scripts/br.sh
```

## Interpretation

The blast-radius analysis estimates the potential scope of the
change based on the files modified in the commit range.

A HIGH impact classification does not by itself indicate a security
vulnerability. It indicates that additional validation, testing or
review may be appropriate.

