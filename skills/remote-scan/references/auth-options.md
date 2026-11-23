# Authentication options for a remote scan

Deep guidance for authenticating a live-target scan. The `SKILL.md`
carries the workflow; this file carries the options and their edges.

## The one rule

**Credential values never enter the conversation.** Not in chat, not in
scan notes, not in tool arguments. You work with references to saved
identities, never the secrets behind them.

The reason is structural, not stylistic: argument bodies end up in
transcripts, scan logs, and model providers. Anything you type is
potentially already somewhere you cannot delete it.

## The options, in order of preference

### 1. A saved identity, attached by reference (preferred)

The user saves the credential in their own place — the console's project
Identity Library, or `zq creds add identity` from the companion CLI — and
hands you a reference id, never a value.

Attach it on the scan:

- `auth_identity_id` — the primary authenticated session.
- `identities` — additional roles. Each entry is an object with
  `identity_id` (required), plus optional `role` and `label`.
  `role` is `attacker`, `victim`, or `observer`; it defaults to
  `attacker`.

With no explicit primary attached, the first additional identity is
promoted to the primary session. At most **five** identities per scan,
counting the primary.

References are tenancy-checked: another account's or another project's
identity id is an error, not a silent skip. If the user hands you an id
that does not resolve, tell them — do not go looking for a substitute.

### 2. Brokered credentials on an engagement workspace

On an engagement workspace, a launch with no attached identity may pick
up the customer's own brokered credentials by reference. This is the
two-sided-marketplace case: the pentester drives a scan that
authenticates as the customer, and nobody on the pentester's side ever
sees a value.

If the scan authenticates and the user did not attach an identity, this
is the likely reason. Say so rather than implying the credential was
supplied some other way.

### 3. Credentials in the scan notes (last resort, and the user must choose it)

The notes field is the agents' brief, and it goes to the AI models
**verbatim**. When no structured credential is attached and the notes look
credential-bearing, ZeroQuarry attempts an assisted login using the
credentials found in the notes.

That pass is **remote-only** and it is **skipped whenever structured auth
is configured** — so attaching an identity also turns the notes login off.

Two things follow, and both matter:

- Notes are prompt-visible on **every** mode that briefs the agents, not
  just remote. A source or binary scan's notes reach the models too. No
  mode's notes are credential-safe.
- Because the notes are the model's brief, a credential in them leaves the
  platform to the model provider.

This is a deliberate trade: flexibility over the redaction boundary. It is
appropriate for a disposable test account whose password is not sensitive
anywhere else. It is not appropriate for anything you would mind seeing in
a transcript. **Recommend a saved identity** and let the user decide.

## Labels

An identity's `label` is the human description of the account ("test
admin", "low-privilege user"). Labels are visible across surfaces —
briefings, logs, reports, the audit trail — so keep them descriptive and
never sensitive. A label is not a place to put a username and password.

## What the surface rejects

Argument keys that carry credential material — headers, cookies, and
basic/form auth fields — are rejected outright on this surface. This is
not a transient error and retrying does not help: the value would end up
in the request body regardless.

If the user tries to pass a cookie or a bearer token directly, say that
this path does not take credential values and point at the saved-identity
route instead.

## Choosing between them

| Situation | Use |
| --- | --- |
| The credential matters, or is a real account | Saved identity, attached by reference. |
| The user wants a quick disposable test login | Notes, with the prompt-visibility trade stated out loud. |
| The scan runs against the customer's own environment | Brokered engagement credentials. |
| The user is unsure | Saved identity. It is the only option that keeps the value out of transcripts. |

## Authorization is separate from authentication

Authenticated does not mean authorized. A saved identity only says who
the scan acts as; the scope the scan may touch is a separate decision, set
at scan creation and enforced independently. Confirm both before
launching — an authorized target scanned with the wrong identity, or the
wrong scope, is still the wrong scan.
