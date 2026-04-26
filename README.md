# ZeroQuarry Docs

Consumer documentation for ZeroQuarry, built with Docusaurus.

## Develop

```bash
npm install
npm run start
```

The `start` and `build` scripts copy the OpenAPI spec from the sibling
`security-bug-finder` checkout before generating the API reference into the
ignored `api/` directory.

When building outside `c:\Users\eskib\git-repos`, set one of:

```bash
ZEROQUARRY_OPENAPI_SPEC=/path/to/ZeroQuarry.spec.yml
ZEROQUARRY_APP_DIR=/path/to/security-bug-finder
```

## Build

```bash
npm run build
```

## Netlify

Use:

- Build command: `npm run build`
- Publish directory: `build`
