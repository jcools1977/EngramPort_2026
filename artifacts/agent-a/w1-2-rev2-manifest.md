# W1-2 revision 2 manifest

Author: agent-a. Date: 2026-08-14. Revision basis: agent-b adversarial review, digest `99b8c616e8fde93bed8adbc819281626f5e8bc22bc0d2aa9871d954cadd3b52e`, verdict **not sufficient as the W3 prerequisite**.

| Document | Path | SHA-256 |
|---|---|---|
| setup-credential-threat-model.md | `docs/security/setup-credential-threat-model.md` | `9c0db519b29a18e193de159ed858d30e404d724adde5d2a92cb4b71872874136` |
| capability-reference-v1.schema.json | `docs/schemas/capability-reference-v1.schema.json` | `3811331dbb55742eed7eac4e3fa1742cdf76e1e7cab49e49a562df6ea2c074fc` |

## Verification I performed before revising

I did not revise on report. I reproduced the three most damaging findings myself:

- **F9**: `compileSetup` accepted `database.target = postgres://alice:REAL_SECRET@db.example/engram`; `serializeSetupPlan` retained `REAL_SECRET`.
- **Schema `input_shape`**: declared `{"type":["object","null"]}`, so `{token, nested:{private_key}}` was structurally accepted.
- **Schema `oneOf`**: branched on required-payload only, never pinning `kind`, so `kind: capability_grant` carrying a descriptor was accepted.
- **`provider_installation_ref`**: an unconstrained provider-supplied string, so `"Bearer REAL_SECRET"` was accepted.

## Schema revision 2, validated

Compiled and run against ajv with the three original bypasses plus nine further probes. Draft-07 semantics, because ajv 6 is what the repository has; every construct used is common to draft-07 and 2020-12, so the check is faithful for these constraints.

Rejected: nested secret payload, bearer installation reference, kind/payload mismatch, descriptor and grant together, top-level credential field, `invocable: true`, `invocable` absent, PEM in `shape_ref`, URL in `capability`, JWT locator, PEM locator, connection-string locator, dotted locator, `env-file-local` manager, grant without expiry. Accepted: baseline descriptor, descriptor with display text, baseline grant, grant with installation locator and KMS credential reference.

## A finding against my own revision

My first attempt at revision 2 constrained `credential_ref.locator` to the shared `identifier` grammar, which permits dots because capability names need them. A JWT is dot-separated base64url, so **a JWT passed as a locator**. My own probe caught it; reading the schema would not have. The locator now has a tighter grammar excluding dots entirely.

Recording it because the schema critique was correct, my first fix was still incomplete, and the difference was testing rather than rereading.

## Structural closures worth naming

- `input_shape` is **removed**. A descriptor now carries `shape_ref`, an identifier resolved against a locally registered shape registry, so a provider cannot define the schema it is validated against.
- `provider_installation_ref` is **removed**. `installation_locator` lives on the grant, so the only field an invocation may read exists because an authorized grant put it there.
- `invocable: false` is required and constant, so any code path treating a descriptor as invocable contradicts a field it must have read.
- The schema now **states its own limits**: JSON Schema cannot recursively detect secret-shaped content. Six ingest requirements are written as normative prose and gated by control A5, rather than implied by structure.
