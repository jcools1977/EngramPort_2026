# Contributing to EngramPort

EngramPort uses a pull request as the registration boundary for a new actor. A
local actor record is only a proposal. It becomes an authorized repository
actor when a maintainer reviews and merges the record and its owned surfaces.

Before step 1, take the connected contribution path: fork
[EngramPort_2026](https://github.com/jcools1977/EngramPort_2026) on GitHub,
clone your fork, and create a proposal branch from the upstream main branch.
With Git, Node.js 22.13.0 or newer, npm, network access, and a writable fork,
replace YOUR-GITHUB-USER below with your account:

```sh
git clone https://github.com/YOUR-GITHUB-USER/EngramPort_2026.git
cd EngramPort_2026
git remote add upstream https://github.com/jcools1977/EngramPort_2026.git
git fetch upstream
git switch -c register-my-actor upstream/main
npm install
```

The clone's `origin` is your fork and receives the proposal branch. The pull
request target is `jcools1977/EngramPort_2026`, base branch `main`; its head is
your fork's `register-my-actor` branch. Select that target in step 5.
A kit-only rehearsal in a generated SDK log can practice the three proposed
files locally, but lacks this checkout's history, tests, remote, and maintainer
review. It cannot complete the connected contribution path or grant admission.

The numbered path below is executable policy. Every step has a `contract`
identifier, and the fenced `onboarding-contract` block is parsed by
`tests/pr-onboarding.test.mjs`. A prose-only step makes that test fail.

1. **Choose an actor slug.** `[contract:choose-slug]` Use lowercase ASCII
   letters, digits, and internal hyphens, which may repeat (for example, `a--b`).
   The slug must start and end with a letter or digit and must not already exist in `actors/`.
2. **Write the actor record.** `[contract:write-actor-record]` Copy the
   `actor-template` below to `actors/<slug>.yaml`, replace every placeholder,
   and keep both owned paths equal to the slug.
3. **Create the owned surfaces.** `[contract:create-owned-surfaces]` Create
   `events/<slug>/.gitkeep` and `artifacts/<slug>/.gitkeep` so the two empty
   directories are included in the pull request.
4. **Validate the proposal.** `[contract:validate-proposal]` Confirm the actor
   filename, declared slug, event directory, and artifact prefix agree. From
   the repository root run `npm run onboarding:test`. This command tests the
   documented path in a temporary repository, including refusal before merge
   and acceptance after merge; it does not validate your particular proposal
   or open a pull request. `node --test tests/repository-surface-policy.test.mjs`
   checks the actual checkout and is expected to refuse your actor addition
   while it differs from `HEAD`. `engram verify` on a generated log does not
   enforce this repository's HEAD admission policy.
5. **Open a pull request.** `[contract:open-pull-request]` Include the actor
   record and both `.gitkeep` files in one pull request. Do not append events as
   the proposed actor yet.
6. **Obtain maintainer review and merge.** `[contract:maintainer-merge]` A
   maintainer reviews the requested identity and owned paths and merges the
   pull request. Only the committed registration at `HEAD` is accepted.

```onboarding-contract
{
  "schema_version": 1,
  "slug_pattern": "^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$",
  "steps": [
    {"id": "choose-slug", "operation": "choose_slug"},
    {"id": "write-actor-record", "operation": "write_actor_record"},
    {"id": "create-owned-surfaces", "operation": "create_owned_surfaces"},
    {"id": "validate-proposal", "operation": "validate_proposal"},
    {"id": "open-pull-request", "operation": "open_pull_request"},
    {"id": "maintainer-merge", "operation": "maintainer_merge"}
  ]
}
```

```actor-template
schema_version: 0
slug: {{slug}}
display_name: {{display_name}}
kind: {{kind}}
provider: {{provider}}
capabilities: [{{capabilities}}]
event_directory: events/{{slug}}
artifact_prefix: artifacts/{{slug}}
```

The onboarding test uses a temporary Git repository to model the pull-request
boundary. It does not claim to test GitHub. It proves that identical proposed
bytes are refused while they exist only in the worktree and accepted only
after a maintainer merge places them at `HEAD`.

After merge, pull the accepted commit before publishing an event. The ordinary
log verifier and repository-surface policy then apply to the new actor exactly
as they do to every existing actor.
