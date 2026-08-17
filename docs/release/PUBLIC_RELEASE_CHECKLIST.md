# Public MIT release checklist

Status: **release package drafted; public visibility blocked pending a clean
export.**

This checklist applies to the first MIT release of EngramPort Core. Completing
the documentation package does not authorize making the current private
repository public.

## Release boundary

Do **not** flip the visibility of `jcools1977/EngramPort_2026` in place.

The private repository is the canonical construction record. Its immutable
historical evidence includes a revoked credential that was intentionally used
to demonstrate why provider-shaped strings cannot be treated as safe
references. Editing those accepted events and artifacts would invalidate the
proof record; publishing them would unnecessarily republish a former secret.

The public release must therefore be a fresh, allowlisted export with new Git
history. The private repository remains the provenance archive.

## Audit snapshot

Audit base: private `main` at `cf81094`.

- 78 commits and 221 tracked files examined.
- Current-tree and all-history pattern scans completed without printing token
  values.
- No tracked `.env`, private-key, keystore, or credential filename found.
- Nine current paths matched credential patterns. The database URL matches are
  explicit security examples. Three immutable evidence paths contain the same
  formerly real GitHub token.
- GitHub rejects that token; it is no longer active. Revocation does not make
  publication of the value appropriate.
- GitHub secret scanning is disabled on the private repository.
- `npm audit --omit=dev` reports zero production dependency vulnerabilities at
  all severities.
- The full development toolchain audit reports 45 advisories: 3 low, 7
  moderate, and 35 high. They are confined to development dependencies in the
  current audit, but they affect contributors and build tooling and require
  triage before the public release. No automatic or forced audit fix has been
  applied.

This is a point-in-time audit, not proof that future commits are clean.

## Clean-export requirements

1. Create a new public repository with a fresh root commit. Decide its final
   owner and name before adding package repository and issue-tracker metadata.
2. Export source through an explicit allowlist. Do not copy `.git`,
   `.gitguard-allow`, `.openai/hosting.json`, `events/`, or `artifacts/` from the
   private construction repository.
3. Replace the canonical private construction log with a small synthetic Git v0
   example whose events, artifacts, actors, and digests are generated for the
   public repository. Label it synthetic; do not imply it is the private
   provenance archive.
4. Decide which internal registers and roadmap documents are part of the
   product source. Export by allowlist rather than trying to enumerate every
   private file that should be excluded.
5. Run every applicable unit, proof, build, lint, and live database suite from
   the exact export candidate.
6. Run a second current-tree and full-history secret scan on the public
   candidate. Use a maintained scanner in addition to the repository pattern
   guard.
7. Enable GitHub secret scanning and push protection before accepting outside
   contributions.
8. Triage the full development-dependency audit. Upgrade, replace, or document
   each unresolved direct toolchain dependency based on reachability and the
   exact advisory; do not run a breaking `npm audit fix --force` blindly.
9. Add the final public repository and issue URLs to `package.json`, README
   badges, and `CONTRIBUTING.md` only after those URLs exist.

## Repository package

- [x] MIT `LICENSE` drafted for Covenant Systems AI LLC.
- [x] Public README drafted with conservative current-state claims.
- [x] `SECURITY.md` drafted with private reporting instructions and security
      invariants.
- [x] `CONTRIBUTING.md` drafted for human and agent contributors.
- [x] Package metadata identifies the MIT license, product description,
      homepage, and keywords.
- [x] Common private-key and keystore filenames added to `.gitignore`.
- [ ] Copyright holder approved.
- [ ] Security-policy response targets approved.
- [ ] Public repository owner and name selected.
- [ ] Clean-export allowlist reviewed.
- [ ] Synthetic public proof corpus generated and verified.
- [ ] Final secret scan passes with zero unresolved findings.
- [ ] Development toolchain advisories are resolved or explicitly reviewed and
      accepted for the release commit.
- [ ] GitHub security features enabled.
- [ ] Founder gives explicit authorization for public visibility.

## Final visibility gate

The visibility change is allowed only when every unchecked item above is
complete, the exact export commit has been reviewed, and the founder explicitly
authorizes publication. Preparing or merging this documentation does not satisfy
that gate.
