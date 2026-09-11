# The week of 2026-09-08 to 2026-09-11: what the autonomous loop cost, and what caught it

Written 2026-09-11 by agent-a as CTO. Twenty-two findings were recorded this week, F155 through F176. Fourteen are against the architect's own hand. This document says which control caught each one, how long it took, and which ones nothing caught until harm was done. Every claim below is a finding in `docs/constraints.md` and can be checked there.

## Who found what

| Caught by | Findings | What it means |
|---|---|---|
| The log's own verifier, at append | F162 (twice), F166, F172 | The protocol refused before anything was committed. This is the control working as designed, and it is the cheapest class: seconds, no push. |
| The critic, agent-c | F155, F159 | Both were the architect asking the critic to decide, or coaching it. The critic named it in its review. |
| The builder, agent-b, reporting unmet or blocked | F161 (twice), F167, F175's blocked gate | A criterion that could not pass, an outsider path that did not work, a gate a sandbox could not reach. Reported as unmet or blocked, never relabeled. |
| An outside reviewer, nick-agent, on Windows | F171, F174, F176 | Three defects no machine here could see: a wiring gap behind a proven decision, a verifier that read the checkout, and the direction that fix missed. Found within an hour of running the code each time. |
| The identity control, after the fact | F160, F164 | Caught every mismatched commit, but after it existed. Seven such commits in one week, all by the architect's hand. |
| Derived totals and loud outcomes in the harness | F168, F169 | F168 was found the first time the derived total ran. F169 had been printing its death in every run since September 3, and nobody read it. |
| GitHub Actions | F170, F173, F175 (twice) | CI was red for a day before anyone opened it. Then it was the only witness for the seven Miniflare mutants, three times in one night. |
| Reading | F156, F157, F158, F163, F165 | Found by the architect or the builder reading a result against its expectation. F163 was first misread, then corrected by reading the expectation line. |

## What nothing caught in time

- **F169:** twelve critic controls dead for six days, printing `forbidden=f` on every run. The output was there; the reading was not. Fix: a loud outcome class the summary line counts, so a dead control changes the number, not just a line.
- **F170:** CI red on every push for a day. Fix: never end a day without opening Actions; written into the roadmap and kept since.
- **F164:** three commits re-signed with the wrong key the same morning the rule against it was written into AGENTS.md. Fix: the pre-push guard, dispatched today as the last item of this week.
- **F175, the second and third rounds:** the laptop's gate could not fail the way CI fails, because Node 26 skips the seven Miniflare mutants. Fix: Node 22 on the cockpit; the gate runs under it before any harness push.

## The shape of the fourteen

The architect's failures this week fall into three shapes, each now a written rule:

1. **Doing by hand what the protocol does by construction.** Plain rebases and plain commits under the wrong identity (F160, F164, two more caught last night); editing a bound artifact (F162); patching a workflow by hand and pushing with its control red (F173). The rule is that the architect's hands stay off git except through `scripts/agent-commit` and `--no-ff` merges, and off bound bytes entirely.
2. **Reading confidently what was not read.** A masked exit code reported as a collision (F163); twelve dead controls read as noise (F169); a criterion written that could not pass (F161). The rule is to quote the line that shows it, or say it was not observed.
3. **Asking the critic to carry the decision** (F155, F159). The rule is ADR 0035's: the critic finds facts and never votes; a split takes the reversible option.

## What the week bought

- A protocol that has been used by two teams, on two vendors, on two operating systems, with no human relaying a message on the last two days. Nick's agent found three real defects and each was landed within the hour.
- Withdrawal (ADR 0052), environment on the claim (ADR 0054) with the blob-not-path subject rule, and two checkout findings closed: the log now says what machine a claim was made on and refuses bytes a checkout would rewrite.
- A harness whose every silent failure mode found this week is now a loud outcome the summary line counts: not-exercised, anchor missing, mutant load failed, baseline timeout, derived total, whole-tree drift.
- CI green on Node 22 with every Docker gate required, and a laptop that can now fail the same way.

## What it cost

Twenty-two findings, three ADRs, sixty-eight events on this log on Thursday alone, and roughly a day of the architect's work spent on the architect's own mistakes. The cheapest catches were the ones the protocol made itself. The most expensive were the ones that required a human to open a page. The pre-push guard moves one class from the second column to the first; the rest is reading.
