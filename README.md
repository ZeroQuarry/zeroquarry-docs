# ZeroQuarry Docs

Consumer documentation for ZeroQuarry, built with Docusaurus.

## Develop

```bash
npm install
npm run start
```

The `start` and `build` scripts copy the OpenAPI spec from a sibling ZeroQuarry
product checkout before generating the API reference into the ignored `api/`
directory. The sync script recognizes `ZeroQuarry`, `zeroquarry`, and the older
`security-bug-finder` directory name.

When building outside the sibling-repository layout, set one of:

```bash
ZEROQUARRY_OPENAPI_SPEC=/path/to/ZeroQuarry.spec.yml
ZEROQUARRY_APP_DIR=/path/to/zeroquarry
```

## Build

```bash
npm run build
```

## Screenshots

Docs screenshots are generated from the production console with Playwright and
written to `static/img/screenshots/`.

Use a dedicated production docs account with public-safe demo data. The scripts
never store credentials; they use either a saved browser auth state or a session
cookie supplied by the environment. During capture, the helper removes the
sidebar tier label and replaces visible email addresses with
`example@example.com` by default.

First-time local setup:

```bash
npm install
npm run screenshots:install
npm run screenshots:auth
```

After signing in as the docs account, capture the current screenshot set:

```bash
npm run screenshots
```

CI can skip the interactive auth step by setting:

```bash
ZEROQUARRY_BASE_URL=https://console.zeroquarry.com
ZEROQUARRY_SESSION_COOKIE=...
```

Optional overrides:

- `ZEROQUARRY_AUTH_STATE`: saved Playwright storage state path
- `ZEROQUARRY_SCREENSHOT_DIR`: output directory
- `ZEROQUARRY_SCREENSHOT_HEADLESS=0`: show the browser during capture
- `ZEROQUARRY_SCREENSHOT_WIDTH` / `ZEROQUARRY_SCREENSHOT_HEIGHT`: viewport size
- `ZEROQUARRY_SCREENSHOT_EMAIL_REPLACEMENT`: replacement text for any visible
  email addresses
- `ZEROQUARRY_SCREENSHOT_REDACTIONS`: comma-separated text to replace with
  `[redacted]` before capture
- `ZEROQUARRY_SCREENSHOT_ONLY`: comma-separated target names when refreshing a
  subset, such as `evidence-room,scheduled-rescan,share-create`

Seeded screenshot targets that need stable production IDs can be supplied with:

- `ZEROQUARRY_DOCS_PROJECT_ID`
- `ZEROQUARRY_DOCS_SCAN_ID`
- `ZEROQUARRY_DOCS_FINDING_ID`
- `ZEROQUARRY_DOCS_DISCLOSURE_ID` (optional; otherwise the first disclosure in
  the public-safe docs account is used)

Targets that depend on one of those IDs are skipped automatically when the
environment variable is not set. Feature-specific account pages such as email
triage and ZeroQuarryBot are captured unconditionally; the dedicated docs
account should therefore use a tier that exposes the documented product
surface. A non-success response fails the run instead of saving an error page as
a screenshot.

The capture manifest also prepares interactive views when needed. For example,
the scheduled-rescan capture opens the report's re-run tab and expands the
scheduled path before taking the image.

Reference generated images from docs as `/img/screenshots/<name>.png`.

## Netlify

Use:

- Build command: `npm run build`
- Publish directory: `build`

Configure `GOOGLE_ANALYTICS_MEASUREMENT_ID`, `POSTHOG_PROJECT_API_KEY`,
`POSTHOG_PUBLIC_HOST`, and `POSTHOG_UI_HOST` in Netlify using the same values as
the marketing website and product. Analytics is loaded only after the shared
`zeroquarry.com` consent choice is accepted.
