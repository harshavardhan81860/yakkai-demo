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
# 1. Determine changed files
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
# 2. Counters & Variables
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

# BR Level Tracking
HIGHEST_BR="BR0"
BR_LEVEL_NUM=0
BR_DESCRIPTION="One request/session (Allowed within safety policy)"
PRODUCTION_ACTION="Allowed only within product safety policy"

# Helper function to assign higher BR level
update_br_level() {
    local level_str="$1"
    local level_num="$2"
    local desc="$3"
    local action="$4"

    if [ "$level_num" -gt "$BR_LEVEL_NUM" ]; then
        HIGHEST_BR="$level_str"
        BR_LEVEL_NUM="$level_num"
        BR_DESCRIPTION="$desc"
        PRODUCTION_ACTION="$action"
    fi
}

# --------------------------------------------------
# 3. Analyze files (Categories + VelAI BR Classification)
# --------------------------------------------------

while IFS= read -r FILE
do
    [[ -z "$FILE" ]] && continue

    echo "Analyzing: $FILE"

    # --- BR Level Classification ---

    # BR4: Global control plane, production configs, shared infra
    if [[ "$FILE" =~ ^(terraform/global/|helm/.*/templates/prod|global-config/|\.github/workflows/) ]]; then
        update_br_level "BR4" 4 "Multiple customers or enterprise control plane" "Block + incident response"

    # BR3: Database migrations, tenant schemas, multi-customer data paths
    elif [[ "$FILE" =~ ^(backend/db/migrations/|backend/app/schemas/|models/tenant|*migration*|*schema*) ]]; then
        update_br_level "BR3" 3 "One customer, tenant or market" "Block + incident review"

    # BR2: Non-production / staging environment changes
    elif [[ "$FILE" =~ ^(helm/yaakai/values/values-dev.yaml|helm/.*|staging/|config/dev) ]]; then
        update_br_level "BR2" 2 "One non-production environment" "Block production"

    # BR1: Isolated application code, services, unit test files
    elif [[ "$FILE" =~ ^(backend/app/|backend/tests/|backend/*) ]]; then
        update_br_level "BR1" 1 "One pod, agent or single reversible tool call" "Target ceiling"

    # BR0: Documentation, non-executable content
    else
        update_br_level "BR0" 0 "One request/session" "Allowed only within product safety policy"
    fi

    # --- Category Counters ---

    if [[ "$FILE" == backend/* ]]; then BACKEND_COUNT=$((BACKEND_COUNT + 1)); fi
    if [[ "$FILE" == helm/* ]]; then HELM_COUNT=$((HELM_COUNT + 1)); fi
    if [[ "$FILE" == .github/workflows/* ]]; then WORKFLOW_COUNT=$((WORKFLOW_COUNT + 1)); fi
    if [[ "$FILE" == terraform/* \vert{}\vert{} "$FILE" == infra/* || "$FILE" == infrastructure/* \vert{}\vert{} "$FILE" == *.tf ]]; then IAC_COUNT=$((IAC_COUNT + 1)); fi
    if [[ "$FILE" == */requirements.txt || "$FILE" == */requirements*.txt \vert{}\vert{} "$FILE" == */package.json || "$FILE" == */package-lock.json \vert{}\vert{} "$FILE" == */yarn.lock || "$FILE" == */pom.xml \vert{}\vert{} "$FILE" == */build.gradle* ]]; then DEPENDENCY_COUNT=$((DEPENDENCY_COUNT + 1)); fi
    if [[ "$FILE" == */tests/* \vert{}\vert{} "$FILE" == *.test.* || "$FILE" == *.spec.* \vert{}\vert{} "$FILE" == *_test.* ]]; then TEST_COUNT=$((TEST_COUNT + 1)); fi
    if [[ "$FILE" == *Dockerfile* || "$FILE" == docker-compose*.yml \vert{}\vert{} "$FILE" == docker-compose*.yaml ]]; then DOCKER_COUNT=$((DOCKER_COUNT + 1)); fi
    if [[ "$FILE" == *auth* \vert{}\vert{} "$FILE" == *authentication* || "$FILE" == *authorization* \vert{}\vert{} "$FILE" == *security* || "$FILE" == *oauth* \vert{}\vert{} "$FILE" == *jwt* ]]; then AUTH_COUNT=$((AUTH_COUNT + 1)); fi
    if [[ "$FILE" == *migration* || "$FILE" == *migrations* \vert{}\vert{} "$FILE" == *schema* || "$FILE" == *database* \vert{}\vert{} "$FILE" == *models* ]]; then DATABASE_COUNT=$((DATABASE_COUNT + 1)); fi
    if [[ "$FILE" == *ingress* \vert{}\vert{} "$FILE" == *network* || "$FILE" == *service.yaml \vert{}\vert{} "$FILE" == *service.yml ]]; then NETWORK_COUNT=$((NETWORK_COUNT + 1)); fi

done < "$CHANGED_FILE"

# Determine Legacy Impact Level
IMPACT="LOW"
REASON="Application-level change"

if [[ "$WORKFLOW_COUNT" -gt 0 || "$IAC_COUNT" -gt 0 \vert{}\vert{} "$AUTH_COUNT" -gt 0 || "$DATABASE_COUNT" -gt 0 \vert{}\vert{} "$NETWORK_COUNT" -gt 0 ]]; then
    IMPACT="HIGH"
    REASON="Security, infrastructure, authentication, database, network or CI/CD change"
elif [[ "$HELM_COUNT" -gt 0 \vert{}\vert{} "$DOCKER_COUNT" -gt 0 || "$DEPENDENCY_COUNT" -gt 0 \vert{}\vert{} "$BACKEND_COUNT" -gt 0 ]]; then
    IMPACT="MEDIUM"
    REASON="Deployment, container, backend, or dependency change"
fi

if [[ "$TOTAL_FILES" -ge 20 ]]; then
    IMPACT="HIGH"
    REASON="Large change affecting multiple files"
fi

# --------------------------------------------------
# 4. Export Variables for GitHub Actions
# --------------------------------------------------

if [[ -n "${GITHUB_ENV:-}" ]]; then
    echo "BR_LEVEL=${HIGHEST_BR}" >> "$GITHUB_ENV"
    echo "BR_NUM=${BR_LEVEL_NUM}" >> "$GITHUB_ENV"
    echo "BLAST_IMPACT=${IMPACT}" >> "$GITHUB_ENV"
fi

# --------------------------------------------------
# 5. Generate Report
# --------------------------------------------------

cat > "$REPORT_FILE" <<EOF
# Blast Radius Security Assessment Report

## Assessment Summary

- **Highest Blast Radius Level:** \`${HIGHEST_BR}\`
- **Maximum Affected Scope:** ${BR_DESCRIPTION}
- **Production Decision Policy:** ${PRODUCTION_ACTION}
- **Legacy Impact Level:** ${IMPACT} (${REASON})

## Commit Details

- **Base SHA:** ${BASE_SHA:-N/A}
- **Head SHA:** ${HEAD_SHA}
- **Total Changed Files:** ${TOTAL_FILES}

## VelAI Blast Radius Policy Reference

| Level | Maximum Affected Scope | Production Decision |
|---|---|---|
| **BR0** | One request/session | Allowed only within product safety policy |
| **BR1** | One pod, agent or single reversible tool call | Target ceiling |
| **BR2** | One non-production environment | Block production |
| **BR3** | One customer, tenant or market | Block + incident review |
| **BR4** | Multiple customers or enterprise control plane | Block + incident response |

## Change Categories Breakdown

| Category | File Count |
|---|---:|
| Backend | ${BACKEND_COUNT} |
| Helm/Kubernetes | ${HELM_COUNT} |
| GitHub Actions | ${WORKFLOW_COUNT} |
| Infrastructure as Code (IaC) | ${IAC_COUNT} |
| Dependencies | ${DEPENDENCY_COUNT} |
| Tests | ${TEST_COUNT} |
| Docker | ${DOCKER_COUNT} |
| Authentication/Security | ${AUTH_COUNT} |
| Database | ${DATABASE_COUNT} |
| Network | ${NETWORK_COUNT} |

## Changed Files List

\`\`\`text
$(cat "$CHANGED_FILE")
\`\`\`

EOF

# --------------------------------------------------
# 6. Console Summary Output
# --------------------------------------------------

echo
echo "============================================="
echo "           BLAST RADIUS RESULT"
echo "============================================="
echo
echo "Highest BR Level : $HIGHEST_BR (Level$BR_LEVEL_NUM)"
echo "Impact Level     : $IMPACT"
echo "Changed Files    : $TOTAL_FILES"
echo
echo "Backend          : $BACKEND_COUNT"
echo "Helm/K8s         : $HELM_COUNT"
echo "CI/CD            : $WORKFLOW_COUNT"
echo "IaC              : $IAC_COUNT"
echo "Dependencies     : $DEPENDENCY_COUNT"
echo "Tests            : $TEST_COUNT"
echo "Docker           : $DOCKER_COUNT"
echo "Auth/Security    : $AUTH_COUNT"
echo "Database         : $DATABASE_COUNT"
echo "Network          : $NETWORK_COUNT"
echo
echo "Report Written To:"
echo "$REPORT_FILE"
echo "============================================="
