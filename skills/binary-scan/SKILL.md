---
name: binary-scan
description: Use when the user asks to scan a binary artifact instead of a repository — scan the firmware file at ~/firmware.bin, check this APK for vulnerabilities, analyze the JAR or native library we ship before release. Covers the binary scan mode end to end — upload mechanics and size caps, artifact types, what a binary scan actually runs (deterministic dependency analysis plus agentic analysis of the extracted image), the REST multipart path for oversized artifacts, and reading the results.
---

# Binary artifact scans (APK, firmware, other binaries)

Binary mode scans a file you already have instead of a git repository —
the release artifact itself. Typical artifacts: Android apps (APK, AAB,
DEX), firmware images and filesystem dumps, JVM packages (JAR, WAR,
EAR), native libraries, installers, and archives. Commercial teams scan
release artifacts before shipping; embedded/IoT teams scan firmware
images; pentesters test a customer's APK or firmware on their behalf.
When the user wants the *source repository* reviewed rather than the
built artifact, that is a source scan — the `zeroquarry` entrypoint
skill covers it.

## Before you call create_scan

- **Check the license first.** Binary scans are tier-gated:
  `get_account` reports what the account licenses, and binary scans are
  on that list only when the plan includes them. A refusal like "not
  licensed for binary scans" at scan creation is a plan boundary — tell
  the user, do not try to work around it. Plans are managed at
  https://console.zeroquarry.com/account/billing
- **Check the project's profile.** A project's assessment profile can
  restrict its allowed scan modes; the error names the profile and what
  it allows — pick a different mode or project rather than retrying.
  `create_project` takes a `profile` that sets this for new projects.
- **Inspect the file before calling, not via error.** The consuming
  agent reads the artifact from disk and base64-encodes it, so confirm
  first that the path exists, is a real file, and is non-empty. A
  missing or empty file is a stop-and-tell-the-user moment: never
  invent, substitute, or pad artifact bytes — the upload IS the scan
  target, and a fabricated upload produces a thorough scan of nothing.
- **Pick the transfer path by size.** MCP uploads are capped at 10 MB
  per file and 20 MB total per call; anything larger rides the REST
  API's multipart path (below). Base64 tool arguments pass through the
  calling model's context window, so keep MCP uploads to artifacts that
  genuinely fit — a firmware image at the cap is already ~13 MB of
  base64 text.
- **Keep the file's true name.** The uploaded filename travels with the
  artifact and the extraction pipeline keys on the extension (below) —
  renaming `app.apk` to `app.bin` changes what tooling runs over it.

## Upload mechanics (MCP)

`create_scan` with `mode: binary` and `uploads` — a list of
`{filename, content_base64}` objects. `content_base64` is the standard
base64 of the file bytes; the caps apply to decoded bytes: 10 MB per
file, 20 MB total per call, at most 10 files ("At most 10 uploads per
scan over MCP" is the count error). Every upload problem — a missing
list, entries missing `filename` or `content_base64`, invalid base64, a
file or total over cap — comes back as a tool error before anything is
queued, and the oversize errors name the file, the cap, and the JSON
API multipart path as the way through. Fix the input and retry; nothing
was created.

- `artifact_type` is `mobile`, `firmware`, or `other` (default). It
  labels the artifact — mobile app, firmware, or package — on the scan
  and the project's asset list; it does not switch the pipeline. Set it
  to what the artifact really is.
- **Multi-artifact scans are one call.** An APK plus its bundled native
  library, or a firmware image plus its companion daemon, go in the
  same `uploads` list: each artifact becomes its own analysis workspace
  and the coordinator covers all of them. Keep the whole call within
  the caps; split into separate scans when it does not fit.
- Other inputs that apply: `project_id` / `project_name`, scan notes
  (the researcher's focus), and the `sca` toggle. The `infra` and
  `secrets` toggles are rejected here — those deterministic stages are
  source-scan stages. `git_urls` and `git_credential_id` are
  source-only and rejected too.
- Model selection: `model` overrides the scan/research model,
  `model_review` the triage stage, and `model_artifact` the
  PoC-generation stage — all validated against the models configured
  on your tier ("Select a valid configured LLM" otherwise). For binary
  scans `model_artifact` is the one that matters most: it is the model
  that authors the grounded proof-of-concepts.
- **Fresh dispatch only.** Binary scans are never deduplicated and have
  no delta fast path: every call is a new full assessment and consumes
  security run units. Delta re-scans and schedules are source-scan
  concepts — `auto_delta` on the REST API is git-only, and schedule
  lineages anchor on source scans — so "rescan the firmware" means
  another full binary scan.

## Oversized artifacts: the REST multipart path

Artifacts beyond the MCP caps ride `POST /v1/scans` as
multipart/form-data — `mode=binary`, the artifact files as repeated
`uploads` form fields, plus `artifact_type`. The per-file cap there is
200 MB, and an upload must not expand past ~2 GB uncompressed (split
larger archives). Unlike the MCP path, these bytes never pass through a
model. Authenticate with a `zq_` API key carrying `scans:write`; the
`rest-api` skill covers auth, conventions, and the spec-first endpoint
catalog.

## What a binary scan runs

1. **Extraction (deterministic).** The upload is stored and expanded:
   zip/tar archives unpack (member paths and sizes are validated),
   a strings dump of the original file is captured, Android
   packages (apk/jar/aar/dex/war/ear) are decompiled with jadx, .apk
   files are additionally decoded with apktool, and firmware-suffixed
   images (.bin/.img/.fw/.rom/.squashfs/.ubifs) are carved with
   binwalk.
2. **Deterministic dependency analysis.** Version carriers are parsed
   from the upload and the extracted tree — Maven coordinates
   (pom.properties, pom.xml, Gradle module metadata) and firmware
   package databases (dpkg status, Alpine apk installed-db) — and
   matched against osv.dev for known CVEs. The `sca` toggle applies to
   binary scans; when the stage is skipped or finds no pinned
   dependencies, the scan log says so. **Check before claiming
   coverage:** if the SCA stage did not run or found nothing to parse,
   the scan produced no dependency evidence — say that plainly instead
   of implying the platform checked dependencies.
3. **Agentic analysis.** A coordinator enumerates the analysis surfaces
   — manifests, permissions, endpoints, hard-coded secrets, crypto
   material, update/auth flows, parsers, native libraries — and
   dispatches parallel binary-analysis workers per component. Workers
   read decompiled output, strings dumps, and manifests with local
   tooling (decompilers, disassembly, shell utilities) and
   cross-reference bundled versions against CVE databases. **There is
   no network egress in this mode**: workers cannot reach the internet
   or probe hosts. Endpoints, third-party hosts, and upstream repo URLs
   discovered in the artifact are recorded into the project's asset
   records instead (when the project profile allows assets) — a
   follow-up remote scan can test them. Findings must cite checkable
   evidence — file paths and offsets, strings hits, decompiled code —
   and clean areas are recorded as non-issues, so the report shows what
   was checked as well as what failed.
4. **Triage and PoC artifacts.** Findings pass through triage; when the
   tier licenses artifact generation, each finding gets a grounded
   proof-of-concept, generated synchronously for binary scans so the
   PoC author can read the extracted image rather than invent protocol
   constants (even on tiers that otherwise force batch mode). Without
   that entitlement the stage is skipped and logged, and
   `get_poc_artifact` reports it unavailable.

The deterministic secrets stage is source-only; hard-coded secrets in a
binary surface through the agentic phase's enumeration instead (the
coordinator's checklist names secrets and crypto material explicitly).

## Reading results

The same loop as every mode: poll `get_scan` until `status` is
`completed` (`get_scan_logs` for live progress), then `get_findings`,
`get_finding` for one finding's evidence and remediation, `get_report`
for the full markdown report, and `cancel_scan` to stop a run. Binary
findings carry CVSS v3.1 base vectors — typically local-attack scope
(AV:L/AV:P) unless the vulnerable component is network-exposed — so
severity reads against local access unless reachability says otherwise.
Record verdicts with `record_finding_verdict` only after the user
confirms; the `security-review` skill covers triage and adjudication in
depth when the account serves it.

## Boundaries

- License and profile gates are real boundaries: relay the message,
  never route around. The same honesty applies to stage skip notes —
  report what the scan actually covered.
- Artifact integrity is non-negotiable: never fabricate, pad, or
  "repair" upload bytes to squeeze past a cap — use the multipart path
  or split the archive instead.
- Report severity and confidence faithfully, keep finding ids intact,
  and confirm scope with the user before spending run units — a binary
  scan re-run is always a full re-scan.
