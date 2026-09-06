# Capture docs screenshots from the production console as vera@zeroquarry.com.
# Auth comes from .auth/zeroquarry-prod.json (refresh with `npm run screenshots:auth`
# when the session expires).
#
# To refresh a subset:
#   ./update-screenshots.sh workspace,evidence-room
if [[ -n "${1:-}" ]]; then
  export ZEROQUARRY_SCREENSHOT_ONLY="$1"
fi
# Anchor IDs in the production docs account.
export ZEROQUARRY_DOCS_PROJECT_ID=6c4a2fe4-52da-462e-9bd9-5c5e66acfa63
export ZEROQUARRY_DOCS_SCAN_ID=5b65980d-d13d-42b2-baff-bbec2eaec198
export ZEROQUARRY_DOCS_FINDING_ID=a11a16b2-e79c-4906-b6b5-69cd25cdd166
export ZEROQUARRY_DOCS_ASSET_ID=f935bf0518e7442b9a5f6dad
export ZEROQUARRY_DOCS_DISCLOSURE_ID=fbef2c5b-df4c-4fd7-828d-7ed8901c929b
# Targets that need data not yet in the production docs account stay unset and
# are skipped automatically. Capture them once the data exists:
#   ZEROQUARRY_DOCS_RECHECK_SCAN_ID   — a scan with explicit re-check outcomes
#   ZEROQUARRY_DOCS_VERIFICATION_ID   — a verification test with recorded outcomes
#   ZEROQUARRY_DOCS_ENGAGEMENT_ID     — an attestation engagement
export ZEROQUARRY_DOCS_RECHECK_SCAN_ID="${ZEROQUARRY_DOCS_RECHECK_SCAN_ID:-}"
export ZEROQUARRY_DOCS_VERIFICATION_ID="${ZEROQUARRY_DOCS_VERIFICATION_ID:-}"
export ZEROQUARRY_DOCS_ENGAGEMENT_ID="${ZEROQUARRY_DOCS_ENGAGEMENT_ID:-}"
npm run screenshots
