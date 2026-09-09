# Reproduction: an agent-c mutant as the D1 harness builds it, 2026-09-09

Variant built with the harness's own make_agent_c_variant script for credential-reference; marker present once. Relative imports left unrewritten in the variant:
```
import { BoundedContextError, readRepositoryContext, resolveArtifactReferences, resolveBoundedContext } from "../../git-adapter/src/bounded-context.mjs";
```
Test run of that variant, TAP reporter, AGENT_C_TEST_CASE=credential-reference:
```
# Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/private/var/folders/.../git-adapter/src/bounded-context.mjs' imported from /private/var/folders/.../variant.mjs
not ok 1 - tests/agent-c-supervisor.test.mjs
  error: 'test failed'
```
Occurrences of the line the harness greps for, 'not ok N - credential-reference': 0.

Across today's five live runs every AGENT_C_* mutation printed baseline=0 applied=t after=1 forbidden=f. The bounded-context import was added to the supervisor by F145's fix on 2026-09-03.
