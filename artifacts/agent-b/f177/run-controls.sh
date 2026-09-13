#!/usr/bin/env bash
set -uo pipefail
export PATH=/opt/homebrew/opt/node@22/bin:$PATH
root_dir="$(pwd)"
node -v
source scripts/run-d1-mutation-harness
variant="$(mktemp -d /tmp/engramport-f177-XXXXXX)"
trap 'rm -rf "$variant"' EXIT
make_w1_1_oidc_durable_variant "$variant" cleanup || exit 1
run_case(){
  local label="$1" module_root="$2" delay="$3" test_file="$4" expected_rc="$5" expected_line="$6" out rc
  out="$(mktemp /tmp/f177-output-XXXXXX)"
  W1_1_OIDC_DURABLE_MODULE_ROOT="$module_root" W1_1_OIDC_DURABLE_CASE=cleanup W1_1_OIDC_CLEANUP_INSPECT_DELAY_MS="$delay" node --test "$test_file" >"$out" 2>&1
  rc=$?
  echo "$label exit=$rc"
  cat "$out"
  if [ "$rc" != "$expected_rc" ] || ! rg -F "$expected_line" "$out" >/dev/null; then rm -f "$out"; return 1; fi
  rm -f "$out"
}
# 2300 ms exceeds 1000 ms TTL + 1000 ms grace + 300 ms margin,
# and also exceeds the old control's 60 ms TTL + grace.
run_case old-delay "$root_dir" 2300 artifacts/agent-b/f177/old-delayed.test.mjs 1 'W1_1_OIDC_DURABLE cleanup scheduled=false claimed=204/false alarm=false' || exit 1
run_case new-delay "$root_dir" 2300 tests/workspace-oidc-durable.test.mjs 0 'W1_1_OIDC_DURABLE cleanup scheduled=fired-before-inspect claimed=204/false alarm=false' || exit 1
run_case mutant-delay "$variant" 2300 tests/workspace-oidc-durable.test.mjs 1 'W1_1_OIDC_DURABLE cleanup scheduled=fired-before-inspect claimed=204/true alarm=true' || exit 1
for i in {1..10}; do
  run_case "baseline-$i" "$root_dir" 0 tests/workspace-oidc-durable.test.mjs 0 'W1_1_OIDC_DURABLE cleanup scheduled=true claimed=204/false alarm=false' || exit 1
done
for i in {1..10}; do
  run_case "mutant-$i" "$variant" 0 tests/workspace-oidc-durable.test.mjs 1 'W1_1_OIDC_DURABLE cleanup scheduled=true claimed=204/true alarm=true' || exit 1
done
