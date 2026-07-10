# log in as vera@zeroquarry.com
if [[ -n "${1:-}" ]]; then
  export ZEROQUARRY_SCREENSHOT_ONLY="$1"
fi
export ZEROQUARRY_DOCS_PROJECT_ID=6c4a2fe4-52da-462e-9bd9-5c5e66acfa63
export ZEROQUARRY_DOCS_SCAN_ID=5b65980d-d13d-42b2-baff-bbec2eaec198
export ZEROQUARRY_DOCS_FINDING_ID=a11a16b2-e79c-4906-b6b5-69cd25cdd166
npm run screenshots
