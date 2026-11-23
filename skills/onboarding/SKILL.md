---
name: onboarding
description: Use when the ZeroQuarry account looks brand new (list_projects returns nothing) or the user asks to get started, set up ZeroQuarry, connect their repositories, or run their first scan. Walks connectivity, project and first-scan setup, tier limits and cost, and points at the right next steps (credentials, recurring scans, team delivery).
---

# Getting started with ZeroQuarry

ZeroQuarry just came online for this user — possibly created by their
very first sign-in. Your job: get them to a first useful result,
usually a completed scan with findings they can act on, and set up as
little else as possible until they ask for it.

## 1. Confirm what's here

- `list_scans` — an account with no scans yet is brand-new (every
  account gets a default project at signup, so an empty project list
  proves nothing). On a brand-new account, `get_started` returns the
  tailored first-scan plan. Don't inventory further; there is nothing
  to find yet.
- `get_account` — check the tier before promising anything: the OSS
  tier is public-repositories-only with a small monthly run allowance;
  a trial has 30 days and a wider license. Tell the user which one
  they're on and what it means (a trial becomes read-only at expiry;
  the OSS tier doesn't expire). If the user is an open-source
  maintainer on a trial and wants the OSS tier, the switch happens at
  signup on the website (`/register/open-source`) — not in-session.

## 2. First scan

1. Ask what they want checked (a repository URL is the usual answer)
   and which stages they care about. A sensible default: source scan
   with the SCA (`sca`), infrastructure-as-code (`infra`), and secrets
   (`secrets`) stages on.
2. Confirm scope before creating anything. New accounts have a bounded
   scan allotment — if `create_scan` is refused with an error result
   naming a plan or quota limit, that's a boundary to relay, never
   something to route around.
3. `create_scan` (all modes — source, binary uploads, authorized
   remote targets; see the entrypoint skill's Scan modes), then poll
   `get_scan` / `get_scan_logs`, then read `get_findings` and
   `get_report`. Report severity and confidence faithfully and
   reference finding IDs.

## 3. Offer the obvious next steps (don't do them unprompted)

- **Private repositories:** scan credentials are configured
  out-of-band. When a scan fails for lack of access, the error names
  the fix — [installing the ZeroQuarryBot GitHub App](https://github.com/apps/zeroquarrybot/installations/new)
  (a browser step the user does) is the preferred path; the user completes
  it, tells you, and you re-validate and retry. Users who prefer not to
  open the console run `zq creds add git` (or `zq creds add identity` for
  authenticated targets) from the [zq companion CLI](https://github.com/ZeroQuarry/zq):
  it uploads the secret from their terminal and prints only the reference
  id to hand back to you.
- **Recurring coverage:** the `automation` skill — schedules, CI
  scanning, delivery into Slack/Jira/Linear. For the interactive case
  you can post to their own tools with credentials they hold locally;
  never ask for those values in chat.
- **Dependency questions** ("is this package safe to add?"): the
  `slopsquatting` skill.

## 4. Where the numbers live

- Per-scan cost: `GET /v1/reports/{scan_id}/usage` (the `rest-api`
  skill) breaks down per-model/per-agent LLM usage and shows the
  account's run-unit entitlement.
- Plans and billing live in the ZeroQuarry console — when the trial is
  ending or the user asks about tiers, link them to
  [the console billing page](https://console.zeroquarry.com/account/billing)
  rather than improvising. When the trial ends the account winds down
  read-only; reports remain downloadable.
