# D1F orphan-audit correction

M11/M12 and unknown-stage controls now assert orphan audits directly by left-joining custody_audit references to minted_references, rather than comparing against a global baseline. The accepted FK makes orphan minted-reference rows unreachable; the audit assertion is therefore explicit but not fully independent of that FK. `npm run db:test` passed.
