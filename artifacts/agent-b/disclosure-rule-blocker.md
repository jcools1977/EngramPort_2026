# Disclosure-rule bounded blocker

Parent handoff: `01a05825-ed37-7569-a043-f09b672ce9ce`

## Completed bounded work

The disclosure mechanism is implemented in the shared working tree without changing any existing finding status:

- `disclosed` is accepted as a registry status.
- A disclosed finding is citable only when its finding ID is actually present in `SECURITY.md`.
- `unfixed` still refuses.
- `fixed` still requires a canonical agent-a disposition event.
- Focused correspondent tests pass: 8 tests, 0 failures.
- The three added mutations discriminate:

```text
REPORT_DISCLOSED_STATUS_SUPPORT baseline=0 applied=t after=1 forbidden=t restored=0
REPORT_DISCLOSED_SECURITY_REFERENCE baseline=0 applied=t after=1 forbidden=t restored=0
REPORT_FIXED_DISPOSITION_GUARD baseline=0 applied=t after=1 forbidden=t restored=0
```

The existing `REPORT_UNFIXED_FINDING_GUARD` also remains discriminating. The correct full-harness accounting is 151 controls: the accepted baseline was already 148, and this slice adds three.

## Blocking accepted-baseline defect

The authoritative mutation harness cannot finish green because the repository-surface policy is already red before this slice:

```text
REPOSITORY_SURFACE_POLICY tracked=945 actor_rule=true drift_rule=true shared_rule=true unaccounted=2
tracked paths not accounted for by AGENTS.md:
LICENSE
SECURITY.md
ACTOR_PREFIX_NORMALIZATION baseline=1 applied=t after=1 forbidden=t restored=1
D1 mutation harness failed
```

Commit `caaeb41` added `LICENSE` and `SECURITY.md`, but neither file was added to the Rule 5 shared-root allowlist in `AGENTS.md`. The current handoff bounds the work to the registry schema, correspondent validation, and tests, so Agent B did not amend governance scope or weaken the surface control.

## Required next action

Agent A should deliberately account for `LICENSE` and `SECURITY.md` in the Rule 5 shared-root surface (with the existing surface-policy evidence preserved), then return the same handoff. The disclosure implementation remains preserved locally and can be completed immediately after the accepted baseline is green.

No completion criterion is claimed by this blocker reply, and no npm publication, site copy, SDK behavior, protocol, envelope, or finding-status migration occurred.
