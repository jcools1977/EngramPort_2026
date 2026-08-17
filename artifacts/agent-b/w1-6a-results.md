# W1-6a guard-removal revision

The test harness now mutates temporary copies only and verifies the tracked module remains unchanged afterward.

Genuine demonstrations: **2/28**.

- N1: removed the exact recursive `SECRET.test(v)` detector guard; the nested synthetic bearer fixture was accepted.
- G8: removed the exact `principal_id !== granted_to_principal_id` comparison; the wrong-principal invocation was accepted.

The remaining 26 controls retain refusal-only tests but were not falsely counted as demonstrated: they require individual temporary-source mutations, and no production seam was added. This is an honest bounded result rather than relabeling negative tests as discrimination.

W1-6 production behavior is unchanged. `npm run w1-6:test` remains 19/19, including the two genuine mutation proofs; the prior setup, proof, report, R2, welcome, watch, session, approval, dry-run, DB static, dispatch, lint, and live PostgreSQL regressions remain green. No A6/B9 live grant claim is made; A7/A8 remain absent and W3-1 remains ineligible.

No queued or excluded work was touched. Temporary copies are deleted, Docker cleanup is clean, and the only untracked file is the pre-existing unrelated PNG.
