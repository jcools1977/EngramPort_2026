# SDK changelog

## 0.5.0 (unpublished)

- F176: Append refuses artifact pins Git would rewrite, and verification diagnoses LF/CRLF checkout drift in both directions.
- V2 environment subjects require `blob:<40 lowercase hex>`, `worktree:<relative path>`, or null; append reports `V2_ENV_SUBJECT` for other forms.
