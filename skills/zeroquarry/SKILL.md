---
name: zeroquarry
description: Use whenever the user mentions ZeroQuarry or asks to run a security review, scan code, binaries, or remote targets for vulnerabilities, check dependencies for known CVEs or slopsquatting risk, set up recurring scans or team integrations, get secure-coding guidance for AI-written code, or connect an AI agent to ZeroQuarry. This is the ZeroQuarry skills pack entrypoint — it verifies the MCP connection, orients the agent, and routes to the right tool, skill, or workflow.
---

# ZeroQuarry security scanning

ZeroQuarry is an AI-native application security platform. You (the agent)
drive it through the MCP tools this server exposes: you launch scans, the
ZeroQuarry worker fleet runs deterministic analysis (SAST, SCA, IaC,
secrets) plus agentic scans to increase breadth and provide validation.
You read back the verified findings and reports.

## Before you start

- The ZeroQuarry MCP server must be configured in this agent's MCP client
  settings (server URL plus auth) — `zq setup` from the companion CLI
  registers it with supported clients. Two ways to authenticate; either way,
  the agent acts as a specific ZeroQuarry user with that user's live
  permissions:
  - **OAuth (preferred where the client supports it):** add the server
    URL and the client opens a browser sign-in — the user approves the
    connection once and the client holds a refreshable token. The 401
    challenge advertises the OAuth discovery metadata (RFC 9728), so
    URL-only clients find this path themselves.
  - **API key (headless agents and scripts):** a personal key minted from
    the user's profile page in the ZeroQuarry console (Settings → API keys).
    Tick the `mcp` scope so the server accepts the key at all, plus `read`
    to read scans and findings, plus `scans:write` to launch and cancel
    them. The scope cap narrows every permission check, not just the
    server's own scope gate: a key scoped to `mcp` alone gets past the gate
    and then gets "scan not found" on every read and "you don't have
    permission to launch scans" on every launch. Account-level machine keys
    also exist (Account → API keys, owner/admin) but act with the owner's
    full role — prefer a scoped personal key for agents.
- A 401 response means the key is missing or invalid; a 403
  `insufficient_scope` response means the key lacks the `mcp` scope —
  tell the user to mint a new key with that scope and update the client
  configuration. A tool result with `isError` and a permission message
  means the key has the `mcp` scope but is missing `read` or `scans:write`.
  Never ask the user to paste the key into chat; keys belong in client
  configuration.
- `list_projects` with no arguments is a cheap connectivity check. An
  empty result on a sign-in that just worked means a brand-new account
  (first sign-in creates one): the server then advertises the
  `get_started` tool — call it for the tailored first-scan plan. The
  `onboarding` skill walks the user through it when this account serves
  that skill (the skill list is the source of truth).
- `get_account` returns this account's tier, what it licenses (binary,
  remote, POC generation, auto-fix, disclosures), usage against the
  security-run cap, and the trial clock. Call it once per session:
  propose only what the tier licenses, and surface the trial clock
  before it walls the account into read-only.

## What you can do

| Goal | How |
| --- | --- |
| Security review of a codebase ("SAST"-like) | `create_scan` with `git_urls` (source mode), then poll and read results as below |
| Check a repo is cloneable before scanning | `check_repo_access` with `git_urls` — the access path covering each, and the exact next step for the user when one is missing |
| Analyze an APK, firmware image, or other artifact | `create_scan` with `mode: binary` and base64 `uploads` (see Scan modes) |
| Test a live target you are authorized to test ("DAST"-like) | `create_scan` with `mode: remote`, `url`, and `authorized: true` (see Scan modes) |
| Check scan progress | `get_scan`, `get_scan_logs` |
| Read results | `get_findings` (severity-ordered, with counts, each with its `human_state`), `get_finding` for one finding's evidence and remediation, `get_poc_artifact` for a proof-of-concept text |
| Work the verdicts | `record_finding_verdict` with the user's explicit confirmation — `validated` (accept), `disputed` (reject; reason required), `mitigated`, `accepted_risk`, `archived`; the console shows the same record |
| Full report | `get_report` (markdown; confidence floor, section subset) |
| Find prior work | `list_projects` / `get_project`, `list_scans`, `search`; `create_project` when a new project is needed |
| Check pinned dependencies for known vulnerabilities (free, instant) | `get_dependency_watch` — open advisories + KEV matches answered from the background sweep's cache; not tier-gated and consumes no security run units. The `outdated-dependencies` skill has the full read-and-fix flow when the account serves it |
| Stop a run | `cancel_scan` |

## Scan modes

`create_scan` takes a `mode`:

- **source** (default) — git URLs in `git_urls` (private repositories:
  see Repository and target access below). `path_scope` limits a
  monorepo scan to one subdirectory (one call per subdirectory).
- **binary** — `uploads`: a list of `{filename, content_base64}` artifact
  files (APK, JAR, firmware image, …). Caps: 10 MB per file, 20 MB total
  per call, at most 10 files — larger artifacts ride the REST API's
  multipart path (the `rest-api` skill covers this when the account
  serves it). `artifact_type` is
  `mobile`, `firmware`, or `other` (default). The `binary-scan` skill
  walks the full upload mechanics and what a binary scan runs when the
  account serves it.
- **remote** — an authorized live target: `url` plus `authorized: true`
  (you must be authorized to test it), optional `scope` host lines and
  `http_rate_limit_per_second`. Scope hosts are gated like the entry
  URL (account authorization, the project scan gate; at most 25,
  `*.domain` patterns must be bounded by a verified domain or
  engagement warrant) and the entry host is always crawled even when a
  scope is declared. Authenticated testing attaches saved
  scan identities only (`auth_identity_id`, or `identities` entries) —
  credential values are never accepted as tool arguments and must not
  enter the conversation either. The `remote-scan` skill walks the
  full intake (target type, scope, the authorization acknowledgement)
  when the account serves it.

Boundary conditions, all enforced server-side:

- **Tier gating.** Source, binary, and remote scans are each
  license-gated. A 403 such as "not licensed for binary/remote scans" is
  a plan boundary — tell the user; do not try to work around it. Users
  can manage their plans at https://console.zeroquarry.com/account/billing
- **Project profile.** A project's assessment profile restricts its
  allowed scan modes; the error names the profile and what it allows.
  Choose a different mode or project rather than retrying.
- **Authorization.** Remote targets must be covered by account domain
  verification or an engagement warrant, and URLs pass an SSRF guard.
  Only scan targets the user owns or is authorized to test; never help
  circumvent these checks.

## Repository and target access

Private repositories and authenticated remote targets are configured by
the user, out-of-band — your job is to check, point at the exact step,
and re-check. Credential values never enter the conversation, and
`check_repo_access` creates nothing. `check_repo_access` reports
`access: ready` for targets it verified from here and `access: unverified`
for ones it could not (unreachable, timed out, or the probe budget ran out)
— unverified is not failure: create the scan and let the scan itself
confirm.

- **Private repositories (ladder, in order of preference):** the
  [ZeroQuarryBot GitHub App install](https://github.com/apps/zeroquarrybot/installations/new)
  (a browser step the user does — keyless clones, no credential stored) →
  [SSH deploy keys](https://console.zeroquarry.com/account/integrations/git-private-repos) →
  [a saved read-only Git credential in the console](https://console.zeroquarry.com/).
  The no-console route to the last rung: `zq creds add git` from the
  [zq companion CLI](https://github.com/ZeroQuarry/zq) — the user pastes
  the secret to the CLI (hidden prompt, or a file they choose), it uploads
  over HTTPS, and prints the `git_credential_id` reference; the value
  never enters this conversation.
  When a scan fails pre-flight or `check_repo_access` reports a gap, the
  failure message names the step and carries the deep link: relay it to
  the user, wait for their "done", then re-run `check_repo_access` — call
  `create_scan` only once it passes.
- **Authenticated remote targets:** the user saves identities in the
  project's Identity Library in the console (Projects → project →
  Identities) or runs `zq creds add identity` from the terminal (same
  companion CLI); you reference them by id (`auth_identity_id`, or
  `identities` entries) and never see or request the values.

## Running a scan

1. Confirm scope with the user: what to scan, which mode, and whether
   the SCA (`sca`), infrastructure-as-code (`infra`), and secrets
   (`secrets`) stages should run. Scans consume the account's security
   run units; a capped-cost basic pass (`basic_pass`:
   `deterministic` at 1 run, `verified` at 2 — the `sast-basic` skill)
   is the cheap option when a full assessment is more than the
   question needs. `create_scan` dispatches fresh (an overlapping
   in-flight run dedups to the existing scan) — for a repository
   scanned before, the cheaper repeat scan is the REST API's delta
   dispatch (`auto_delta`) or a schedule; the `security-review` skill
   has that depth when the account serves it.
2. Call `create_scan` — it returns a `scan_id` immediately.
3. Poll `get_scan` until `status` is `completed` (or `failed` /
   `cancelled`); use `get_scan_logs` for live progress. If this client
   negotiated the MCP Tasks extension, `tasks/get` serves the same
   statuses and carries the final result inline at the terminal poll.
4. Read `get_findings`, then `get_report` for the full report. Report
   severity and remediation faithfully — never soften or inflate.

The `security-review` skill expands this workflow — access checks,
triage, verdicts, wrap-up — when the account serves it.

## Ground rules

- **Credentials never enter the conversation.** Never ask the user to
  paste passwords, tokens, cookies, or private keys into chat or tool
  arguments. Scan credentials are configured in the ZeroQuarry console or
  via the `zq` companion CLI (`zq creds add`); point the user there.
- **Authorization.** Only scan repositories and targets the user owns
  or is authorized to test. ZeroQuarry enforces authorization for
  remote targets; do not help circumvent it.
- **Findings are claims until verified.** ZeroQuarry findings carry
  evidence and confidence scores. Keep severity and confidence intact
  in summaries, and reference finding ids so the user can act on them.
- **Adjudication is the user's call.** Propose a verdict with your
  reasoning, record it with `record_finding_verdict` only after the
  user confirms, and never adjust one unprompted. The console shows
  the same record, so tell the user it's reversible there.

## Beyond this entrypoint

When a dedicated skill exists for the user's goal, prefer it over
improvising from the tools above. An account's skill policy curates
which skills it is served, so treat the table below as the pack's usual
contents, not a promise for this account: enumerate what is actually
served before loading — `skills/list` (or `list_skills` on an MCP client
without a native skills surface) lists every served skill with its
description and supporting files, and `load_skill` reads a skill's
SKILL.md by name — pass one of its advertised files as `file` to read a
supporting file (mapping tables, reference guides). An "unknown skill"
answer means this account does not serve that skill: pick another skill
or work from the tools, never route around the boundary.

| Skill | Use for |
| --- | --- |
| `onboarding` | Brand-new accounts and "get started" requests — first scan, tier limits, what to set up next |
| `security-review` | Full source-mode security review of a codebase — the scan-to-report workflow: access checks, polling, findings triage, verdicts, delta re-scans, the finished report |
| `sast-basic` | "Do a basic pass" — the cheap, capped-cost scan: deterministic detectors only (1 run) or the LLM-verified spine (2 runs); unverified-findings honesty |
| `remote-scan` | Guided intake for an authorized live-target ("DAST"-like) scan — target type and scope, the authorization acknowledgement, saved identities for authenticated testing |
| `rest-api` | REST-only capabilities — report exports (markdown/HTML/PDF), SBOM/VEX downloads, share links, patches and auto-fix PRs, disclosures, schedules, per-scan LLM usage, account-wide search — plus multipart binary uploads too large for MCP |
| `binary-scan` | Scanning a file rather than a repository — APK, firmware image, JAR, other binary artifact: upload caps, artifact types, what a binary scan runs, the multipart path for oversized artifacts |
| `slopsquatting` | "Is this dependency safe?", hallucinated-package checks, security reads on dependency updates |
| `outdated-dependencies` | Known-vulnerable pinned dependencies — the free advisory + KEV read, freshness framing, and the fix path (bump the pin, re-scan) |
| `automation` | Recurring/scheduled scans, CI scanning (GitHub Actions), Slack/Jira/Linear/ServiceNow/email-triage setup |
| `security-hygiene` | Secure-coding guidance for the code the agent itself writes — no scan needed |
