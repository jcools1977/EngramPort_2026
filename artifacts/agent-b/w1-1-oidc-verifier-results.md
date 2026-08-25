# W1-1 synthetic OIDC verifier results

Reply to handoff `01a03682-3598-72e6-bdc3-0cbb900319e3` on `wizard-w1-1-scope`.

## Result

The cryptographic verifier is implemented as the separate ADR 0026 component. It accepts a compact token plus expected nonce, verifies against a synthetic RSA JWKS registry, and returns only a frozen verified-claims projection:

```text
aud, exp, iss, nonce, sub
```

It never returns `principal_id`. A signed fixture deliberately carries a caller-asserted `principal_id`; the clean verifier omits it. The binder remains absent and blocked exactly as ADR 0026 records. No manager, binder, database schema, bootstrap function, real provider, credential, tenant, or network path changed.

## Paired controls

All ten controls run with a valid current-key positive:

```text
W1_1_OIDC signature positive=accepted negative=OIDC_SIGNATURE_REFUSED
W1_1_OIDC rotation positive=accepted negative=OIDC_KEY_RETIRED
W1_1_OIDC alg-none positive=accepted negative=OIDC_ALGORITHM_NONE_REFUSED
W1_1_OIDC alg-hs256 positive=accepted negative=OIDC_ALGORITHM_CONFUSION_REFUSED
W1_1_OIDC issuer positive=accepted negative=OIDC_ISSUER_REFUSED
W1_1_OIDC audience positive=accepted negative=OIDC_AUDIENCE_REFUSED
W1_1_OIDC expiry positive=accepted negative=OIDC_EXPIRED
W1_1_OIDC nonce positive=accepted negative=OIDC_NONCE_REFUSED
W1_1_OIDC claims-surface positive=aud,exp,iss,nonce,sub negative=absent
W1_1_OIDC retention positive=cleared negative=cleared
```

The rotation fixture contains one active and one retired synthetic RSA signing key. The current key verifies; the retired key is selected by its real `kid`, cryptographically valid, and then refused on lifecycle status, so the observation is not a missing-key or bad-signature refusal.

The HS256 fixture performs the classic key-confusion construction: it HMAC-signs with the RS256 public PEM bytes. The clean verifier refuses the algorithm before signature dispatch. The `alg:none` fixture has an empty signature segment and is independently refused.

Issuer, audience, expiry, and nonce negatives are each otherwise-valid RS256 tokens, so no neighboring check carries another. Expiry uses the injected verifier clock; no caller time is trusted.

Transient cleanup uses an in-flight set that is populated only for the duration of `verify` and cleared in `finally` on success and refusal. The paired control observes zero raw-token and zero full-claims transients after both paths. The returned projection contains no raw token and no unapproved claim.

## Discrimination

The harness copies only the verifier module into scratch variants. No shipped module is edited. Ten mutations are independently applied and restored:

- signature verification bypassed;
- retired-key lifecycle check removed;
- all three layers required to accept unsigned `alg:none` weakened together;
- the RS256 allowlist weakened and RSA public-key-as-HMAC dispatch introduced together;
- issuer, audience, expiry, and nonce checks removed separately;
- exact claims projection widened to the caller payload;
- `finally` cleanup removed.

Every weakened variant admits exactly its forbidden observation and makes its selected paired test fail:

```text
W1_1_OIDC_* baseline=0 applied=t after=1 forbidden=t restored=0
D1 mutation harness: all controls discriminate (executed=82)
```

The total moves from 72 to 82 only on those ten observed discriminations. The negative no-op harness exits 1 with `NOOP baseline=0 applied=f after=0 restored=0` and `NOOP false discrimination correctly rejected`.

## Verification

- `npm run db:test`: exit 0 on the clean, non-overlapping run; 83 database controls and the mutation harness at `executed=82`.
- `npm test`: exit 0; 246 passed, 0 failed, 0 skipped.
- `npm run kms:test`: exit 0; live Vault differential green.
- `npm run lint`: exit 0.
- `npm run session:async-negative`: exit 0; `failed=21 passed=16 manager_refusals_removed=19 nonmanager_green=3 enumerated=t`.
- `bash scripts/run-d1-mutation-harness --negative`: expected exit 1 with the exact no-op baseline above.
- `npm run proof:verify`: exit 0 at 254 events before publication.

Two earlier `db:test` attempts collided with another live harness using the pre-existing fixed scratch database name `engramport_mut`; their database-drop and duplicate-database errors were not counted. The competing scratch work was allowed to clear, and the complete canonical sweep was rerun from a clean service to exit 0. A first negative-harness attempt likewise lost its Docker service and was discarded; the clean retry produced the exact expected no-op result above.
