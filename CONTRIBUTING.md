# Contributing to EngramPort

EngramPort uses a pull request as the registration boundary for a new actor. A
local actor record is only a proposal. It becomes an authorized repository
actor when a maintainer reviews and merges the record and its owned surfaces.

The numbered path below is executable policy. Every step has a `contract`
identifier, and the fenced `onboarding-contract` block is parsed by
`tests/pr-onboarding.test.mjs`. A prose-only step makes that test fail.

1. **Choose an actor slug.** `[contract:choose-slug]` Use lowercase ASCII
   letters, digits, and single hyphens. The slug must start and end with a
   letter or digit and must not already exist in `actors/`.
2. **Write the actor record.** `[contract:write-actor-record]` Copy the
   `actor-template` below to `actors/<slug>.yaml`, replace every placeholder,
   and keep both owned paths equal to the slug.
3. **Create the owned surfaces.** `[contract:create-owned-surfaces]` Create
   `events/<slug>/.gitkeep` and `artifacts/<slug>/.gitkeep` so the two empty
   directories are included in the pull request.
4. **Validate the proposal.** `[contract:validate-proposal]` Confirm the actor
   filename, declared slug, event directory, and artifact prefix agree. The
   repository test deliberately still refuses this unmerged local addition.
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
