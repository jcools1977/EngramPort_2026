# EngramPort

**Shared project state for humans and AI agents.** Events are immutable truth; everything else is a projection that can be deleted and rebuilt from the log.

## Install

Version 0.3.0 of `@engramport/sdk` is published on npm. With Node.js 22.13.0 or newer and npm, create a new log in an empty directory using the registry package:

```sh
mkdir my-project
cd my-project
npx @engramport/sdk init --actor me --kind human --project my-project --mode free_form
npx @engramport/sdk verify
```

`--kind` is required and accepts `human` or `agent`. `--project` defaults to `my-project` and uses the same slug pattern as `--actor`. `--mode` defaults to `free_form`; `strict_relay` is also supported. Init writes exactly `engramport.yaml`, `actors/me.yaml`, `events/me/.gitkeep`, and `artifacts/me/.gitkeep`. It refuses existing projects and nonempty directories, never overwrites files, and does not run Git or access the network. A filesystem error during creation can leave a partial scaffold.

Init creates a new log with one actor and no grant. It is separate from Port Package, which onboards a participant into an existing log under a grant decided elsewhere. A scaffolded actor is a name in a file, not an authenticated identity, and init confers no authority.

To use the JavaScript API after initialization:

```sh
npm install @engramport/sdk
```

Then:

```js
import { createClient } from "@engramport/sdk";

const engram = createClient({ actor: "me" });
const r = await engram.append({ thread: "kickoff", type: "message", body: "hello\n", next: null });
console.log(r.ok, r.relative);
```

**Check `r.ok`.** Every call returns `{ ok, errors, relative }`, and `relative` is populated on refusal too; it is the path the event *would* have taken. **Reading it without checking `ok` will convince you a write happened when it did not.** That mistake is recorded as F136, made by this project's own architect against its own package.

Init never adds an actor to an existing project. **[CONTRIBUTING.md](https://github.com/jcools1977/EngramPort_2026/blob/main/CONTRIBUTING.md)** covers joining an existing project instead: you open a pull request adding your actor record, and the maintainer's merge is the grant.

## A complete two-seat local walkthrough

Start in a separate empty directory with Node.js 22.13.0 or newer, npm, a POSIX shell, and `shasum`. Run the following blocks in order in the same shell. The default installs from npm. For an offline tarball rehearsal, first export `ENGRAM_SDK` with the absolute path of your packed SDK tarball and export `npm_config_offline=true`; the same blocks then install those local bytes. The package installs beside the log so init receives an empty directory.

This creates two founding seats in a brand-new log. It is founding, not joining an existing authorized project. One operator plays both seats for this local example; it does not demonstrate independent builders or authenticate either identity. For an existing project, use CONTRIBUTING's reviewed registration path.

<!-- second-builder:start -->
```sh
set -eu
ENGRAM_SDK="${ENGRAM_SDK:-@engramport/sdk}"
npm install --prefix tools --ignore-scripts --no-audit --no-fund "$ENGRAM_SDK"
mkdir my-project
cd my-project
engram() { ../tools/node_modules/.bin/engram "$@"; }
engram init --actor me --kind human --project my-project --mode strict_relay
mkdir -p events/builder artifacts/builder
cat > actors/builder.yaml <<'YAML'
schema_version: 0
slug: builder
display_name: Local Builder
kind: agent
provider: local
capabilities: [implementation]
event_directory: events/builder
artifact_prefix: artifacts/builder
YAML
touch events/builder/.gitkeep artifacts/builder/.gitkeep
engram verify
```

The human seat writes the task and its complete JSON input files. Each JSON flag takes a filename. Shell expansion inserts the measured SHA-256 into the artifact reference. The fixed UUIDv7 is for this fresh example only; use a fresh id for a different handoff.

```sh
cat > artifacts/me/task.txt <<'TEXT'
Write a receipt saying: The local handoff reached builder.
TEXT
TASK_DIGEST=$(shasum -a 256 artifacts/me/task.txt | cut -d ' ' -f 1)
cat > artifacts/me/context.json <<JSON
[{"type":"artifact","ref":"artifacts/me/task.txt#sha256=$TASK_DIGEST"}]
JSON
cat > artifacts/me/criteria.json <<'JSON'
[{"id":"receipt-written","statement":"Write a receipt saying: The local handoff reached builder.","evidence_classes":["artifact"]}]
JSON
cat > artifacts/me/handoff.md <<'TEXT'
Read the bound task and write the requested receipt in your own artifact directory.
TEXT
shasum -a 256 artifacts/me/task.txt
cat artifacts/me/context.json artifacts/me/criteria.json
engram append --actor me --thread first-turn --type handoff --id 01a08651-0000-7000-8000-000000000001 --next builder --body artifacts/me/handoff.md --bounded-context artifacts/me/context.json --completion-criteria artifacts/me/criteria.json --artifacts "artifacts/me/task.txt#sha256=$TASK_DIGEST"
engram inbox --actor builder
```

Now play the builder seat. Read the full addressed event and its bound task, check the digest, perform the requested work, and report the observed result. Accepted events and referenced artifacts stay unchanged. A completion uses the parent's criterion id and evidence in the builder's own directory.

```sh
cat events/me/*.md artifacts/me/task.txt
shasum -a 256 artifacts/me/task.txt
test "$(shasum -a 256 artifacts/me/task.txt | cut -d ' ' -f 1)" = "$TASK_DIGEST"
cat > artifacts/builder/receipt.txt <<'TEXT'
The local handoff reached builder.
TEXT
RECEIPT_DIGEST=$(shasum -a 256 artifacts/builder/receipt.txt | cut -d ' ' -f 1)
cat > artifacts/builder/results.json <<JSON
[{"criterion_id":"receipt-written","status":"satisfied","evidence":[{"type":"artifact","ref":"artifacts/builder/receipt.txt#sha256=$RECEIPT_DIGEST"}]}]
JSON
cat > artifacts/builder/completion.md <<'TEXT'
Read the bound task and wrote the requested receipt. The evidence is the digest-bound receipt.
TEXT
cat artifacts/builder/receipt.txt artifacts/builder/results.json
shasum -a 256 artifacts/builder/receipt.txt
engram append --actor builder --thread first-turn --type completion --reply 01a08651-0000-7000-8000-000000000001 --next null --body artifacts/builder/completion.md --criteria-results artifacts/builder/results.json --artifacts "artifacts/builder/receipt.txt#sha256=$RECEIPT_DIGEST"
engram verify
engram inbox --actor builder
```
<!-- second-builder:end -->

The final verify should report two events, one thread, and two actors. `--next null` ends this strict relay, so builder's work inbox is empty. A status of `unmet` records work that did not meet a criterion; `blocked` records an external impediment. Neither is a successful work claim. `engram append --help` in the next release documents the file shapes as well; the complete JSON above also works with 0.3.0.

## What is real and verifiable

In a clone of [this repository](https://github.com/jcools1977/EngramPort_2026), run `npm run proof:verify` (commands below). It checks the whole log: content hashes, causal links, actor ownership, strict-relay turn enforcement, and that **every Markdown file under `events/` is either an enumerated, validated event or a verification failure**.

- **564 accepted events** across the log, every one content-addressed and causally linked
- **146 mutation controls**, each one proven to fail when the behavior it guards is removed
- **79 recorded findings** in `docs/constraints.md`, including the ones where the architecture agent was wrong
- **41 architecture decision records** in `docs/adr/`

*(Event, finding and ADR counts are derived by `scripts/readme-counts` and enforced by `npm run counts:check`, which fails when this section disagrees with the repository. They were previously stated with a date and drifted anyway: on 2026-09-02 the stated 439 / 45 / 34 were actually 459 / 50 / 38. A date stamp makes a stale number defensible rather than accurate, which is F125 again and is now recorded as F143. The mutation-control total is the last value the log records, from agent-b's event of 2026-08-30, and is not derived live because the harness needs Docker.)*

## The interesting part is the log

This project was built by three agents coordinating through the protocol itself: an architect, an implementer, and an independent critic that reviewed both. **The critic stopped seven dispatches before they were sent, refuted two accepted reviews, and found a security defect the architect had reviewed past.**

That history is not summarized anywhere. **It is the log**, and it is readable in order. [The findings register](https://github.com/jcools1977/EngramPort_2026/blob/main/docs/constraints.md) is the fastest way in: each finding records what was believed, what was observed, and which of those was wrong.

## Read this before relying on it

**[SECURITY.md](https://github.com/jcools1977/EngramPort_2026/blob/main/SECURITY.md) states what EngramPort guarantees and what it does not.** In short: it provides structural integrity and auditability, and it **does not authenticate authorship**. Any party who can commit can write an event claiming to be any actor. That is measured, recorded as F127, and four separate attempts to close it in-repository are documented along with why each failed.

The security policy, findings register, and license links are hosted on GitHub. An offline reader cannot follow them and needs a local repository copy to read those documents.

**EngramPort is sound for builders who trust each other. It does not protect you from your collaborators.**

## Run the proof

These commands are only for a clone of [this repository](https://github.com/jcools1977/EngramPort_2026), starting outside any generated project. Generated projects use `engram verify` (or `npx @engramport/sdk verify`); they do not include the repository npm scripts.

```sh
git clone https://github.com/jcools1977/EngramPort_2026.git
cd EngramPort_2026
npm install
npm run proof:verify
npm test
```

`npm run db:test` additionally requires Docker.

## Related package

**`engramport` on npm is a different thing under the same brand**, and is not replaced by this repository. It is an MCP-native persistent-memory server: durable recall for a single agent, bring-your-own-LLM, graph-RAG. Install it with `npm install engramport`.

**This repository is the coordination substrate**: a verifiable record *between* several builders' agents. One remembers for one agent; the other records between many. They share a root and solve different problems.

## License

MIT. See [LICENSE](https://github.com/jcools1977/EngramPort_2026/blob/main/LICENSE).
