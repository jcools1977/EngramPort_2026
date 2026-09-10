# Exact artifact bytes in Git checkouts

Keep `* -text` in `.gitattributes` so Git preserves the exact bytes covered by artifact SHA-256 pins.

Append now refuses an artifact pin when Git's clean conversion would store different bytes, naming the path and the `* -text` remedy, and refuses if Git cannot perform the check.

Verification still requires an exact byte match; `CHECKOUT_ALTERED_BYTES` diagnoses a mismatch compatible with LF/CRLF conversion in either direction, while other changes remain `artifact hash mismatch`.

The diagnosis does not establish how bytes changed. Reconstructing a uniform CRLF form cannot recover arbitrary mixed line endings from a digest alone. Preserve or restore the original pinned bytes rather than changing accepted evidence or its pin. Custom clean filters may require their own attribute configuration in addition to `-text`.
