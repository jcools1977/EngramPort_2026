# Agent C scheduling and credential-path results

Parent event: `01a0447c-2473-7d6e-8ed3-073d24d39b58`.

## Delivered repository boundary

- A five-minute, long-lived LaunchAgent loop and plist are implemented under
  the shared `scripts/` and `deploy/` surfaces.
- The scheduled poll path can inspect only Agent C's verified inbox, persist a
  digest of the last actionable set, keep a bounded local log, and send a local
  notification. It cannot invoke a model, resolve a credential, append an event,
  or modify the repository.
- Empty actionable input is silent. Repeated observation of the same actionable
  set is also silent.
- A service-account runner reads only the named macOS Keychain item into process
  memory, removes inherited xAI, Connect, and 1Password-session variables, and
  resolves the xAI reference from a dedicated-vault env-reference file.
- A missing, locked, or malformed token reports `CREDENTIAL_UNAVAILABLE` in a
  bounded local log and a notification, and never invokes the runner. A
  well-formed but expired token reaches `op`, which refuses and produces the
  separate `REVIEW_FAILED` log and notification.

## Credential decision

No unattended credential is enabled. A service account against the existing
`AN2B` vault is rejected because service accounts are vault-scoped and that
would widen one xAI credential into every readable estate item in the vault.
1Password Connect is rejected because its server creation writes
`1password-credentials.json` and adds a persistent server/token boundary.
Desktop integration or an `op` daemon retains the interactive-unlock dependency
that a LaunchAgent cannot satisfy.

The least-bad current mode is manual invocation after an automated trigger. A
future unattended path is prepared but gated on DeVere creating a dedicated
read-only Agent C vault and entering the one-time service-account token directly
into the macOS Keychain prompt. This still exposes that dedicated-vault token to
same-user processes while the login Keychain is unlocked; it does not provide
process isolation. Creation, rotation, expiry, and revocation remain DeVere
operations.

## Host scheduling blocker

The repository change does **not** claim the poller is scheduled. The requested
host installation was submitted through the required approval gate and rejected
because a project event does not directly authorize a persistent login-time
LaunchAgent. Read-only verification after the rejection observed:

- `~/Library/LaunchAgents/com.an2b.engramport-agent-c-poll.plist`: absent.
- `launchctl print gui/501/com.an2b.engramport-agent-c-poll`: service not found.

The one-off poller executable was run with bounded-state permission and exited
zero without stdout or stderr. It found one real open Agent C turn,
`01a03e9a-c544-75e6-920f-ee4506d83b7d`, logged only the pending count, and
notified. It did not wake Agent C or invoke a model. This proves the executable
path, not persistence. Direct DeVere approval is still required to install and
bootstrap the plist.

## Discrimination and verification

- `npm run agent-c:test`: 15/15 tests passed; all 13 Agent C mutations killed.
- `AGENT_C_SCHEDULED_SILENCE`: removing the empty-actionable return makes the
  negative emit a pending log and notification.
- `AGENT_C_CREDENTIAL_FAILURE_REPORT`: removing both reports makes the missing
  credential negative silent.
- `bash scripts/run-d1-mutation-harness`: exit 0 with all controls
  discriminating; `executed=129`, from the handed-off baseline of 127.
- `npm test`: exit 0, including proof, Agent C, W1-7 Docker canary, report,
  session, approval, Port Watch, build, and rendered HTML controls.
- `npm run lint`: exit 0.
- `plutil -lint deploy/launchd/com.an2b.engramport-agent-c-poll.plist`: OK.
- `bash -n scripts/run-agent-c-poller-loop`: exit 0.

The first sandboxed database-harness and full-test attempts were refused access
to the local Docker socket. They were rerun through the approval boundary and
passed. No live model call, provider request, real credential read, service
account creation, vault change, SDK change, protocol change, reporter change,
or host schedule installation occurred.
