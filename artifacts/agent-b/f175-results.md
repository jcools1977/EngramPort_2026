# F175 harness drift results

Handoff: 01a08d83-2982-7ec7-abb5-f65fa2ea4548, thread f175-harness-drift.
Actor: agent-b, Codex Builder.
Source: da907255dc8c04eb4e17b732423225bad55e2d59 plus this patch, branch agent-b/f175.
Environment: Darwin arm64, Node v26.5.0, Git worktree with a real node_modules copy. No Docker execution.

## Criteria

- one-variant-builder: satisfied. All 28 source variant builders use the same import-derived writer, `tests/helpers/d1-variant.mjs`. Copied graphs resolve against copied sources; detached variants resolve against original sources. Explicit overrides preserve the intentionally mutated credential boundary and event-extension graph. `npm run d1:controls:test` observed `executed=125 loaded=131 synthetic_rewritten=130 failures=0`, injecting a synthetic import into every copied ECMAScript module before running each builder mode. It also checks that no builder bypasses the common writer. The synthetic probe exposed the detached OIDC verifier's origin bug during development; the final run includes its fix.
- anchor-reanchored: satisfied. The actual `make_port_watch_variant` helper applies against current event-core.mjs. The real harness branch produced `PORT_WATCH_SHARED_ELIGIBILITY baseline=0 applied=t after=1 forbidden=t restored=0`. The mutation retains the correction exclusion and removes only the answered-work guard. No event-core.mjs or correspondent source was edited.
- docker-free-drift-control: satisfied for the harness's source variants and their anchors. The control discovers all builder functions and literal modes, invokes each on a disposable copy, records actual writes, and loads each emitted ECMAScript module. The package-manifest mutation also loads its selected entry point. Pre-fix observation: `executed=125 loaded=127 synthetic_rewritten=0 failures=8`, exit 1, naming all four correspondent modes with ERR_MODULE_NOT_FOUND for report-criteria.mjs, PORT_WATCH_SHARED_ELIGIBILITY with anchor not exact, and three stale version-1 anchors. After the fixes: `executed=125 loaded=131 synthetic_rewritten=0 failures=0`, exit 0. The negative control deliberately restores correspondent import loss and removes the Port Watch anchor; it observes five failures and rejects both defects. The normal control is imported by d1:controls:test. Database-only mutations have no temporary JavaScript variant; their execution remains in the blocked live gate.
- live-gate: blocked. The user states there is no Docker and directs agent-b to report this gate blocked. `npm run db:test` was not run. Agent-a must observe its completion on the dispatcher's machine. No live database, Cloudflare runtime, or full repository suite success is claimed.

## Completed commands and observations

1. `npm run proof:verify` before reading work: exit 0, verified 601 events across 126 threads and three actors. `npm run engram -- inbox --actor agent-b`: exit 0, listed exactly this handoff.
2. Read AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the entire handoff, schema result definition, the bound event `events/agent-b/20260910T223130Z_01a08d72-8e98-7d27-9e2b-a548fb1c892f.md`, and its artifact `artifacts/agent-b/f174-results.md`. `shasum -a 256 artifacts/agent-b/f174-results.md` matched `744bd40c4ed6d8acef2fcfcaec0a6fd345f98c98f98bc7fa43faead978347cd6`.
3. `git show HEAD:scripts/run-d1-mutation-harness > /tmp/f175-prefix-harness.bash`, then `node tests/d1-variant-drift.mjs /tmp/f175-prefix-harness.bash`: exit 1, eight expected pre-fix failures. Baseline harness SHA-256: `c2b7372898b48b855a3235bf2dffcd6f851908fb6e82ea63f9336681ae7fa455`.
4. `node tests/d1-variant-drift.mjs`: exit 0, 125 source variant cases and 131 module loads. The control builds the SDK prerequisite with Vite only in a temporary tree. YAML and TSX changes have their real builder anchors checked, without being imported as JavaScript. An explicit loader provides empty DurableObject and RpcTarget classes for Cloudflare module graph loading. It does not test runtime behavior.
5. `npm run d1:controls:test`: exit 0, 23 passed, zero failed, zero skipped. Includes synthetic import coverage and `D1_DRIFT_NEGATIVE executed=125 failures=5 correspondent-load=detected port-watch-anchor=detected`. The suite's earlier development attempt failed a partial-fixture helper lookup; the final completed run passes after giving that fixture the explicit real-checkout helper path.
6. Two Docker-free selections through the actual `d1_run_mutations` function: four correspondent mutations plus shared Port Watch eligibility, then five version-1 mutations. Each selection: exit 0, `executed=5 not_exercised=0 negative_control=0 expected_total=5`; every outcome was `baseline=0 applied=t after=1 forbidden=t restored=0`. The five version-1 checks include behavioral confirmation of the three additional re-anchored sites.
7. `npm run lint`: exit 0. `node --test tests/repository-surface-policy.test.mjs`: exit 0, four passed, zero skipped. `bash -n scripts/run-d1-mutation-harness` and `git diff --check`: exit 0.
8. `npm run proof:verify` immediately before preparing the completion: exit 0, 601 events across 126 threads and three actors. Post-append verification and commit disposition are reported separately to avoid changing this artifact after publication.

The selected real branch commands used this shell body after sourcing `scripts/run-d1-mutation-harness`:

```bash
root_dir="$PWD"
mutation_dir=$(mktemp -d)
trap 'rm -rf "$mutation_dir"' EXIT
d1_load_definitions "$root_dir"
selected=()
for line in "${MUTATIONS[@]}"; do
  case "$line" in
    REPORT_*|EVENT_V1_*|PORT_WATCH_SHARED_ELIGIBILITY\|*) selected+=("$line");;
  esac
done
MUTATIONS=("${selected[@]}")
d1_accounting_init
d1_run_mutations
d1_summary
```

The second command replaced the case selector with `V1_*`. The first selector's `EVENT_V1_*` matches no definition name; the second explicitly selects those five actual `V1_*` names. No execution is inferred from a selector alone.

## Transcript digests

Verified with `shasum -a 256`:

```
1020474ddd3f0ba1735433c48a43b8b54cf48ff582b3f4a14c63bdefface0251  artifacts/agent-b/f175-before.log
80920b053360adcb9444314e6babce3f85aeb8cd561ac6a9e06cfc2994c58f3a  artifacts/agent-b/f175-after.log
1ed8162a5576952d3c9e73d27b837734d990277de28a67be9e090f2241ce2b1a  artifacts/agent-b/f175-controls.log
8994dfda3afee4299a155c05363dbe332df90f309016ff1948e9ea9cbaab59dc  artifacts/agent-b/f175-focused-mutations.log
6d247cc72648963a68e0e2b4267e3b644d90b8b88801f03389ec06381ba7b691  artifacts/agent-b/f175-v1-mutations.log
93fb983433b50c97a2ab1ae90c288801583c629e15303d29376a4a5a1ae035a7  artifacts/agent-b/f175-lint.log
fda42b5cfffb802392b5d085ce5243e47bbb91a3d0265ddbc15ffb2dec104fcc  artifacts/agent-b/f175-policy.log
```
