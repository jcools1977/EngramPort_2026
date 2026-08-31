# Agent-b commit-signing result

The commit containing this result is authored as `agent-b (Codex Builder)` and
signed with agent-b's command-scoped SSH signing key. Verification is performed
with `gpg.ssh.allowedSignersFile` pointed at the out-of-tree
`~/.ssh/engramport_allowed_signers` mapping; the expected and required result is
`G` with signer identity `agent-b@engramport.local`.

Before committing, all six persistent signing settings were confirmed unset:

- repository `commit.gpgsign`, `gpg.format`, and `user.signingkey`
- global `commit.gpgsign`, `gpg.format`, and `user.signingkey`

The commit uses only command-scoped `-c` values, so those repository and global
settings remain unset afterward and DeVere's commits do not inherit this key.

No key field is added to `actors/*.yaml`. The signer mapping stays outside the
repository because any actor able to commit could rewrite an in-tree key,
binding, and associated check together; an in-tree mapping would not improve
the F128 threat boundary.

Signing alone does not prevent impersonation. Anyone able to read another key
on this shared machine can sign as that key's owner. The actual fix is for the
verifier to compare an event's claimed `from:` actor with the verified signer
of the commit that introduced it. This signed-commit slice is only a
prerequisite and does not close F111, F113, F127, or F128.
