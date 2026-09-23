#!/usr/bin/env bash

set -uo pipefail

BASE_SHA="${1:-}"
HEAD_SHA="${2:-HEAD}"

REPORT_DIR="${3:-blast-radius-report}"

mkdir -p "$REPORT_DIR"

REPORT_FILE="$REPORT_DIR/blast-radius.md"
CHANGED_FILE="$REPORT_DIR/changed-files.txt"

echo "============================================="
echo "        YAKKAI BLAST RADIUS ANALYSIS"
echo "============================================="

echo "Base SHA : ${BASE_SHA:-N/A}"
echo "Head SHA : $HEAD_SHA"
echo

# --------------------------------------------------
# Determine changed files
# --------------------------------------------------

if [[ -n "$BASE_SHA" && "$BASE_SHA" != "0000000000000000000000000000000000000000" ]]; then

    git diff --name-only "$BASE_SHA" "$HEAD_SHA" > "$CHANGED_FILE"

else

    git diff --name-only HEAD~1 "$HEAD_SHA" > "$CHANGED_FILE"

fi

echo "Changed files:"
cat "$CHANGED_FILE"
echo

# --------------------------------------------------
# Counters
# --------------------------------------------------

BACKEND_COUNT=0
HELM_COUNT=0
WORKFLOW_COUNT=0
IAC_COUNT=0
DEPENDENCY_COUNT=0
TEST_COUNT=0
DOCKER_COUNT=0
AUTH_COUNT=0
DATABASE_COUNT=0
NETWORK_COUNT=0

TOTAL_FILES=$(grep -c . "$CHANGED_FILE" || true)

# --------------------------------------------------
# Analyse files
# --------------------------------------------------

while IFS= read -r FILE
do

    [[ -z "$FILE" ]] && continue

    echo "Analyzing: $FILE"

    # Backend
    if [[ "$FILE" == backend/* ]]; then
        BACKEND_COUNT=$((BACKEND_COUNT + 1))
    fi

    # Helm / Kubernetes
    if [[ "$FILE" == helm/* ]]; then
        HELM_COUNT=$((HELM_COUNT + 1))
    fi

    # GitHub Actions / CI/CD
    if [[ "$FILE" == .github/workflows/* ]]; then
        WORKFLOW_COUNT=$((WORKFLOW_COUNT + 1))
    fi

    # Terraform / infrastructure
    if [[ "$FILE" == terraform/* ||
          "$FILE" == infra/* ||
          "$FILE" == infrastructure/* ||
          "$FILE" == *.tf ]]; then
        IAC_COUNT=$((IAC_COUNT + 1))
    fi

    # Dependencies
    if [[ "$FILE" == */requirements.txt ||
          "$FILE" == */requirements*.txt ||
          "$FILE" == */package.json ||
          "$FILE" == */package-lock.json ||
          "$FILE" == */yarn.lock ||
          "$FILE" == */pom.xml ||
          "$FILE" == */build.gradle* ]]; then
        DEPENDENCY_COUNT=$((DEPENDENCY_COUNT + 1))
    fi

    # Tests
    if [[ "$FILE" == */tests/* ||
          "$FILE" == *.test.* ||
          "$FILE" == *.spec.* ||
          "$FILE" == *_test.* ]]; then
        TEST_COUNT=$((TEST_COUNT + 1))
    fi

    # Docker
    if [[ "$FILE" == *Dockerfile* ||
          "$FILE" == docker-compose*.yml ||
          "$FILE" == docker-compose*.yaml ]]; then
        DOCKER_COUNT=$((DOCKER_COUNT + 1))
    fi

    # Authentication/security-sensitive areas
    if [[ "$FILE" == *auth* ||
          "$FILE" == *authentication* ||
          "$FILE" == *authorization* ||
          "$FILE" == *security* ||
          "$FILE" == *oauth* ||
          "$FILE" == *jwt* ]]; then
        AUTH_COUNT=$((AUTH_COUNT + 1))
    fi

    # Database
    if [[ "$FILE" == *migration* ||
          "$FILE" == *migrations* ||
          "$FILE" == *schema* ||
          "$FILE" == *database* ||
          "$FILE" == *models* ]]; then
        DATABASE_COUNT=$((DATABASE_COUNT + 1))
    fi

    # Network / ingress
    if [[ "$FILE" == *ingress* ||
          "$FILE" == *network* ||
          "$FILE" == *service.yaml ||
          "$FILE" == *service.yml ]]; then
        NETWORK_COUNT=$((NETWORK_COUNT + 1))
    fi

done < "$CHANGED_FILE"

# --------------------------------------------------
# Determine impact
# --------------------------------------------------

IMPACT="LOW"
REASON="Application-level change"

if [[ "$WORKFLOW_COUNT" -gt 0 ||
      "$IAC_COUNT" -gt 0 ||
      "$AUTH_COUNT" -gt 0 ||
      "$DATABASE_COUNT" -gt 0 ||
      "$NETWORK_COUNT" -gt 0 ]]; then

    IMPACT="HIGH"
    REASON="Security, infrastructure, authentication, database, network or CI/CD change"

elif [[ "$HELM_COUNT" -gt 0 ||
        "$DOCKER_COUNT" -gt 0 ||
        "$DEPENDENCY_COUNT" -gt 0 ]]; then

    IMPACT="MEDIUM"
    REASON="Deployment, container or dependency change"

elif [[ "$BACKEND_COUNT" -gt 0 ]]; then

    IMPACT="MEDIUM"
    REASON="Backend application change"

fi

# Large change
if [[ "$TOTAL_FILES" -ge 20 ]]; then
    IMPACT="HIGH"
    REASON="Large change affecting multiple files"
fi

# --------------------------------------------------
# Generate report
# --------------------------------------------------

cat > "$REPORT_FILE" <<EOF
# Yakkai Backend Blast Radius Report

## Commit Information

- Base SHA: ${BASE_SHA:-N/A}
- Head SHA: ${HEAD_SHA}
- Changed files: ${TOTAL_FILES}

## Impact

**${IMPACT}**

Reason:

${REASON}

## Change Categories

| Category | Files |
|---|---:|
| Backend | ${BACKEND_COUNT} |
| Helm/Kubernetes | ${HELM_COUNT} |
| GitHub Actions | ${WORKFLOW_COUNT} |
| IaC | ${IAC_COUNT} |
| Dependencies | ${DEPENDENCY_COUNT} |
| Tests | ${TEST_COUNT} |
| Docker | ${DOCKER_COUNT} |
| Authentication/Security | ${AUTH_COUNT} |
| Database | ${DATABASE_COUNT} |
| Network | ${NETWORK_COUNT} |

## Changed Files

\`\`\`text
$(cat "$CHANGED_FILE")
\`\`\`

## Potentially Affected Components

EOF

if [[ "$BACKEND_COUNT" -gt 0 ]]; then
    echo "- Backend application" >> "$REPORT_FILE"
fi

if [[ "$HELM_COUNT" -gt 0 ]]; then
    echo "- Kubernetes/Helm deployment" >> "$REPORT_FILE"
fi

if [[ "$WORKFLOW_COUNT" -gt 0 ]]; then
    echo "- GitHub Actions CI/CD pipeline" >> "$REPORT_FILE"
fi

if [[ "$IAC_COUNT" -gt 0 ]]; then
    echo "- Cloud infrastructure" >> "$REPORT_FILE"
fi

if [[ "$DEPENDENCY_COUNT" -gt 0 ]]; then
    echo "- Third-party dependencies / software supply chain" >> "$REPORT_FILE"
fi

if [[ "$AUTH_COUNT" -gt 0 ]]; then
    echo "- Authentication / authorization" >> "$REPORT_FILE"
fi

if [[ "$DATABASE_COUNT" -gt 0 ]]; then
    echo "- Database / data model" >> "$REPORT_FILE"
fi

if [[ "$NETWORK_COUNT" -gt 0 ]]; then
    echo "- Network / ingress / service exposure" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

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

EOF

# --------------------------------------------------
# Console summary
# --------------------------------------------------

echo
echo "============================================="
echo "           BLAST RADIUS RESULT"
echo "============================================="
echo
echo "Impact Level : $IMPACT"
echo "Changed Files: $TOTAL_FILES"
echo
echo "Backend      : $BACKEND_COUNT"
echo "Helm/K8s     : $HELM_COUNT"
echo "CI/CD        : $WORKFLOW_COUNT"
echo "IaC          : $IAC_COUNT"
echo "Dependencies : $DEPENDENCY_COUNT"
echo "Tests        : $TEST_COUNT"
echo "Docker       : $DOCKER_COUNT"
echo "Auth/Security: $AUTH_COUNT"
echo "Database     : $DATABASE_COUNT"
echo "Network      : $NETWORK_COUNT"
echo
echo "Report:"
echo "$REPORT_FILE"
echo
echo "============================================="
