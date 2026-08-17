# W1-6a F17 evidence matrix

Demonstrated mutations: 13/28. Non-isolated: 15/28. All mutations used temporary copies and cleanup passed.

|Control|Production guard/anchor|Mutation or individual reason|Baseline|Mutated|Cleanup|
|---|---|---|---|---|---|
|N1|SECRET.test(v)|removed; nested bearer accepted|refused|accepted|temp removed|
|N2|recursive walk future field|shared recursive detector with N1; separate neutralization would require changing same walk and loses attribution|refused|not isolated|temp removed|
|N3|shape null -> SHAPE_UNKNOWN|guard protects later shape.shape_ref dereference; removing it crashes rather than accepts|refused|crash (not acceptance)|temp removed|
|N4|isProviderRegistration|same registry admission guard as N5; removing it admits registration and shadowing together|refused|not isolated|temp removed|
|N5|provider_shape_ref mismatch|same shape binding comparison as N3; disabling it cannot attribute unknown vs shadow selection|refused|not isolated|temp removed|
|N6|SECRET.test(v) detector error path|shares detector call/guard with N1/N2; bypass changes all detector findings|refused|not isolated|temp removed|
|N7|registry resolver catch -> REGISTRY_ERROR|removed catch; thrown resolver fixture accepted|refused|accepted|temp removed|
|N8|bytes > maxBytes -> RECORD_TOO_LARGE|removed size guard; 70 KiB fixture accepted|refused|accepted|temp removed|
|N9|depth > maxDepth -> NESTING_TOO_DEEP|removed depth guard; depth-17 fixture accepted|refused|accepted|temp removed|
|N10|URL authority check|URL parser guard shared for all unsafe schemes/userinfo/query cases; disabling cannot attribute this fixture|refused|not isolated|temp removed|
|N11|custody tenant/project comparison|same custody resolver guard as N12; disabling admits both foreign and revoked references|refused|not isolated|temp removed|
|N12|custody revoked check|same custody resolver boundary as N11; separate mutation would require a seam absent by design|refused|not isolated|temp removed|
|N13|value-free refusal|structural error-shaping invariant shared by every refusal; removing it changes all error confidentiality|refused|not isolated|temp removed|
|N14|shape_revision pin|structural output binding, not an isolated predicate; removing it changes every accepted descriptor identity|accepted|not isolated|temp removed|
|G1|getGrant null -> GRANT_NOT_FOUND|guard protects later g.status/field dereferences; removing it crashes rather than accepts|refused|crash (not acceptance)|temp removed|
|G2|GRANT_EXPIRED comparison|removed; expired grant accepted|refused|accepted|temp removed|
|G3|fresh.status !== active -> GRANT_REVOKED|removed status guard; revoked grant accepted|refused|accepted|temp removed|
|G4|TENANT_MISMATCH|removed; cross-tenant accepted|refused|accepted|temp removed|
|G5|PROJECT_MISMATCH|removed; cross-project accepted|refused|accepted|temp removed|
|G6|PROVIDER_MISMATCH|removed; wrong provider accepted|refused|accepted|temp removed|
|G7|CAPABILITY_MISMATCH|removed capability comparison; wrong capability accepted|refused|accepted|temp removed|
|G8|PRINCIPAL_MISMATCH|removed; wrong principal accepted|refused|accepted|temp removed|
|G9|ACTOR_MISMATCH|removed; wrong actor accepted|refused|accepted|temp removed|
|G10|SCOPE_EXCEEDED|removed; scope superset accepted|refused|accepted|temp removed|
|G11|granterAuthorized|authority resolver boundary shared with all grant authorization; bypass cannot attribute over-authority|refused|not isolated|temp removed|
|G12|fresh grant re-read|same re-read guard as G3; removing it changes both revocation controls|refused|not isolated|temp removed|
|G13|sessionLive|session state is a single datastore boundary; bypass changes all session lifecycle semantics|refused|not isolated|temp removed|
|G14|getCustody revoked|custody lookup/state boundary shared across references; bypass changes both custody existence and revocation|refused|not isolated|temp removed|

Production modules were byte-identical after the suite; no temporary directory remained. 
