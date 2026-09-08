# Known downstream copies

This registry covers registered copies only. Unregistered copies are unknown;
there is no discovery, downstream filesystem access, or network access.

Run `npm run blast-radius` to compare each stored vendoring digest with the
canonical file's bytes. CURRENT means the recorded baseline matches; STALE
means it differs. Missing/unreadable canonical files and malformed entries are
BROKEN registrations. Every entry is reported; any stale or broken entry makes
the command exit 1. All current entries (including an explicitly empty registry)
exit 0. An empty registry prints that it supplies no evidence of downstream currency.

Register copies by explicitly editing `downstream-copies.json`. Each entry needs
a unique `id`, a repository-relative `canonical_path`, lowercase SHA-256
`vendored_sha256` of the exact bytes copied at vendoring time, descriptive
`location`, and `vendored_on` date (YYYY-MM-DD). Canonical paths must resolve
inside this repository. Location is an opaque label, so remote or other-repository
paths can be recorded without accessing them. Use vendoring evidence for the
digest and date, and include its provenance. Do not hash today's canonical file
and call that a historical vendoring digest. Update an entry only after explicit
re-vendoring, using the new vendoring evidence.

The seeded registration uses the existing local vendor manifest and the dated
vendor completion's attached evidence. No external deployment is registered by
inference from the handoff's narrative. Tests use deliberately planted entries.

The check only imports filesystem read operations and never writes this registry.
It cannot quietly refresh stale baselines. It also cannot establish whether a
downstream copy still exists or has local edits, whether registration evidence is
truthful, or whether matching content is semantically compatible. The existing
vendor check handles local-copy integrity. This command reports observed digest
mismatch on demand; it does not notify downstream owners automatically.
