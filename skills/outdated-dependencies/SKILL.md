---
name: outdated-dependencies
description: Use when the user asks whether their pinned dependencies have known vulnerabilities — CVEs or advisories in manifests and lockfiles, actively-exploited (KEV) packages, "are any of my dependencies vulnerable?", "what version of X do we actually pin?" — or wants the fix path after an advisory lands. Covers the free dependency-watch read and how fixes clear advisories. For "is this package name real or hallucinated?", use the slopsquatting skill instead.
---

# Known-vulnerable pinned dependencies

Every completed scan feeds a control-plane registry of pinned packages
and runtime pins mined from the source tree. A daily background sweep
batch-matches every distinct pinned (ecosystem, name, version) tuple
against osv.dev, and a fast lane polls the CISA Known Exploited
Vulnerabilities catalog several times a day so actively-exploited
advisories surface within hours instead of waiting for the daily pass.
`get_dependency_watch` is the free read over that cache: it answers
"am I using a known-vulnerable pinned version?" instantly, without
launching anything.

## What the read is and is not

- **Is:** open advisories plus KEV matches for the pinned versions in
  the registry, with a freshness summary so you can frame how current
  the answer is.
- **Is not:** a staleness check. It does not answer "does a newer
  version exist?" — no latest-version sweep feeds it. Say
  "known-vulnerable" or "no known advisory"; never claim a dependency
  is up to date or outdated from this read alone.
- **Free:** not tier-gated, consumes no security run units. A
  brand-new account (no scans yet) has an empty registry — an empty
  result means "nothing scanned yet", not "nothing vulnerable".

## Running the check

- Account-wide: `get_dependency_watch` with no arguments.
- One project: `get_dependency_watch` with `project_id`. An unknown or
  unauthorized project reports "project not found" — that is tenant
  hiding, not a bug to retry around.

The response has three parts:

- **Summary** — counts computed over ALL open advisories, not just the
  returned page: tracked package and runtime-pin counts, the
  open-advisory and KEV-match totals, per-escalation-class and
  per-ecosystem breakdowns, and the freshness fields below.
- **Advisories** — ordered critical, then elevated, then standard,
  newest-discovered first within a class. Each carries the OSV id and
  CVE aliases, the package name and version with its manifest path, a
  severity label and escalation class, the KEV flag, the noise-gate
  evidence, and — for library advisories with a fixed version — the
  `fixed_version` plus a `remediation` string shaped like
  `Upgrade <ecosystem>:<name> from <current> to <fixed>`.
- **With `include_inventory: true`** — the pinned-package inventory:
  packages (ecosystem, name, version, manifest path, license,
  first/last seen) and runtime pins (component, version spec, source
  such as a Dockerfile or engines field). `ecosystem` filters
  case-insensitively and is inventory-only: passing it without
  `include_inventory` is an error. Runtime pins carry a precision —
  only exact-precision pins join the advisory sweep, so a range spec
  like `>=20.11` is inventoried but not matched.

`limit` truncates the advisory list (default 100, maximum 200); the
summary counts stay complete either way, so a truncated list still
reports honest totals. The inventory page caps at 200 rows over MCP;
when that is not enough, the REST endpoints serve the same read —
`GET /v1/dependency-watch` and `GET /v1/dependency-watch/inventory`,
the latter taking a `limit` up to 500 (the `rest-api` skill covers
auth and conventions).

## Framing the freshness

The answer is a cache read, and the summary says how fresh:

- `sweep_enabled` — whether the background sweep runs on this
  deployment at all. Without it, a null `last_sweep_at` means "not
  monitored", not "nothing found" — say so rather than implying a
  clean bill of health.
- `last_sweep_at` — the last successful daily pass. Packages enter the
  registry when a scan completes and are checked at the next pass, so
  pins newer than the watermark have not been checked yet.
- `last_sweep_error` — the last failed sweep attempt, null after a
  success. A transport outage leaves the watermark alone and retries
  on the next tick, so an error here means the current answer is
  aging; frame it that way.

KEV matches ride the fast lane: a newly published CISA KEV entry is
matched against the registry within hours and lands as a
critical-class advisory, so exploited-vulnerability news does not wait
for the daily pass.

## The fix path

**Library advisories:** the fix is a pin bump — change the manifest or
lockfile so the pinned version is `fixed_version`, then re-scan the
repository the advisory came from. A completed full-inventory scan
re-evaluates its lineage's open advisory events: the package absent →
resolved, and a validated finding or triaged non-issue covering the
advisory's CVEs → resolved as scan-covered. Two cautions:

- A diff-scoped re-scan (a schedule's `rescan_mode` of `update_diff`
  with a non-empty scope) only re-parses manifests under the changed
  files, so absence proves nothing there. Clearing an advisory wants a
  full-inventory re-scan.
- Over MCP, `create_scan` dispatches a fresh full scan only (in-flight
  dedup); delta re-scans ride the REST API's `auto_delta: true`
  dispatch or a schedule's `rescan_mode` — the `automation` skill
  covers schedules.

**Runtime advisories:** the `remediation` string is null for runtime
advisories (the Bitnami rows) — there is no manifest to textually
bump. The fix is rebuilding the image on the `fixed_version` runtime.

There is no automatic lockfile rewrite on this path: the bump happens
in the user's tree, by them or by you as an ordinary edit, and the
re-scan then proves it. Patch generation and auto-fix PRs are
scan-driven features, not part of the dependency-watch read — for
turning a finding into a patch or a PR, see the `rest-api` skill.

## Recurring coverage

The cache refreshes itself; monitoring is about acting on it:

- The console's Automation tab offers advisory emails (a daily digest;
  critical immediates are not opt-out) and a per-lineage auto-delta
  toggle that dispatches delta re-scans when new advisories land — the
  only place the platform itself initiates scan runs for advisories,
  opt-in per lineage and tier-gated. Its git pull is free control-plane
  work: a pull that shows the package was already bumped upstream
  resolves the advisory without spending a run.
- User-configured schedules (the `automation` skill) keep re-scanning
  a lineage on a cadence and are sovereign of that dispatcher.
- The read itself stays free either way: re-run `get_dependency_watch`
  whenever the user asks "anything new?" — it costs nothing.

## Boundaries

- **This skill answers version risk on names already in use.** The
  `slopsquatting` skill answers the different question — "is this
  package NAME real?" — before anything is installed. They compose:
  verify a new name against its authoritative registry (that skill's
  layer 1), then scan and read advisories here.
- **Suppressed and resolved advisories never surface.** The noise gate
  stores suppressed events for tuning but never alerts, and
  resolved or dismissed events drop out of the read. If an advisory
  the user remembers is missing, it was likely resolved by a later
  scan or suppressed — that is scope, not deletion of history.
- **Escalation class is computed, not a CVSS threshold** — KEV
  membership, RCE-class CWEs, and prior reachability evidence decide
  it. Treat critical-class as "eyes now", report the severity label
  and KEV status faithfully, and frame with the freshness fields
  rather than implying a real-time feed.
- The per-scan SBOM export (with VEX dispositions) is the
  full-fidelity software-composition artifact — the `rest-api` skill.
  For general dependency hygiene — pinning, lockfiles, provenance —
  the `security-hygiene` skill.
