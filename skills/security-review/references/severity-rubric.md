# Severity, confidence, and finding states

Deep guidance for reading a scan's findings. The `SKILL.md` carries the
rules; this file carries the vocabulary and the judgement calls.

## Severity vocabulary

Five levels, in order:

| Severity | Score | The label means |
| --- | --- | --- |
| `critical` | 9.5 | Exploitable with severe impact, in a path the product actually exposes. |
| `high` | 7.5 | Serious impact, with a plausible path to it. |
| `medium` | 5.0 | Real but conditional — needs a precondition, or limited impact. |
| `low` | 2.5 | Minor impact, or a defence-in-depth gap. |
| `info` | 0.5 | Worth knowing, not a vulnerability. |

`severity_score` is the numeric backing, and it is the ordering used when a
result set is sorted. When the finding carries a CVSS vector that parses,
the score and the label both come from the vector — a vector beats a
label the agent supplied. Where there is no vector, the score above is the
default.

**Report the platform's assessment faithfully.** Never soften a severity to
spare the user, never inflate one to look useful, and never recompute it.
If you believe the platform got it wrong, say so as a separate
observation with your reasoning — and leave the recorded severity alone.

## Confidence

`confidence_score` is 0–1 and frames how sure the platform is that the
finding is real and reachable. It is not a severity and does not modify
one. Two findings at the same severity can have very different confidence,
and a high-severity low-confidence finding is the combination that most
often turns out to be noise.

Use it in prose — "high confidence", "the platform flagged this as
low-confidence" — rather than re-scoring anything. **Never drop a finding
from a summary because its confidence looks weak.** Say the confidence and
let the user decide.

## Human states

A finding's `human_state` is the recorded adjudication, shared with the
console. It is append-only history, not a mutable label.

| State | Label | What it means |
| --- | --- | --- |
| `candidate` | Candidate | Proposed by the platform, not yet adjudicated. |
| `needs_validation` | Needs Validation | Explicitly reopened for a human decision. |
| `validated` | Validated | A human confirmed it. |
| `disputed` | Disputed | A human rejected it. Requires a reason. |
| `mitigated` | Mitigated | Fixed. |
| `retested` | Retested | Checked after a fix. |
| `regression` | Regression | It came back. Requires a reason. |
| `accepted_risk` | Accepted Risk | Known and knowingly kept. Requires a reason. |
| `archived` | Archived | Not worth tracking. Requires a reason. |

**Check `human_state` before re-litigating.** A finding already `validated`,
`disputed`, or `mitigated` has been decided by a person — build on that
state rather than reopening it unprompted. `candidate` and
`needs_validation` are the states a person can explicitly reopen.

The four states that require a reason (`disputed`, `regression`,
`accepted_risk`, `archived`) will not record without one. For `disputed`
the reason code is one of `bad_evidence`, `duplicate`,
`environment_mismatch`, `fixed_or_mitigated`, `intended_behavior`,
`not_exploitable`, `not_reachable`, `out_of_scope`, `other` — pick the one
that actually describes why, not the nearest one.

## Retest outcomes

When a retest or verification runs against a baseline, each finding gets
one of: **Fixed**, **Partially fixed**, **Remaining**, **Unable to
verify**, **Accepted risk**, or **Pending review**.

A retest that could not run says why, and the reason is not the same as a
negative result: `session_expired`, `credentials_invalid`, and
`target_unreachable` all mean the check did not happen. **Never report an
unrun retest as "not fixed."** The difference between "still there" and
"could not look" is the difference between a finding and a false alarm.

## Withdrawn findings

A finding can be withdrawn after review. The reason is on the finding, and
it belongs in the report: `remote_re_probe` (a re-probe contradicted it),
`rerun_flip` (a re-run reached the opposite conclusion),
`conceded_vendor_rejected`, and `conceded_insufficient_evidence`.

A withdrawn finding is not a finding the user has to fix. Say that it was
withdrawn and why. Do not quietly drop it, and do not count it in the
severity totals you report.

## Export defaults

`get_report` is deliberately quieter than raw `get_findings`:

- rejected findings are excluded,
- unproven fail-open conclusions are excluded,
- findings below the account's low-confidence threshold are excluded.

`min_confidence`, `include_rejected`, and `include_unproven_fail_open`
widen it when the user asks. **When the export and `get_findings`
disagree, say so** — the export is the artifact a reader will treat as
the deliverable, and an unexplained gap between the two reads as an
error.

## For compliance and customer mandates

The common clause is "fix medium-or-higher within N days". The severity
counts are what the auditor cares about, so surface them plainly:

- report the count per severity, not just a total,
- state which findings are medium-or-higher,
- and let the user set the remediation order — the severity ordering is a
  default, not a decision you make for them.
