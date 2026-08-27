# Agent C scheduling and credential boundary

Parent handoff: `01a0447c-2473-7d6e-8ed3-073d24d39b58`.

## Repository-delivered state and host blocker

The macOS LaunchAgent and its five-minute poll loop are implemented and tested,
but are **not installed on the host**. Installation was attempted only through
the required approval gate; that gate rejected the persistent login-time side
effect because the verified handoff event is project evidence, not direct human
authority for host mutation. The target plist remains absent and `launchctl`
reports no service named `com.an2b.engramport-agent-c-poll`. DeVere must approve
the host installation explicitly before this document may call the poller
scheduled.

When installed, the job has the same capability boundary as the relay notifier:
it verifies and inspects the repository log, keeps bounded local state and logs,
and sends a local notification. It does not invoke a model, resolve a
credential, append an event, or modify the repository. An empty actionable
inbox produces no log, stdout, stderr, or notification. An unchanged actionable
set does not notify again.

The long-lived loop is deliberate. The existing relay notifier established on
this host that `StartInterval` pended after its first short run. `KeepAlive`
therefore supervises one loop and the loop sleeps for 300 seconds between
checks.

Operational files:

- `deploy/launchd/com.an2b.engramport-agent-c-poll.plist`
- `scripts/run-agent-c-poller-loop`
- `scripts/run-agent-c-scheduled-poll`
- local state under `~/.local/state/an2b/engramport-agent-c/`

## Credential decision

No unattended credential option is enabled today. The least-bad prepared
arrangement is a scheduled trigger with manual model invocation. Until host
installation is approved, discovery also remains manual. `npm run
agent-c:review` remains the model path.

The prepared unattended path is narrower than using the existing `AN2B` vault:

1. DeVere creates a dedicated 1Password vault containing only Agent C's xAI
   credential.
2. DeVere creates a read-only service account for only that vault.
3. The one-time service-account token is entered directly into the macOS
   Keychain prompt; it is never placed in a file or command argument:

   ```sh
   /usr/bin/security add-generic-password -U -a agent-c -s com.an2b.engramport.agent-c.op-service-account -T /usr/bin/security -w
   ```

4. `npm run agent-c:review:service-account -- --event <event> ...` reads the
   token into process memory, clears inherited `XAI_API_KEY`, 1Password session,
   and Connect variables, and uses the dedicated-vault reference in
   `deploy/agent-c.service-account.env.example`.

Until steps 1–3 occur, the service-account runner refuses with
`CREDENTIAL_UNAVAILABLE`, writes that code to a bounded local log, sends a
notification, and does not start `op` or the model runner. Tests inject only a
synthetic token and never make a live model call.

### Blast radius and non-coverage

A 1Password service account is vault-scoped, not item-scoped. Granting it read
access to the existing `AN2B` vault would expose every readable item in that
vault and is refused by this design. A dedicated vault limits the token's
1Password reach to the xAI item, but any process running as this macOS user
while the login Keychain is unlocked can invoke `/usr/bin/security`; Keychain
storage therefore does not create process isolation. The service account must
be read-only, must not be able to create vaults, and should have the shortest
operationally workable expiry. Rotation, service-account creation, dedicated
vault creation, and xAI-side revocation remain DeVere operations and are not
performed by repository code.

The other assessed options do not satisfy the present constraints:

- 1Password desktop integration or an `op` daemon still depends on an
  interactive desktop unlock and is not a reliable unattended LaunchAgent
  credential boundary.
- 1Password Connect creates `1password-credentials.json` and requires a
  persistent Connect token and server. The credentials file directly violates
  the no-secret-on-disk rule and adds a network-resident secret service.
- A service account against the existing estate vault works technically but
  widens the blast radius from one xAI credential to the vault and is rejected.
- Manual invocation after an automated notification is incomplete automation,
  but it adds no standing secret and fails visibly. It is the selected current
  mode until the dedicated-vault prerequisite exists.

## Failure behavior

The scheduled poller converts inbox or verification failure into both a bounded
`ERROR POLL_FAILED` log entry and a local notification. The service-account
runner converts missing, locked, or malformed Keychain material into both
`ERROR CREDENTIAL_UNAVAILABLE` and a notification. A token that is well-formed
but expired is rejected by `op` and produces the separate `ERROR REVIEW_FAILED`
log and notification. Neither path includes a credential or provider response
in its message.

The paired controls are mutation-defended:

- `AGENT_C_SCHEDULED_SILENCE` removes the empty-inbox return and makes the
  silent negative emit a pending notification.
- `AGENT_C_CREDENTIAL_FAILURE_REPORT` removes both missing-credential reports;
  the negative then observes silence and fails.

These two observed controls move the canonical mutation count from
`executed=127` to `executed=129`.
