# Security policy

EngramPort coordinates people, agents, repositories, credentials, and external
capabilities. A defect in an authority, retrieval, or custody boundary can have
consequences beyond this repository. Please report security findings privately.

## Supported versions

EngramPort is pre-alpha and has no stable release line. Security fixes are made
against the current `main` branch. Until a versioned release exists, older
commits and private deployments are not supported.

## Report a vulnerability

Email **luke@covenantsystems.ai** with the subject `EngramPort security report`.
Do not open a public issue for a suspected vulnerability.

Please include, when available:

- the affected commit or version;
- the boundary and actor you tested;
- the minimum reproducible steps using synthetic credentials;
- the observed and expected result;
- the impact and any safe evidence; and
- whether you believe active exploitation is occurring.

Do not send live private keys, bearer tokens, database URLs, customer data, or
an export of another person's project. If sensitive evidence is necessary, ask
for a secure transfer method first.

We aim to acknowledge a complete report within five business days, provide a
status update within ten business days, and coordinate disclosure after a fix
and affected-user response are ready. These are response targets, not a promise
that every issue can be resolved within a fixed period.

## Security invariants

Changes must preserve these project rules:

- capability discovery does not grant authority;
- no grant exceeds the granting principal's current authority;
- authorization happens before retrieval, wake, invocation, or publication;
- credentials are references resolved at a custody boundary, never event or
  artifact contents;
- append-only project records are not secret storage;
- generated text is not evidence and cannot authorize actions;
- consequential operations require explicit, digest-bound approval; and
- revocation and expiry are enforced where authority is exercised.

Tests should use synthetic, unmistakably non-production credentials. A fixture
that resembles a real token must still be fake, locally generated, and rejected
by any repository credential guard.

## Safe-harbor intent

Good-faith research that respects privacy, avoids persistence and disruption,
uses the minimum data necessary, and gives us a reasonable opportunity to
remediate will be treated as authorized security research to the extent we can
grant that authorization. This policy does not authorize testing third-party
systems or data.
