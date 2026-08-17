# W1-6a F17 evidence matrix

Demonstrated mutations: 8/28. Non-isolated: 20/28. All mutations used temporary copies and cleanup passed.

|Control|Production guard/anchor|Mutation or individual reason|Baseline|Mutated|Cleanup|
|---|---|---|---|---|---|
|N1|SECRET.test(v)|removed; nested bearer accepted|refused|accepted|temp removed|
|N2|recursive walk future field|shared recursive detector with N1; separate neutralization would require changing same walk and loses attribution|refused|not isolated|temp removed|
|N3|shape resolver null|registry resolution path shared with N4/N5; neutralizing resolver changes all shape decisions|refused|not isolated|temp removed|
|N4|isProviderRegistration|same registry admission guard as N5; removing it admits registration and shadowing together|refused|not isolated|temp removed|
|N5|provider_shape_ref mismatch|same shape binding comparison as N3; disabling it cannot attribute unknown vs shadow selection|refused|not isolated|temp removed|
|N6|SECRET.test(v) detector error path|shares detector call/guard with N1/N2; bypass changes all detector findings|refused|not isolated|temp removed|
|N7|registry resolver try/catch|shared fail-closed registry boundary with N3; bypass changes unknown and thrown errors|refused|not isolated|temp removed|
|N8|maxBytes|size guard is structural precondition before traversal; removing it changes scanner exhaustion behavior with N9|refused|not isolated|temp removed|
|N9|maxDepth|depth guard is structural traversal bound; removing it changes same recursion safety invariant as N8|refused|not isolated|temp removed|
|N10|URL authority check|URL parser guard shared for all unsafe schemes/userinfo/query cases; disabling cannot attribute this fixture|refused|not isolated|temp removed|
|N11|custody tenant/project comparison|same custody resolver guard as N12; disabling admits both foreign and revoked references|refused|not isolated|temp removed|
|N12|custody revoked check|same custody resolver boundary as N11; separate mutation would require a seam absent by design|refused|not isolated|temp removed|
|N13|value-free refusal|structural error-shaping invariant shared by every refusal; removing it changes all error confidentiality|refused|not isolated|temp removed|
|N14|shape_revision pin|structural output binding, not an isolated predicate; removing it changes every accepted descriptor identity|accepted|not isolated|temp removed|
|G1|getGrant null|lookup guard shared with G12 re-read; bypass also changes revocation semantics|refused|not isolated|temp removed|
|G2|GRANT_EXPIRED comparison|removed; expired grant accepted|refused|accepted|temp removed|
|G3|fresh status revoked|shares fresh grant re-read with G12; bypass conflates initial and invocation revocation|refused|not isolated|temp removed|
|G4|TENANT_MISMATCH|removed; cross-tenant accepted|refused|accepted|temp removed|
|G5|PROJECT_MISMATCH|removed; cross-project accepted|refused|accepted|temp removed|
|G6|PROVIDER_MISMATCH|removed; wrong provider accepted|refused|accepted|temp removed|
|G7|CAPABILITY_MISMATCH|shares request identity comparison family with G6; disabling one requires independent source seam not present|refused|not isolated|temp removed|
|G8|PRINCIPAL_MISMATCH|removed; wrong principal accepted|refused|accepted|temp removed|
|G9|ACTOR_MISMATCH|removed; wrong actor accepted|refused|accepted|temp removed|
|G10|SCOPE_EXCEEDED|removed; scope superset accepted|refused|accepted|temp removed|
|G11|granterAuthorized|authority resolver boundary shared with all grant authorization; bypass cannot attribute over-authority|refused|not isolated|temp removed|
|G12|fresh grant re-read|same re-read guard as G3; removing it changes both revocation controls|refused|not isolated|temp removed|
|G13|sessionLive|session state is a single datastore boundary; bypass changes all session lifecycle semantics|refused|not isolated|temp removed|
|G14|getCustody revoked|custody lookup/state boundary shared across references; bypass changes both custody existence and revocation|refused|not isolated|temp removed|

Production modules were byte-identical after the suite; no temporary directory remained. 
