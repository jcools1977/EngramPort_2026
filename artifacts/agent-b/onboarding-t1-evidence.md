# Onboarding T1 verification evidence

## Reproduction

Exact command:

```sh
npm run welcome:test && npm run proof
```

Runtime: Node.js `v26.5.0`. No dependency or network access was added. Fixtures contain only a clearly synthetic token digest (`cd` repeated 32 times), never a redemption token or private key on disk.

## Full test output

```text
> engramport@0.1.0 welcome:test
> node --test tests/welcome-package.test.mjs

✔ valid package reports unchanged structural grant
✔ tampered part bytes
✔ missing part
✔ extra unlisted part
✔ unknown manifest field
✔ altered identity grant
✔ valid signature over tampered part list
✔ unknown signing key
✔ revoked signing key
✔ expired package
✔ revoked invitation
✔ open invitation
✔ invitation unknown field
✔ absent checkpoint
✔ inconsistent checkpoint chain
✔ context role escalation
✔ operator impersonation
✔ identity contradiction
✔ welcome verify CLI reports grant and exits nonzero on violation
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 291.101125

> engramport@0.1.0 proof
> npm run proof:verify && npm run proof:test

> engramport@0.1.0 proof:verify
> node scripts/verify-log

✓ verified 7 events across 3 thread(s) and 2 actors

> engramport@0.1.0 proof:test
> node --test tests/git-v0.test.mjs

✔ valid two-agent relay verifies
✔ modified content is rejected
✔ unknown schema fields are rejected
✔ actor directory ownership is enforced
✔ unknown reply targets are rejected
✔ strict relay actor transitions are enforced
✔ reply cycles are rejected
✔ missing artifacts are rejected
✔ artifact modification is rejected
✔ artifact references must remain in author prefix
✔ filename identity is enforced
ℹ tests 11
ℹ suites 0
ℹ pass 11
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 111.046375
```

`git diff --check` and JSON parsing of both schemas also passed.

## Specific matched rules

Each mutation starts by verifying an unmodified positive package and asserting the exact structural grant. Negative assertions match these diagnostics:

- tampered bytes → `part digest mismatch: context.md`
- missing file → `part missing: context.md`
- extra file → `unlisted part: extra.md`
- manifest extension → `manifest: unknown field authority`
- identity grant alteration → `grant_digest mismatch: identity grant`
- valid signature over altered part digest → `part digest mismatch: identity.json`
- unknown key → `unknown signing key`
- revoked key → `signing key revoked`
- expiry → `package expired`
- revoked/open invitations → exact `invitation status must be accepted, got …`
- invitation extension → `invitation: unknown field authority`
- absent checkpoint → `checkpoint event absent`
- changed checkpoint hash → `checkpoint chain_hash inconsistent`
- cross-prefix artifact reference → `artifact-prefix ownership violation`

The role-escalation context, operator impersonation, and identity-contradiction fixtures all verify structurally and assert this unchanged reported grant:

```json
{"role":"contributor","scopes":["events:write"],"capabilities":["security-review"],"groups":["friends"],"trust_ceiling":"untrusted_agent"}
```

The fourth adversarial fixture has a cryptographically valid signature over a tampered part list and is rejected by the raw-byte digest check; its positive control reports the same grant above.

## Design findings

1. The structural-authority claim survives implementation: prose parts are never parsed for rights, while the reported grant comes only from `identity.json`, is bound to `grant_digest`, matches the accepted invitation, and is covered by the manifest signature.
2. Git v0 events do not contain canonical `project_seq` or `chain_hash` fields. T1 therefore checks those values against an explicit JSON checkpoint event body already protected by the Git event content hash. This proves consistency with the visible Git log but is not equivalent to the PostgreSQL per-project chain proof. A future Git schema revision should make checkpoint sequence/hash typed envelope data rather than a body convention.
3. Schema validation is a safety gate. If the manifest shape is invalid, later stages cannot be evaluated safely and verification returns all schema errors before digest/signature stages. For a structurally valid manifest, all remaining stages run and accumulate every detected failure.
4. Key resolution is intentionally local and structural through `keys/<key_id>.json`; only public keys are committed. Actor-embedded key resolution can be added when the actor schema defines a typed key field.
