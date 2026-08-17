# W1-6a F17 revision matrix

Genuine temporary-copy mutations: **13/28**. Individually justified non-isolated controls: **15/28**. G1 and N3 crash on later dereference when their guard is removed.

|ID|Exact guard/anchor|Mutation or individual technical reason|Baseline|Mutated|Cleanup|
|---|---|---|---|---|---|
|N1|`SECRET.test(v)`|removed; nested secret accepted|refused|accepted|temp removed|
|N2|recursive walk|shares recursive traversal statement with N1; neutralizing it also removes N1 attribution|refused|not isolated|temp removed|
|N3|`!shape` → `SHAPE_UNKNOWN`|protects later `shape.shape_ref` dereference; removal crashes|refused|crash|temp removed|
|N4|`isProviderRegistration`|registration guard and shadowing are one registry-admission statement; removal admits both|refused|not isolated|temp removed|
|N5|`provider_shape_ref !== shape.shape_ref`|shape binding statement has no independent safe null substitute; removal changes registry identity binding|refused|not isolated|temp removed|
|N6|detector catch|same detector invocation/error boundary as N1; removal changes detector-wide fail-closed behavior|refused|not isolated|temp removed|
|N7|registry catch → `REGISTRY_ERROR`|removed; thrown resolver accepted with replacement shape|refused|accepted|temp removed|
|N8|`bytes > maxBytes`|removed; 70 KiB accepted|refused|accepted|temp removed|
|N9|`depth > maxDepth`|removed; depth-17 accepted|refused|accepted|temp removed|
|N10|URL authority predicate|single URL parser guard covers all unsafe URL forms; neutralization cannot attribute one form|refused|not isolated|temp removed|
|N11|compound custody condition → `REFERENCE_UNRESOLVED`|same compound statement covers foreign and revoked rows|refused|not isolated|temp removed|
|N12|same compound custody condition|same exact statement/code as N11; no attribution|refused|not isolated|temp removed|
|N13|value-free refusal shaping|shared error shaping invariant across all refusal paths|refused|not isolated|temp removed|
|N14|shape revision output pin|structural output binding, not an isolated refusal predicate|accepted|not isolated|temp removed|
|G1|`!g` → `GRANT_NOT_FOUND`|protects later `g.status`/field dereferences; removal crashes|refused|crash|temp removed|
|G2|database-clock expiry comparison|removed; expired grant accepted|refused|accepted|temp removed|
|G3|fresh status → `GRANT_REVOKED`|removed; revoked grant accepted|refused|accepted|temp removed|
|G4|tenant comparison|removed; cross-tenant accepted|refused|accepted|temp removed|
|G5|project comparison|removed; cross-project accepted|refused|accepted|temp removed|
|G6|provider comparison|removed; wrong provider accepted|refused|accepted|temp removed|
|G7|capability comparison|removed; wrong capability accepted|refused|accepted|temp removed|
|G8|principal comparison|removed; wrong principal accepted|refused|accepted|temp removed|
|G9|actor comparison|removed; wrong actor accepted|refused|accepted|temp removed|
|G10|scope containment|removed; scope superset accepted|refused|accepted|temp removed|
|G11|granter authority resolver|single resolver boundary protects all granter claims; bypass cannot attribute authority|refused|not isolated|temp removed|
|G12|fresh grant re-read|same re-read statement as G3; removal changes both revocation checks|refused|not isolated|temp removed|
|G13|sessionLive|single session datastore guard; removal changes all session-state attribution|refused|not isolated|temp removed|
|G14|getCustody revoked|single custody-state boundary covers custody existence/state|refused|not isolated|temp removed|

Production hashes unchanged: credential-boundary `4835a135c9dad4622488bbc4ab7ae17a4107ce50854c870417e18474a7990afe`; workspace-setup `ebdb4e253520c57682fd31177114eb9aca6daee4e256f91b4ef161f70309b439`; cli `d9369d51cb61d788300919fe8a2eb702947f719ab0a336888ed095588beeec15`. Temporary files and Docker residue absent.
