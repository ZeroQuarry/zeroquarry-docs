---
name: remote-scan
description: Use when the user asks to test a live target — a website, a SaaS API, or an internal host — run a DAST-style or pentest-style assessment against a URL or host, scan a target they own or are authorized to test, or asks how remote-scan scope, target authorization, or authenticated testing works. Walks the guided intake (target type, scope, authorization acknowledgement) through launch and result read-back.
---

# Authorized live-target testing

Remote mode is ZeroQuarry's live-target ("DAST"-like) assessment: the
scan sends real HTTP probes — and, for host-only targets, paced port
sweeps — to a target the user owns or is authorized to test: a SaaS
API, a website, or infrastructure. The persona is an authorized
pentester on an engagement, or an organization testing its own
systems. Everything below is enforced server-side at launch; the
intake exists so you gather the right facts before launching, not
because launching is the hard part.

Start with `get_account`: remote scans are license-gated, and an
account without the remote-scan entitlement hits a plan boundary at
launch. Propose a remote scan only when the entitlement is present,
and relay a missing-entitlement refusal as the plan boundary it is
(plans are managed at https://console.zeroquarry.com/account/billing)
— never route around it.

## Step 1 — Classify the target

Ask what kind of target this is; the answer decides the launch shape:

- **A website or SaaS API** — a URL-mode scan anchored on the entry
  URL (`url`). The scan probes and crawls from that URL: scheme and
  host matter, and the one named service is what gets assessed.
- **"Everything on this host"** — a host-only scan (`target_host`): a
  bare hostname or IP literal, no scheme, port, or path. The scan
  sweeps the host's ports (paced TCP, plus an opt-in top-200 UDP
  sweep via `port_sweep_udp`, both rate-clamped with
  `port_sweep_rate_pps`) and assesses every service it finds.
  `target_host` is mutually exclusive with `url` and `scope` — a
  host:port value means the caller wanted URL mode. Because a sweep
  touches every port on the target, the posture is granted
  deliberately per account: vetted (general) accounts and
  private-runner executions pass as-is; opted-in self-serve accounts
  only for DNS hostnames under a domain they have verified; everyone
  else is refused until ZeroQuarry opts the account in. A refusal
  naming that opt-in is the boundary — relay how to request it, and
  offer the URL-mode fallback for the specific service in the
  meantime.
- **An internal or private-address host** — cloud workers refuse
  private-address targets outright (the SSRF guard below). Interior
  targets are testable only from one of the account's private runner
  pools — the customer's own enrolled runners, outbound-only HTTPS
  from inside their network. Select the pool with `execution_target`;
  the project's execution options decide what is allowed.

## Step 2 — Collect the target and scope

- The entry URL, or the bare host. Sanity-check what the user pasted:
  a host:port or a bare hostname for what is really a service test is
  a URL-mode target; only a genuine "all ports on this host" request
  is host-only.
- Optional `scope` — host lines (a list, or one newline/comma
  separated string) that widen the crawl surface beyond the entry
  host. The facts that matter:
  - At most 25 scope hosts per scan.
  - The scope is unioned with the entry host — the entry host is
    always crawled, and declaring a scope never restricts it. A scope
    WIDENS the crawl surface, which is exactly why each entry is
    gated.
  - Concrete hosts pass the same gates the entry URL passes (Step 3),
    plus the project's scan gate.
  - A `*.domain` pattern must be bounded: self-serve accounts may use
    one only when every host it can match sits under one of the
    account's verified domains, or under an engagement warrant
    covering the pattern's base domain. Unbounded patterns — a bare
    `*`, mid-pattern wildcards like `*.*.example.com`, character
    classes — are refused. Patterns match strict subdomains only:
    `*.stg.example.com` never crawls `stg.example.com` itself.
- Optional `http_rate_limit_per_second` — outbound requests per
  second. Default is the platform setting; explicit 0 means no
  throttling; junk or negative values fall back to the default (a
  typo must never become a rate amplifier); the ceiling is 100/s. On
  an authorized engagement the user often wants this slower, not
  faster — agree on it.
- Remote scans take no `git_urls`, `uploads`, `git_credential_id`,
  `sca`, `infra`, or `secrets` — those belong to the other modes (the
  `zeroquarry` entrypoint covers source and binary). Project
  selection, scan name, tags, and notes work as in every mode, and a
  project's assessment profile must allow the remote mode — a refusal
  naming the profile is a boundary, not a bug.

## Step 3 — The authorization acknowledgement

`authorized: true` is never passed silently. Before launching, state
the target back to the user and get an explicit confirmation that
they own it or are authorized to test it — ownership, an engagement
letter, or a customer mandate. If the user cannot point at
authorization, stop: do not launch, and do not look for a
configuration that would let you.

The platform then enforces its own ladder, and refusal text tells the
user exactly what to do — relay it, never work around it:

- **SSRF guard.** Targets must be public HTTP(S) endpoints: private
  ranges, cloud metadata, and non-HTTP schemes are refused outright,
  and every redirect hop is re-validated. A hostname that does not
  resolve also fails closed at launch ("Target URL not allowed") —
  re-check the spelling rather than treating it as an authorization
  problem.
- **Domain verification.** Self-serve accounts (the default) may scan
  only hosts under DNS domains they verify with a TXT record. The
  first refusal on a fresh domain issues the challenge and returns
  the exact record to publish; publish it, then relaunch once DNS has
  propagated. Literal IP addresses and internal hostnames are never
  self-serve targets — general remote-scanning authorization (a vetted
  pentest agreement) or private-runner execution is the path.
- **Engagement warrants.** A project attached to a customer
  engagement may scan the targets the customer's warrant covers — the
  customer's own authorization, audited on their account when used.
  For wildcard patterns the warrant must cover the pattern's base
  domain exactly.
- **Host-only posture.** On top of the above, a host-only launch
  passes only for general accounts, private-runner executions, or
  opted-in self-serve accounts scanning under a verified domain.

## Step 4 — Authenticated testing (saved identities, by reference)

Credentials are platform-attached; the agent never sees, requests, or
relays their values. When the user wants the scan to test as a
logged-in user:

1. The user saves identities in the console's project Identity
   Library (Projects → project → Identities) or runs `zq creds add
   identity` from the companion CLI. The secret stays in their
   terminal or the console; only a reference id comes back.
2. Attach by reference: `auth_identity_id` for the primary
   authenticated session, and/or `identities` entries for additional
   roles — each an object with `identity_id` (required) plus optional
   `role` and `label`; `role` is `attacker`, `victim`, or `observer`
   (default `attacker`). With no explicit primary attached, the first
   additional identity is promoted to the primary session. At most 5
   identities per scan including the primary. References are
   tenancy-checked — another account's or project's identity id is an
   error, not a silent skip.
3. Never put credential values in chat, notes, or tool arguments.
   Argument keys that carry credential material (headers, cookies,
   basic/form auth fields) are rejected outright on this surface
   because request bodies end up in transcripts, scan logs, and LLM
   providers. Identity `label`s are visible across surfaces —
   briefings, logs, reports, the audit trail — so keep them
   descriptive, never sensitive.
4. On engagement workspaces, a launch with no attached identity may
   pick up the customer's brokered credentials by reference — the
   two-sided-marketplace case where the pentester drives a scan that
   authenticates as the customer without ever seeing a value.

**Read `references/auth-options.md`** when you need the full option set:
saved identities attached by reference, brokered engagement credentials,
the notes-login exception and why it is the last resort, what the
surface rejects outright, and the table for choosing between them. It is
the depth behind this step; this step is the rule.

## Launch and read-back

Launch with one `create_scan` call: `mode: remote`, the target (`url`
or `target_host`), `authorized: true`, plus the scope, rate, and
identity parameters from the steps above. It returns a `scan_id`
immediately.

- Every remote dispatch is a fresh scan: there is no in-flight dedup
  for remote targets, so re-launching while one runs queues an
  overlapping second assessment that consumes run units. Poll
  `get_scan` / `get_scan_logs` instead of retrying; `cancel_scan` is
  the stop button.
- A remote scan reserves five security run units at launch (settlement
  prices one per completed pipeline stage), so confirm the scope with
  the user before launching. There is no delta fast path for remote
  targets: `auto_delta: true` dispatch and schedule `rescan_mode`
  re-scans are source-scan paths (the `rest-api` and `automation`
  skills).
- When the project already has a completed scan of the same entry
  host, the launch auto-attaches a recheck of that lineage's
  unresolved findings — mention it to the user, not a separate step.
- Poll until `status` is terminal, then read `get_findings` and
  `get_report`. Report severity and confidence faithfully, reference
  finding ids, and treat adjudication as the user's call —
  `record_finding_verdict` only after they confirm. The full scan
  workflow lives in the `zeroquarry` entrypoint; for findings triage
  depth beyond that, the `security-review` skill covers it when the
  account serves it.

## Ground rules

- `check_repo_access` is for git repositories (it asks whether
  ZeroQuarry can clone them). It has nothing to do with remote
  targets, and there is no clone pre-flight for a live target — the
  Step 3 gates are the pre-flight.
- Only scan targets the user owns or is authorized to test, and never
  help circumvent the authorization, SSRF, or scope gates — including
  by suggesting DNS records or scope entries whose only purpose is to
  pass a check the user has not earned.
- Credentials never enter the conversation. Keep every declared scope
  host inside what the user is actually authorized for.
