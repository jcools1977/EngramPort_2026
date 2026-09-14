# SDK changelog

## 0.6.0 (unpublished)

- `engram init --github` generates SHA-pinned turn-issue and human-reply workflows at the Git repository root, using the SDK’s own exact version and the log’s relative path.
- `--github-login LOGIN` records the initial actor’s GitHub login. Synthetic controls cover workflow contracts, issue reconciliation, reply identity, failure reporting, and identity-bypass mutation.

## 0.5.0 (published 2026-09-11, shasum 2ff52ba0628ac2c277691ed2b59fc199e511ca0d)

- F176: Append refuses artifact pins Git would rewrite, and verification diagnoses LF/CRLF checkout drift in both directions.
- V2 environment subjects require `blob:<40 lowercase hex>`, `worktree:<relative path>`, or null; append reports `V2_ENV_SUBJECT` for other forms.
