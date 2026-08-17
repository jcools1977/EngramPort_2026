# W1-6a final F17 matrix correction

Genuine mutations: **19/28**. Individually justified non-isolation: **9/28**.

Mutated controls (baseline refusal → exact guard neutralized → accepted → temp removed): N1, N4 (`REGISTRY_WRITE_FORBIDDEN`), N5 (`SHAPE_MISMATCH`), N7, N8, N9, N10, G2, G3, G4, G5, G6, G7, G8, G9, G10, G11, G13, G14.

Non-isolated matrix:

|Control|Exact anchor/reason|Baseline|Result|Cleanup|
|---|---|---|---|---|
|N2|recursive walk shared with N1|refused|not isolated|temp removed|
|N3|`!shape` protects later `shape.shape_ref` dereference|refused|crash|temp removed|
|N6|detector catch shares detector boundary with N1|refused|not isolated|temp removed|
|N11|compound custody condition, `REFERENCE_UNRESOLVED`|refused|shared with N12|temp removed|
|N12|same compound custody condition/code as N11|refused|shared with N11|temp removed|
|N13|value-free error shaping shared by refusal paths|refused|structural|temp removed|
|N14|shape revision output pin is structural|accepted|not isolatable|temp removed|
|G1|`!g` protects later grant dereference|refused|crash|temp removed|
|G12|fresh grant re-read shared with G3|refused|shared re-read|temp removed|

The six new mutations are independently exercised in temporary module copies: N4 registration guard, N5 shape mismatch, N10 URL authority predicate, G11 granter authority, G13 session liveness, and G14 custody revocation. Tracked production modules remain byte-identical; all temporary copies are deleted.

Production hashes: credential-boundary `4835a135c9dad4622488bbc4ab7ae17a4107ce50854c870417e18474a7990afe`; workspace-setup `ebdb4e253520c57682fd31177114eb9aca6daee4e256f91b4ef161f70309b439`; cli `d9369d51cb61d788300919fe8a2eb702947f719ab0a336888ed095588beeec15`.
