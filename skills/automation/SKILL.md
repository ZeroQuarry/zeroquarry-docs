---
name: automation
description: Use when the user wants recurring or scheduled security scans, CI-based scanning (GitHub Actions), or scan results delivered into team tooling — Slack notifications, Jira/Linear/ServiceNow tickets, or email triage. Covers the schedule API and human-in-the-console integration setup.
---

# Recurring scans and integrations

Two halves with different ownership. Schedules are API-driven — you can
manage them directly. Integrations are configured in the ZeroQuarry
console because they involve third-party consents and secrets — you guide
the user and verify the outcome; you never click for them.

Before proposing any of it, check `get_account`: binary and remote
scans, auto-fix, and disclosure tracking are tier-gated, and a trial's
recurring schedule keeps spending run units after the trial walls the
account into read-only — surface that clock when recommending cadence.

## Scheduled (recurring) scans

A schedule attaches to a scan *lineage* — the original scan plus its
future re-scans. The scheduler pulls the repository, diffs against the
last run, and fires a re-scan only when git HEAD has moved; otherwise it
records a "skipped: nothing changed" fire. Every real fire consumes
security run units — agree the cadence with the user before creating
anything.

Prerequisite: a completed source scan to anchor the lineage.

- `GET /v1/scans/{scan_id}/schedule` — read the lineage's schedule.
- `PUT /v1/scans/{scan_id}/schedule` — create or replace. Body:
  `enabled` (boolean), `cadence` (`daily`, `weekly`, or `monthly`),
  `rescan_mode` (`update` or `update_diff` — `update_diff` re-scans only
  changed files), `hour` and `minute`, `tz` (IANA name, e.g.
  `America/Los_Angeles`), and per cadence: `day_of_week` (0=Sunday …
  6=Saturday, weekly only) or `day_of_month` (1–28, monthly only).
  Optional `recheck_findings` (boolean).
- `DELETE /v1/scans/{scan_id}/schedule` — clear the schedule entirely;
  `PUT` with `enabled: false` pauses it while keeping the settings.

Any scan id from the lineage works. Creating or changing a schedule
requires scan-launch permission on the project (a key scoped
`read` + `scans:write` suffices). After writing, read it back with GET
and confirm the effective schedule to the user. Endpoint details: the
`rest-api` skill. Scan basics: the `zeroquarry` entrypoint.

## CI scanning (GitHub Actions)

The console's Account → API keys page (owner/admin) mints an account
machine key and offers a prebuilt `zeroquarry.yml` workflow: add the key
as the `ZEROQUARRY_API_KEY` repository secret, commit the workflow, and
pushes plus a schedule trigger scan automatically (incremental delta by
default). From any other CI system, `POST /v1/scans` with a `zq_` key
scoped `read` + `scans:write` and `auto_delta: true` gives the same
incremental behavior. Prefer a scoped personal key where the CI system
can hold one — account machine keys act with the owner's full role.

## Delivery webhooks (server-side, autonomous)

Webhooks are the server-side delivery channel: whenever a scan reaches
a terminal state — completed, failed, or cancelled, including scheduled
fires nobody is watching — ZeroQuarry POSTs a signed JSON summary
(scan id, name, status, severity counts, report URL) to a registered
HTTPS endpoint. This is what keeps automation autonomous; for the
interactive case, posting to the user's own tools with locally-held
credentials (above) is still the lighter path.

- `list_webhooks` / `create_webhook` / `delete_webhook` manage
  registrations; `list_webhook_deliveries` is the debugging surface
  ("did the sink get the event? what did it answer?").
- **The signing secret is shown exactly once**, in the create response
  — tell the user to store it immediately; it is never displayed again.
  Deliveries carry `X-ZeroQuarry-Signature: sha256=HMAC(secret, body)`,
  `X-ZeroQuarry-Event` (scan.completed / scan.failed / scan.cancelled)
  and `X-ZeroQuarry-Delivery` headers.
- Delivery is **at-least-once, not guaranteed**: failures retry
  (~1m, 5m, 30m, 2h), then the delivery is marked exhausted in the log.
  Design receivers idempotent.
- The payload is a summary — enough to decide whether to fetch detail.
  Findings themselves are fetched deliberately, via `get_findings`.

## Team integrations (human in the console)

Slack notifications, Jira, ServiceNow, Linear, and email triage are
configured under Account → Integrations in the console
(`/account/integrations`, then each integration's page). Each page
collects what it needs — webhook URLs, API tokens, OAuth consents.
Those values are secrets: the user enters them in the console; they
never pass through chat or tool arguments.

Your part:

1. Recommend based on the user's actual stack. If their issue tracker is
   already Jira or Linear, deep-link mode needs no credentials — start
   there.
2. Walk them to the right page
   (`/account/integrations/slack`, `…/jira`, `…/servicenow`, `…/linear`,
   `…/email-triage`) and let them complete the consent/secret steps.
3. Verify the loop end-to-end afterwards: after the next scan completes,
   ask the user to confirm the notification or ticket landed, and check
   the scan's state yourself with `get_scan`.

## Ground rules

Never create a recurring schedule the user didn't ask for. Never
accept integration secrets in chat.
Only configure schedules and integrations for accounts the user
administers.
