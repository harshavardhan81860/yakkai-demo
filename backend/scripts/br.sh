#!/usr/bin/env bash

set -uo pipefail

# ============================================================
# YAKKAI BLAST RADIUS / CHANGE IMPACT ANALYSIS
# ============================================================

BASE_SHA="$(echo "${1:-}" | xargs)"
HEAD_SHA="$(echo "${2:-HEAD}" | xargs)"
REPORT_DIR="${3:-blast-radius-report}"

mkdir -p "$REPORT_DIR"

REPORT_FILE="$REPORT_DIR/blast-radius.md"
CHANGED_FILE="$REPORT_DIR/changed-files.txt"

echo "============================================="
echo "        YAKKAI BLAST RADIUS ANALYSIS"
echo "============================================="
echo

echo "Base SHA : ${BASE_SHA:-N/A}"
echo "Head SHA : $HEAD_SHA"
echo

# ============================================================
# 1. DETERMINE CHANGED FILES
# ============================================================

echo "============================================="
echo "Determining changed files..."
echo "============================================="

if [[ -n "$BASE_SHA" \
      && "$BASE_SHA" != "N/A" \
      && "$BASE_SHA" != "0000000000000000000000000000000000000000" ]]; then

    if git cat-file -e "${BASE_SHA}^{commit}" 2>/dev/null; then

        echo "Using Git range:"
        echo "$BASE_SHA -> $HEAD_SHA"
        echo

        if ! git diff --name-only "$BASE_SHA" "$HEAD_SHA" > "$CHANGED_FILE"; then
            echo "WARNING: Git diff failed."
            echo "Falling back to HEAD~1 -> HEAD"

            git diff --name-only HEAD~1 HEAD > "$CHANGED_FILE"
        fi

    else

        echo "WARNING: Base SHA not available locally."
        echo "Falling back to HEAD~1 -> HEAD"
        echo

        git diff --name-only HEAD~1 HEAD > "$CHANGED_FILE"
    fi

else

    echo "No valid base SHA supplied."
    echo "Using HEAD~1 -> HEAD"
    echo

    git diff --name-only HEAD~1 HEAD > "$CHANGED_FILE"
fi

echo "Changed files:"
echo "---------------------------------------------"

if [[ -s "$CHANGED_FILE" ]]; then
    cat "$CHANGED_FILE"
else
    echo "No changed files detected."
fi

echo
echo

# ============================================================
# 2. COUNTERS
# ============================================================

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

TOTAL_FILES=$(grep -c . "$CHANGED_FILE" 2>/dev/null || true)

# ============================================================
# 3. BLAST RADIUS LEVEL
# ============================================================

HIGHEST_BR="BR0"
BR_LEVEL_NUM=0

BR_DESCRIPTION="No significant application or infrastructure impact detected"

PRODUCTION_ACTION="Normal review"

update_br_level() {

    local level_str="$1"
    local level_num="$2"
    local desc="$3"
    local action="$4"

    if [[ "$level_num" -gt "$BR_LEVEL_NUM" ]]; then

        HIGHEST_BR="$level_str"
        BR_LEVEL_NUM="$level_num"
        BR_DESCRIPTION="$desc"
        PRODUCTION_ACTION="$action"

    fi
}

# ============================================================
# 4. ANALYZE CHANGED FILES
# ============================================================

echo "============================================="
echo "Analyzing changed files..."
echo "============================================="

while IFS= read -r FILE
do

    [[ -z "$FILE" ]] && continue

    echo "Analyzing: $FILE"

    # --------------------------------------------------------
    # BR LEVEL CLASSIFICATION
    # --------------------------------------------------------

    # BR4 - Broad / production / control-plane impact
    if [[ "$FILE" =~ ^terraform/global/ \
       || "$FILE" =~ ^global-config/ \
       || "$FILE" =~ ^\.github/workflows/ \
       || "$FILE" =~ ^helm/.*/templates/prod ]]; then

        update_br_level \
            "BR4" \
            4 \
            "Potential broad production, infrastructure or CI/CD impact" \
            "Require security review and production approval"

    # --------------------------------------------------------
    # BR3 - Customer / tenant / database impact
    # --------------------------------------------------------

    elif [[ "$FILE" =~ ^backend/db/migrations/ \
         || "$FILE" =~ ^backend/app/schemas/ \
         || "$FILE" =~ ^backend/.*/models/ \
         || "$FILE" =~ migration \
         || "$FILE" =~ schema ]]; then

        update_br_level \
            "BR3" \
            3 \
            "Potential database, tenant or application data impact" \
            "Require additional testing and deployment review"

    # --------------------------------------------------------
    # BR2 - Environment / deployment impact
    # --------------------------------------------------------

    elif [[ "$FILE" =~ ^helm/ \
         || "$FILE" =~ ^staging/ \
         || "$FILE" =~ ^config/dev \
         || "$FILE" =~ ^config/staging ]]; then

        update_br_level \
            "BR2" \
            2 \
            "Potential environment or deployment impact" \
            "Validate deployment before production"

    # --------------------------------------------------------
    # BR1 - Application / code impact
    # --------------------------------------------------------

    elif [[ "$FILE" =~ ^backend/ ]]; then

        update_br_level \
            "BR1" \
            1 \
            "Application-level change with limited scope" \
            "Run automated tests and standard review"

    # --------------------------------------------------------
    # BR0 - Low impact
    # --------------------------------------------------------

    else

        update_br_level \
            "BR0" \
            0 \
            "Low-impact change such as documentation or metadata" \
            "Normal review"

    fi

    # ========================================================
    # CATEGORY COUNTERS
    # ========================================================

    # Backend
    if [[ "$FILE" == backend/* ]]; then
        BACKEND_COUNT=$((BACKEND_COUNT + 1))
    fi

    # Helm
    if [[ "$FILE" == helm/* ]]; then
        HELM_COUNT=$((HELM_COUNT + 1))
    fi

    # GitHub Actions
    if [[ "$FILE" == .github/workflows/* ]]; then
        WORKFLOW_COUNT=$((WORKFLOW_COUNT + 1))
    fi

    # Terraform / IaC
    if [[ "$FILE" == terraform/* \
       || "$FILE" == infra/* \
       || "$FILE" == infrastructure/* \
       || "$FILE" == *.tf ]]; then

        IAC_COUNT=$((IAC_COUNT + 1))
    fi

    # Dependencies
    if [[ "$FILE" == requirements.txt \
       || "$FILE" == */requirements.txt \
       || "$FILE" == requirements*.txt \
       || "$FILE" == */requirements*.txt \
       || "$FILE" == package.json \
       || "$FILE" == */package.json \
       || "$FILE" == package-lock.json \
       || "$FILE" == */package-lock.json \
       || "$FILE" == yarn.lock \
       || "$FILE" == */yarn.lock \
       || "$FILE" == pom.xml \
       || "$FILE" == */pom.xml \
       || "$FILE" == build.gradle* \
       || "$FILE" == */build.gradle* ]]; then

        DEPENDENCY_COUNT=$((DEPENDENCY_COUNT + 1))
    fi

    # Tests
    if [[ "$FILE" == */tests/* \
       || "$FILE" == *.test.* \
       || "$FILE" == *.spec.* \
       || "$FILE" == *_test.* ]]; then

        TEST_COUNT=$((TEST_COUNT + 1))
    fi

    # Docker
    if [[ "$FILE" == *Dockerfile* \
       || "$FILE" == docker-compose*.yml \
       || "$FILE" == docker-compose*.yaml ]]; then

        DOCKER_COUNT=$((DOCKER_COUNT + 1))
    fi

    # Authentication / security
    if [[ "$FILE" == *auth* \
       || "$FILE" == *authentication* \
       || "$FILE" == *authorization* \
       || "$FILE" == *security* \
       || "$FILE" == *oauth* \
       || "$FILE" == *jwt* ]]; then

        AUTH_COUNT=$((AUTH_COUNT + 1))
    fi

    # Database
    if [[ "$FILE" == *migration* \
       || "$FILE" == *migrations* \
       || "$FILE" == *schema* \
       || "$FILE" == *database* \
       || "$FILE" == *models* ]]; then

        DATABASE_COUNT=$((DATABASE_COUNT + 1))
    fi

    # Network
    if [[ "$FILE" == *ingress* \
       || "$FILE" == *network* \
       || "$FILE" == *service.yaml \
       || "$FILE" == *service.yml ]]; then

        NETWORK_COUNT=$((NETWORK_COUNT + 1))
    fi

done < "$CHANGED_FILE"

# ============================================================
# 5. DETERMINE OVERALL IMPACT
# ============================================================

IMPACT="LOW"
REASON="Application-level or low-impact change"

# High-impact areas
if [[ "$WORKFLOW_COUNT" -gt 0 \
   || "$IAC_COUNT" -gt 0 \
   || "$AUTH_COUNT" -gt 0 \
   || "$DATABASE_COUNT" -gt 0 \
   || "$NETWORK_COUNT" -gt 0 ]]; then

    IMPACT="HIGH"
    REASON="Security-sensitive, infrastructure, authentication, database, network or CI/CD change"

# Medium-impact areas
elif [[ "$HELM_COUNT" -gt 0 \
     || "$DOCKER_COUNT" -gt 0 \
     || "$DEPENDENCY_COUNT" -gt 0 \
     || "$BACKEND_COUNT" -gt 0 ]]; then

    IMPACT="MEDIUM"
    REASON="Deployment, container, dependency or backend application change"
fi

# Large change
if [[ "$TOTAL_FILES" -ge 20 ]]; then

    IMPACT="HIGH"
    REASON="Large change affecting 20 or more files"

fi

# ============================================================
# 6. PRINT SUMMARY
# ============================================================

echo
echo "============================================="
echo "BLAST RADIUS SUMMARY"
echo "============================================="

echo "Highest BR Level       : $HIGHEST_BR"
echo "BR Numeric Level       : $BR_LEVEL_NUM"
echo "Blast Radius           : $BR_DESCRIPTION"
echo "Production Action      : $PRODUCTION_ACTION"
echo "Overall Impact         : $IMPACT"
echo "Impact Reason          : $REASON"
echo "Total Changed Files    : $TOTAL_FILES"

echo
echo "Category Counts:"
echo "---------------------------------------------"
echo "Backend                : $BACKEND_COUNT"
echo "Helm                   : $HELM_COUNT"
echo "GitHub Workflows       : $WORKFLOW_COUNT"
echo "IaC                    : $IAC_COUNT"
echo "Dependencies           : $DEPENDENCY_COUNT"
echo "Tests                  : $TEST_COUNT"
echo "Docker                 : $DOCKER_COUNT"
echo "Authentication/Security: $AUTH_COUNT"
echo "Database               : $DATABASE_COUNT"
echo "Network                : $NETWORK_COUNT"

echo
echo "============================================="

# ============================================================
# 7. EXPORT VARIABLES TO GITHUB ACTIONS
# ============================================================

if [[ -n "${GITHUB_ENV:-}" ]]; then

    echo "BR_LEVEL=${HIGHEST_BR}" >> "$GITHUB_ENV"
    echo "BR_NUM=${BR_LEVEL_NUM}" >> "$GITHUB_ENV"
    echo "BLAST_IMPACT=${IMPACT}" >> "$GITHUB_ENV"

fi

# ============================================================
# 8. GENERATE MARKDOWN REPORT
# ============================================================

cat > "$REPORT_FILE" <<EOF
# Blast Radius Security Assessment Report

## Assessment Summary

| Field | Result |
|---|---|
| Highest Blast Radius Level | \`${HIGHEST_BR}\` |
| BR Numeric Level | ${BR_LEVEL_NUM} |
| Maximum Affected Scope | ${BR_DESCRIPTION} |
| Production Action | ${PRODUCTION_ACTION} |
| Overall Impact | **${IMPACT}** |
| Impact Reason | ${REASON} |

## Commit Details

| Field | Value |
|---|---|
| Base SHA | ${BASE_SHA:-N/A} |
| Head SHA | ${HEAD_SHA} |
| Total Changed Files | ${TOTAL_FILES} |

## Category Analysis

| Category | Files |
|---|---:|
| Backend | ${BACKEND_COUNT} |
| Helm | ${HELM_COUNT} |
| GitHub Workflows | ${WORKFLOW_COUNT} |
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

## Interpretation

The blast-radius analysis estimates the potential scope of the
change based on the files modified in the commit range.

A HIGH impact classification does not by itself indicate a security
vulnerability. It indicates that additional validation, testing or
review may be appropriate.

EOF

echo
echo "Report generated:"
echo "$REPORT_FILE"
echo

echo "Blast radius analysis completed successfully."
