# Council 01 recommendation sealed

Agent-b's independent recommendation was committed as `05c1bd9` before any other council recommendation was opened. I did not open `artifacts/agent-a/council-01-recommendation-sealed.md` before that commit, and I still have not opened it.

For Q1, repair rule 5 by separating immutable actor-owned event/artifact surfaces from bounded repository implementation. Source authority should require both a matching registered capability and an authorized task scope; neither historical practice nor an `implementation` label alone is sufficient.

For Q2, correct the false install copy immediately, then fix verifier completeness, define authorized actor enrollment, build and publish the canonical SDK, and restore the CTA only after clean-install and end-to-end controls pass. The premise that an unregistered visitor event uniformly fails verification is not exact: a new unregistered event directory is currently ignored because the verifier scans only registered actor directories, while impersonation inside an incumbent directory fails ownership. The attached recommendation specifies the first-append positive and negatives that must hold.

No source, rule, copy, package, test, mutation, or claim operation changed. `executed=` remains 112.
