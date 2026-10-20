#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---preflight}"
DESCRIPTION="${2:-Personal Tutoring update; tutoring overlay only}"
if [[ "$MODE" != "--preflight" && "$MODE" != "--publish" ]]; then
  printf 'Usage: bash release-personal-tutoring.sh [--preflight|--publish] [version description]\n' >&2
  exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../../../.." && pwd)"
SOURCE_DIR="$SCRIPT_DIR/backend"
PERSONAL_CLIENT="$REPO_ROOT/street-style-week/tutoring.js"
PROJECT_ID="1K4jBheCLSH7LWVbN96pb2_Mytz6ThQbrs18-HkhMDANBgG_uIfpqS2Os"
DEPLOYMENT_ID="AKfycbyT5Q9_nqThf7xQtZ89p0NWQr7e3L9NU6zTpL_A9UW0ysz_XnPyXB1ERCInhUQscbIFTA"
BRIDGE_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec?tutoring=1&channel=00000000-0000-4000-8000-000000000002"
OVERLAY_FILES=(TutoringHomework.js TutoringBridge.html Code.js)

for tool in node clasp jq curl rg; do
  command -v "$tool" >/dev/null || { printf 'Missing required tool: %s\n' "$tool" >&2; exit 1; }
done
[[ -f "$PERSONAL_CLIENT" ]] || { printf 'Personal Tutoring client is missing. Stop.\n' >&2; exit 1; }
rg -Fq "$DEPLOYMENT_ID" "$PERSONAL_CLIENT" || { printf 'Live Street Style client does not match the pinned Personal Tutoring deployment. Stop.\n' >&2; exit 1; }
for file in "${OVERLAY_FILES[@]}"; do
  [[ -f "$SOURCE_DIR/$file" ]] || { printf 'Local tutoring overlay is missing: %s\n' "$file" >&2; exit 1; }
done

printf 'Target: Personal Tutoring (Street Style / Grammar Snack)\n'
node --test "$SCRIPT_DIR/backend.test.cjs" "$SCRIPT_DIR/notifications.test.cjs" "$SCRIPT_DIR/reminders.test.cjs" "$SCRIPT_DIR/reminder-campaign.test.cjs"

WORK_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/personal-tutoring-release.XXXXXX")"
HEAD_DIR="$WORK_ROOT/head"
ACTIVE_DIR="$WORK_ROOT/active"
mkdir -p "$HEAD_DIR" "$ACTIVE_DIR"
printf 'Recoverable clone workspace: %s\n' "$WORK_ROOT"
trap 'status=$?; printf "Release backup preserved: %s\n" "$WORK_ROOT"; exit "$status"' EXIT

# Each clone stays in a fresh temporary directory; never let clasp write into this checkout.
(cd "$HEAD_DIR" && clasp clone "$PROJECT_ID")
[[ "$(jq -r '.scriptId' "$HEAD_DIR/.clasp.json")" == "$PROJECT_ID" ]] || { printf 'Cloned the wrong Apps Script project. Stop.\n' >&2; exit 1; }

DEPLOYMENTS="$(clasp deployments "$PROJECT_ID")"
DEPLOYMENT_LINE="$(printf '%s\n' "$DEPLOYMENTS" | rg -F "$DEPLOYMENT_ID @" || true)"
[[ -n "$DEPLOYMENT_LINE" ]] || { printf 'Pinned deployment is absent from the Personal Tutoring project. Stop.\n' >&2; exit 1; }
ACTIVE_VERSION="$(printf '%s\n' "$DEPLOYMENT_LINE" | sed -E 's/.* @([0-9]+) -.*/\1/')"
[[ "$ACTIVE_VERSION" =~ ^[0-9]+$ ]] || { printf 'Could not resolve the active Personal Tutoring version. Stop.\n' >&2; exit 1; }
(cd "$ACTIVE_DIR" && clasp clone "$PROJECT_ID" "$ACTIVE_VERSION")

inventory() { (cd "$1" && find . -maxdepth 1 -type f ! -name '.clasp.json' -exec basename {} \; | LC_ALL=C sort); }
HEAD_FILES="$(inventory "$HEAD_DIR")"
ACTIVE_FILES="$(inventory "$ACTIVE_DIR")"
[[ "$HEAD_FILES" == "$ACTIVE_FILES" ]] || { printf 'Apps Script file inventory differs between HEAD and active deployment. Stop.\n' >&2; exit 1; }
while IFS= read -r file; do
  [[ -n "$file" ]] || continue
  cmp -s "$HEAD_DIR/$file" "$ACTIVE_DIR/$file" || { printf 'Apps Script HEAD differs from live @%s in %s; refusing to overwrite.\n' "$ACTIVE_VERSION" "$file" >&2; exit 1; }
done <<< "$HEAD_FILES"

for file in "${OVERLAY_FILES[@]}"; do
  [[ -f "$HEAD_DIR/$file" && -f "$ACTIVE_DIR/$file" ]] || { printf 'Expected Personal Tutoring overlay is missing: %s\n' "$file" >&2; exit 1; }
  cp "$SOURCE_DIR/$file" "$HEAD_DIR/$file"
done
for file in $HEAD_FILES; do
  case " $file " in
    ' TutoringHomework.js '|' TutoringBridge.html '|' Code.js ') continue ;;
  esac
  cmp -s "$ACTIVE_DIR/$file" "$HEAD_DIR/$file" || { printf 'Non-tutoring Apps Script source would change: %s. Stop.\n' "$file" >&2; exit 1; }
done

if cmp -s "$ACTIVE_DIR/TutoringHomework.js" "$HEAD_DIR/TutoringHomework.js" && cmp -s "$ACTIVE_DIR/TutoringBridge.html" "$HEAD_DIR/TutoringBridge.html" && cmp -s "$ACTIVE_DIR/Code.js" "$HEAD_DIR/Code.js"; then
  printf 'No Personal Tutoring source changes to publish. Active deployment remains @%s.\n' "$ACTIVE_VERSION"
  exit 0
fi
printf 'Preflight passed: only Personal Tutoring overlay files differ from live @%s.\n' "$ACTIVE_VERSION"
if [[ "$MODE" == "--preflight" ]]; then
  printf 'Dry run complete: no Google changes made. Re-run with --publish to release this verified diff.\n'
  exit 0
fi

(cd "$HEAD_DIR" && clasp push)
VERSION_OUTPUT="$(cd "$HEAD_DIR" && clasp version "$DESCRIPTION")"
printf '%s\n' "$VERSION_OUTPUT"
NEW_VERSION="$(printf '%s\n' "$VERSION_OUTPUT" | sed -nE 's/^Created version ([0-9]+)$/\1/p')"
[[ "$NEW_VERSION" =~ ^[0-9]+$ ]] || { printf 'Could not read the created version number. Stop.\n' >&2; exit 1; }
(cd "$HEAD_DIR" && clasp deploy --deploymentId "$DEPLOYMENT_ID" --versionNumber "$NEW_VERSION" --description "$DESCRIPTION")
DEPLOYED="$(clasp deployments "$PROJECT_ID")"
printf '%s\n' "$DEPLOYED" | rg -F "$DEPLOYMENT_ID @$NEW_VERSION" >/dev/null || { printf 'Deployment read-back failed.\n' >&2; exit 1; }
PROBE="$(curl -fsSL "$BRIDGE_URL")"
[[ "$PROBE" == *tutoring-ready* ]] || { printf 'Bridge readiness marker is missing.\n' >&2; exit 1; }
printf 'Verified: Personal Tutoring deployment @%s returned tutoring-ready. No learner login or message was used.\n' "$NEW_VERSION"
