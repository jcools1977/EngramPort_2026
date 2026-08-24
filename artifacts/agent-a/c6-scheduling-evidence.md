# C6 requirement 2: scheduler evidence on a managed PostgreSQL target

Author: agent-a. Date: 2026-08-24.
Authorization basis: ADR 0022 (DeVere's authorization of Supabase as EngramPort's own project). Role exception recorded in F57. Closing trigger defined by ADR 0021.
Substrate: Supabase project `engramport-dev`, ref `shomnibpmqhupkrtieii`, organization `An2b`, region `us-east-1`, **PostgreSQL 17.6.1.155**, `pg_cron` 1.6.4.

ADR 0021 deferred C6's schedule half with a named trigger: *"it closes when a deployment target is chosen and its scheduler invokes the routine, evidenced against that target."* This artifact is that evidence.

## 1. The substrate is the migration chain, verified rather than asserted

All twenty migrations `0001` through `0020` were applied to `engramport-dev` through the Supabase MCP. The MCP accepts no file upload, so every statement passed through the agent's output, which introduces transcription risk. **That risk was discharged by measurement, not by care.**

A reference database was built locally from the same twenty files on `pgvector/pgvector:pg16` (**PostgreSQL 16.15**), and both databases were fingerprinted by an identical query covering columns and defaults, RLS enabled/forced flags, constraints, indexes, policies with their `USING` and `WITH CHECK` expressions, function bodies by `md5(prosrc)`, triggers, and the security-relevant grants. Objects owned by extensions are excluded by `pg_depend.deptype='e'`. Grant comparison is restricted to `engram_app` and `engram_maintenance`, which are never table owners, because the owning role differs between the two databases and would otherwise produce false differences.

| Section | Lines | Digest, both databases |
|---|---|---|
| COL | 182 | `30e2c3c3224e81b7cb7b4426f718cd62` |
| CON | 104 | `fb9209f2cb66241aa7640d0b970c6526` |
| FN | 22 | `580ce1ed22a6565ead79fe733267eb3f` |
| GRANT-COL | 4 | `ed14238d9dc6681733e3cd72db4e32a4` |
| GRANT-FN | 16 | `5261e2f65bbb8087b1943e57415e8252` |
| GRANT-TBL | 65 | `19f9a429ff356b0fe2f26998ae05e00f` |
| IDX | 44 | `f39ef031e60d7ef7e07c038882e6edf8` |
| POL | 32 | `1b8a575d116f27a0bb535c4bb1fc8b66` |
| PUBLIC-FN | 3 | `3ced10d3de98226c30b29d084e22ed53` |
| RLS | 22 | `ec451df67b44876624d654945b4b4d3b` |
| TRG | 5 | `f088def7fb60e143e9f65632fcedb7b5` |
| **TOTAL** | **499** | **`283aceb8b93038a480bed03a8586cf5d`** |

**The check found a real defect, which is the only reason it is worth citing.** The first comparison differed in the `FN` section: `validate_event_actor_delegation()` had body digest `a358785f…` on Supabase against `0ac0bc95…` locally. The cause was a two-line comment dropped during transcription. The logic was identical, so no behaviour differed, but the deviation from canonical source was real. It was restored verbatim and the section digest then matched. **A check that had only ever reported success would have proven nothing here; this one failed first.**

Two earlier apparent differences were artifacts of agent-a's own extraction and are recorded rather than hidden. The local `POL` digest was first computed by `grep` over `psql -At` output, which truncates policy expressions containing newlines; running the identical aggregate query inside both databases removed the asymmetry. A local line count of 513 against Supabase's 499 had the same cause: 14 continuation lines of multi-line policy expressions.

**One deliberate scope note.** An earlier attempt applied `0001`, `0019` and `0020` only, on agent-a's reasoning that the sweep touches one table. That reasoning was wrong and the database said so: `0019` failed on `founder_authorities.revoked_at`, added by `0003`. The full chain was then applied. **The failure is recorded because the scoping judgment, not the transcription, was the error.**

## 2. Positive: the scheduler tombstones expired authority with no application traffic

Fixture, all synthetic: tenant `aa000000-…-c6`, founder principal `aa000000-…-c8`, and delegation rows planted directly under the founder GUC so the `setup_session_founder` policy authorizes the insert.

```
SELECT cron.schedule('c6-sweep-expired-setup-sessions','15 seconds',
  $cmd$SELECT public.sweep_expired_setup_session_delegations();$cmd$);
```

| Row | `expires_at` | Result |
|---|---|---|
| `…e001` | 20:56:11Z, already expired | `terminal_state='expired'`, `terminal_at=21:56:44.092717Z` |
| `…e002` | 03:56:11Z next day, live | `terminal_state` NULL, never touched |

The job's own execution window was 21:56:44.091733Z to 21:56:44.094953Z. **The tombstone timestamp falls strictly inside it**, which binds the mutation to the scheduler rather than to any observation agent-a made. No application code ran against the database during the window; the only other statements were read-only `SELECT`s.

**Repeat safety, which ADR 0021 required.** Across three successive scheduled invocations at 21:56:44, 21:56:59 and 21:57:14, `…e001`'s `terminal_at` remained `21:56:44.092717Z` and `…e002` remained live. A later count reached 18 total runs with the tombstone still unmoved.

**One reported figure is explicitly not used as evidence.** `cron.job_run_details.return_message` reads `"1 row"` on every run, including runs that swept nothing. It reports that `SELECT sweep_…()` returned one result row, not that one delegation was swept. **It says the same thing whether the sweep did work or not, so it cannot carry the claim.** Repeat safety rests on the stability of `terminal_at`, which can distinguish the two.

## 3. Mutation 1: the sweep is what causes the tombstone

The sweep predicate was neutered with `AND false`, the schedule left running, and an already-expired row `…e003` planted.

- **3 successful scheduled invocations after planting; row not tombstoned.**
- Sweep restored verbatim, body digest re-verified as `7837937423bca53059792b4cb16bef13`, matching the local reference.
- `…e003` then tombstoned at 21:58:59.189046Z, inside a cron execution window.

## 4. Mutation 2: the scheduler is what invokes the sweep

Sweep intact, `cron.unschedule` applied, expired row `…e005` planted.

- **2 minutes 12 seconds elapsed, 0 scheduled jobs, 0 scheduler runs, row not tombstoned** while `expires_at < clock_timestamp()`.
- Job rescheduled; `…e005` tombstoned at 22:02:34.404160Z, inside a cron execution window.

**This is the mutation that discriminates C6 requirement 2 specifically.** Mutation 1 would still pass if the routine were merely callable; only mutation 2 separates *"the routine works when called"* from *"something calls it on a schedule"*, which is the requirement's actual content.

## 5. The discriminator was itself validated by a mistake

A first attempt at mutation 2 was contaminated: agent-a called `sweep_expired_setup_session_delegations()` inside the same query used to observe row `…e004`, tombstoning the row being measured, and read the result after only 15 seconds because a background wait had not completed. **Both errors are recorded rather than discarded.**

The contaminated row is retained because it validates the test. Evaluating whether each tombstone falls inside a scheduler execution window gives:

| Row | Tombstoned by | `stamp_inside_a_cron_run` |
|---|---|---|
| `…e001` | scheduler | true |
| `…e002` | never | false, no terminal timestamp |
| `…e003` | scheduler, after sweep restored | true |
| `…e004` | **agent-a, by hand** | **false** |
| `…e005` | scheduler, after rescheduling | true |

**The one row swept manually is the one row the check marks as not scheduler-caused.** The discriminator distinguishes a scheduled sweep from a manual one, and it did so on a case that was not planted to test it.

## 6. What this evidence does not establish

1. **It says nothing about the 83 accepted controls on PostgreSQL 17.6.** Those are tested on 16.15 and have never been run here. The fingerprint shows the *schema* is identical; it does not show the *controls* hold. **This artifact must never be cited as 17.6 coverage.**
2. **The scheduler ran as `postgres`, the function owner, not as `engram_maintenance`.** `engram_maintenance` is deliberately `NOLOGIN` so that no password exists anywhere, and `pg_cron` must connect as its job user. The sweep's behaviour under `engram_maintenance` is covered by the local grant controls, not by this run.
3. **`engramport-dev` is an evidence substrate, not a production deployment.** The platform is the chosen target; this project is not the production instance.
4. **Fixture rows were planted by direct `INSERT`, not through `create_setup_session_delegation`.** The creation path has its own accepted controls; what is under test here is the sweep and its schedule.
5. **A 15-second cadence is not a production cadence.** It was chosen for iteration speed. Cadence selection is a deployment decision.
6. **The job was unscheduled after evidence collection.** Leaving a standing mutating job on a shared dev project was not warranted once the proof was complete. The exact command is recorded above and is reproducible.

## 7. Disposition

**C6 requirement 2 CLOSES.** Both halves now hold: the mechanism was already proven and mutation-defended, and the schedule is now evidenced against a chosen deployment target whose scheduler invokes the routine with no application traffic, with two discriminating mutations and a validated discriminator. ADR 0021's named trigger is met.

**C17 does NOT close, and the reason is not scheduling.** F56 measured that all six durable functions appear **zero times anywhere in `packages/`**. The durable form has no production caller, so it cannot yet be what the system relies on. **C17 is now blocked solely on agent-b's in-flight convergence slice**, not on C6.

No accepted control changed. No migration was edited. `executed=` does not move: this slice added no mutation to the local harness.
