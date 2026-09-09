# Second-builder dry run 2 results

Actor: agent-b (Codex Builder).
Handoff: 01a0864a-ec9f-7b52-b6fc-b2df44dbdc3e.
Thread: second-builder-dry-run-2.
Repository starting commit, read after the dry run: ca8d772e6d9c67792bd10735530d7b20fd5dced2.
Temporary directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

## Outcome and criteria

| Criterion | Status | Observation |
| --- | --- | --- |
| path-walked | blocked | Init, verify, README API append, a two-actor strict relay handoff and completion, and local proposal preparation were executed. CONTRIBUTING step 5 could not be executed: no remote, no network, and no existing repository history or maintainer was supplied. The repository-specific proposal refusal test is absent from the kit. No PR or merge occurred. |
| friction-recorded | satisfied | Eight candidate documentation findings below identify text or missing text, executed commands, observations, and suggested fixes. |
| kit-only | satisfied | No source in the collaboration repository was opened during the dry run. Only the three kit files, installed tarball contents, and files generated in the temporary directory were consumed. |
| tarball-bytes | satisfied | Command 1 below computed d769d195b6aa08c62e16f5e8d1d2a60a5d22235cd1950887f08f66812293d216 with shasum, exactly matching the handoff. |

The installed CLI's final verify command reported 3 events across 2 threads and 3 actors after the newcomer proposal was added. Before that proposal, it reported 3 events across 2 threads and 2 actors. The relay used human seat me and agent seat builder. Both seats were operated by this one agent in a synthetic local project; this is not independent-builder or identity-authentication evidence.

The path-walked blocker is about unavailable external prerequisites, not an assertion that unperformed steps passed. Step 1 chose an unused slug, step 2 wrote the provided actor template, step 3 created both .gitkeep files, and step 4 checked path agreement with a recorded Python assertion. The repository-specific test part of step 4 could not be run from this package. Step 5 has only a staged three-file proposal, not an opened PR. Step 6 was not attempted. No event was appended as newcomer.

## Input boundary

Before the dry run, the required bootstrap reads were AGENTS.md, PROTOCOL.md, engramport.yaml, actors/agent-b.yaml, the named handoff, its bound event events/agent-b/20260908T195223Z_01a08294-2c71-740e-b908-85f7cc7ae610.md, and that event's artifact artifacts/agent-b/sdk-init-20260908-results.md. A lightweight memory registry search preceded the run; no historical test result was used as current evidence.

The bound artifact was opened in full. The bootstrap command
`shasum -a 256 artifacts/agent-b/sdk-init-20260908-results.md`
returned:
```text
10e4014784f1e411566f42a4db90fa8690cf841baf769643eb0fbaa58f78c65f  artifacts/agent-b/sdk-init-20260908-results.md
```
It matches the bound event. Historical parent ids and narrative references inside this evidence were not additional handoff bounded_context entries.

Before consuming the handoff, `npm run proof:verify` exited 0:
```text
> engramport@0.1.0 proof:verify
> node scripts/verify-log

✓ verified 521 events across 108 thread(s) and 3 actors
```
`npm run engram -- inbox --actor agent-b` exited 0 and listed the named handoff and two other events. Only the named handoff is answered.

The dry run began with creation of the fresh directory above and ended after command 15, the final git status and filtered file listing. No collaboration repository source was opened in that interval. Afterward, schemas/event-v1.schema.json and scripts/agent-commit were read for publication, along with Git status, branch, and HEAD. The schema's result shape requires criterion_id, status, and evidence, and permits satisfied, unmet, and blocked.

All installations used the exact local tarball with --ignore-scripts, --offline, a temporary cache, --no-audit, and --no-fund. No registry or Git host access occurred. The consumer install was outside my-project so init could run in an empty directory. The same tarball was then installed inside my-project after init to execute the README's API example. The installed bin replaced npx to enforce the supplied offline constraint.

## Candidate documentation findings

These are observed onboarding gaps or ambiguities, not fixes. No repository source or documentation was changed.

1. **Publication wording.** README says: "Create a new log in an empty directory with the SDK CLI (prepared in version 0.3.0; publication is reserved):". The handoff instead describes 0.3.0 as published. Commands 1 and 2 verify and install the supplied 0.3.0 bytes successfully offline. Registry publication was not independently tested. Proposed fix: reconcile the release wording against registry evidence and document the offline tarball alternative. This is a supplied-input discrepancy, not proof of live registry state.

2. **Missing first two-actor turn.** Missing sentence/example: how to create both founding seats and run a handoff with bounded context, criteria, a digest-bound artifact, and a completion. README provides only the single-actor createClient append example. Commands 3 through 10 show that example succeeding, then recover the missing sequence through CLI help and installed package inspection. The second founding actor was composed from CONTRIBUTING's template in the new synthetic log, without claiming an admission grant. Proposed fix: add a complete two-seat local walkthrough and clearly separate founding-seat setup from joining an existing authorized project.

3. **JSON flags are not self-describing.** Missing sentence/example: the exact JSON array shapes and that --bounded-context, --completion-criteria, and --criteria-results take filenames. Command 3's --help prints flags labeled JSON without their shape; command 5's append --help prints "ARGUMENT_REFUSED: unrecognized flag --help". Commands 6 through 8 inspect the installed tarball's bundled validation and CLI code to learn the keys and file loading behavior. Commands 9 and 10 then succeed. Proposed fix: show literal file contents and complete commands in README and support subcommand help describing JSON_FILE arguments. No collaboration repository implementation was consulted.

4. **Existing-project prerequisites are missing.** CONTRIBUTING begins "EngramPort uses a pull request as the registration boundary for a new actor." Step 5 says "Include the actor record and both `.gitkeep` files in one pull request." Missing prerequisites include cloning or forking a specific repository, obtaining a base commit, creating a branch, configuring a remote, and selecting the PR target. Commands 11 and 14 show an empty local Git repository, no remote from git remote -v, and "error: No such remote 'origin'". A tarball-generated project cannot supply the repository history or open that PR. Proposed fix: provide explicit existing-repository prerequisites and distinguish a kit-only local rehearsal from the connected contribution path. Network absence is an environment limit, not a product defect.

5. **Proposal validation has no runnable command in the kit.** CONTRIBUTING step 4 says "Confirm the actor filename, declared slug, event directory, and artifact prefix agree. The repository test deliberately still refuses this unmerged local addition." The kit gives neither a validation command nor that test implementation. Command 11 performs explicit assertions for agreement and stages exactly the three proposed files; its installed engram verify accepts three actors while the registration is merely staged. Command 13's npm test fails with Missing script: "test". Proposed fix: identify the repository checkout and exact proposal-validation command required, and explain that SDK log verification does not enforce the repository's HEAD admission policy. The observation does not refute the separate repository test, which was unavailable and was not run.

6. **Proof commands belong to a different installation context.** README says "Clone it and run `npm run proof:verify`." Its later "Run the proof" block lists npm install, npm run proof:verify, and npm test. After the SDK init/API path, command 12 fails with Missing script: "proof:verify", and command 13 fails with Missing script: "test". Proposed fix: provide a separate repository-clone workflow with explicit URL and working directory, label these as repository-only commands, and retain engram verify as the generated-project command. The clone sentence hints at the distinction but does not supply the executable transition.

7. **Slug prose and contract disagree.** CONTRIBUTING step 1 says "Use lowercase ASCII letters, digits, and single hyphens." Its contract pattern is `^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$`. Command 11 evaluates that exact pattern against a--b and prints True. No malformed actor was created. Proposed fix: either say internal hyphens may repeat or align the pattern and implementation with the intended single-hyphen rule.

8. **Prerequisite reading is outside the supplied kit.** README says "**[SECURITY.md](SECURITY.md) states what EngramPort guarantees and what it does not.**" It also directs readers to docs/constraints.md and names LICENSE. Command 1 enumerates the three kit files through shasum; command 4's installed package file listing includes only package README, package.json, and three bundled modules. Those local linked resources are absent. Proposed fix: include essential trust-boundary documentation in the starter kit or use explicit hosted links and disclose that offline readers cannot follow them. No missing resource was fetched.

## Execution transcript

The following command strings and combined output are preserved verbatim. Each entry reports the tool's exit code for the entire shell invocation. Multi-command blocks do not provide individual process exit codes; the narrative attributes their visible messages only. Commands 12, 13, and 14 ran separately, so their nonzero exits are directly observed. No npm test suite ran successfully or to a test runner. The final listing prunes dependency, cache, and Git internals as shown by its exact command. The final git status is unfiltered.

### Command 1

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
shasum -a 256 /private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit/*
```

Exit code: 0

```text
ab374038666adf2bef800c60a9620bf9567d3c039eec1e498f5b8d27ae773f22  /private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit/CONTRIBUTING.md
ac1eb0694b94bfaf53cb9888690bd9c57abfe518be2de2121fc281c048fc1cd4  /private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit/README.md
d769d195b6aa08c62e16f5e8d1d2a60a5d22235cd1950887f08f66812293d216  /private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit/engramport-sdk-0.3.0.tgz
```

### Command 2

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
mkdir consumer
cd consumer
npm install --ignore-scripts --offline --cache ../npm-cache --no-audit --no-fund /private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit/engramport-sdk-0.3.0.tgz
```

Exit code: 0

```text

added 1 package in 250ms
```

### Command 3

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
mkdir my-project
cd my-project
../consumer/node_modules/.bin/engram init --actor me --kind human --project my-project --mode free_form
../consumer/node_modules/.bin/engram verify
../consumer/node_modules/.bin/engram --help
```

Exit code: 0

```text
engramport.yaml
actors/me.yaml
events/me/.gitkeep
artifacts/me/.gitkeep
✓ verified 0 events across 0 thread(s) and 1 actors
EngramPort Git

Commands:
  init --actor SLUG --kind human|agent [--project SLUG] [--mode free_form|strict_relay]
  verify
  inbox --actor SLUG
  thread declare --thread SLUG --mode MODE [--coordinator SLUG]
  append --actor SLUG --thread SLUG --type TYPE --body FILE [--id UUIDV7] [--reply UUID] [--next SLUG] [--artifacts REF,...] [--bounded-context JSON] [--completion-criteria JSON] [--criteria-results JSON]
```

### Command 4

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
npm install --ignore-scripts --offline --cache ../npm-cache --no-audit --no-fund /private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit/engramport-sdk-0.3.0.tgz
node --input-type=module <<'JS'
import { createClient } from '@engramport/sdk';
const engram = createClient({ actor: 'me' });
const r = await engram.append({ thread: 'kickoff', type: 'message', body: 'hello\n', next: null });
console.log(r.ok, r.relative);
JS
../consumer/node_modules/.bin/engram verify
find node_modules/@engramport/sdk -maxdepth 2 -type f | sort
```

Exit code: 0

```text

added 1 package in 222ms
true events/me/20260909T131221Z_01a0864c-471e-7398-b057-edff5bce8bbe.md
✓ verified 1 events across 1 thread(s) and 1 actors
node_modules/@engramport/sdk/README.md
node_modules/@engramport/sdk/dist/cli.mjs
node_modules/@engramport/sdk/dist/event-core-B9v0rHeZ.js
node_modules/@engramport/sdk/dist/index.mjs
node_modules/@engramport/sdk/package.json
```

### Command 5

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
cat node_modules/@engramport/sdk/README.md
../consumer/node_modules/.bin/engram append --help
cat engramport.yaml actors/me.yaml
```

Exit code: 0

```text
# `@engramport/sdk`

This is the JavaScript wrapper for EngramPort Git. Its source delegates append
and inbox behavior to the same `event-core.mjs` used by the CLI and composes the
existing Port Watch package. It does not contain a second verifier, writer,
inbox resolver, or delivery engine.

The distributable contains bundled ES modules for the API and the `engram` CLI, plus their shared chunks. A clean consumer needs one tarball and no unpublished dependency. Rebuild whenever an internal source changes; the clean-package control verifies both the API and CLI from an installed tarball. Version 0.3.0 prepares init for publication; this change does not publish it.

## New project

Run in an empty directory:

```sh
npx @engramport/sdk init --actor my-agent --kind agent --project my-project --mode free_form
npx @engramport/sdk verify
```

The installed bin is also available as `engram`. Init writes exactly `engramport.yaml`, `actors/<slug>.yaml`, `events/<slug>/.gitkeep`, and `artifacts/<slug>/.gitkeep`. Kind is required (`human|agent`). Project defaults to `my-project` and must match the verifier's slug pattern; mode defaults to `free_form` and also accepts `strict_relay`. Existing projects refuse with `INIT_PROJECT_EXISTS` and a pointer to `CONTRIBUTING.md`. Other nonempty directories refuse, and every file write uses exclusive creation. A filesystem error during creation can leave a partial scaffold. Init performs no Git or network operation.

Init creates one actor and no grant. It is separate from Port Package, which onboards a participant into an existing log under a grant decided elsewhere. The actor is a name in a file, not an authenticated identity; init confers no authority. Joining an existing project remains the pull request process in [CONTRIBUTING.md](https://github.com/jcools1977/EngramPort_2026/blob/main/CONTRIBUTING.md).

## API

```js
import { createClient, FileWatchStore, PostgresClaimStore, RecordingRunner } from "@engramport/sdk";

const port = createClient({ actor: "agent-b", cwd: process.cwd() });

const event = await port.append({
  thread: "example",
  type: "message",
  body: "Durable project fact.\n",
}, { id: callerControlledUuidV7 });

const addressed = await port.inbox({ entries: true });

const watch = port.createPortWatch({
  store: new FileWatchStore(".engramport/watch.json"),
  claimStore: new PostgresClaimStore(postgresPool),
  runner: new RecordingRunner(),
});
```

`append`, `reply`, `handoff`, and `complete` return the event-core result. A retry with the same UUIDv7 and complete canonical intent returns the existing event with `reused: true`. Reusing that identity for a different intent raises `APPEND_INTENT_COLLISION`. This is intent-level idempotence only: it neither authenticates a caller nor proves possession of a retry identity.

If the configured actor is absent from `actors/*.yaml`, event-core refuses the candidate because its event path is not registered. The SDK returns that refusal unchanged and creates no actor directory. This registry check is log structure validation, not enrollment or authorization; database enrollment and Git write authority remain separate boundaries.

Artifact references are likewise verified by event-core. An event authored as one actor cannot cite an `artifacts/<other-actor>/...` path in its top-level artifact list.

## Claim coverage and qualifiers

| Site claim | Coverage | What this package actually delivers |
| --- | --- | --- |
| Append a typed event; never overwrite another participant's history | Full | The SDK calls the shared version-1 writer. A fresh identity determines an actor-owned path, `wx` performs exclusive creation, and whole-log verification enforces actor-directory ownership. Never-overwrite is structural; there is no staged refusal for a public operation that cannot address another actor's accepted path. |
| Find addressed work; Port Watch delivers new work | Full with a service dependency | Shared inbox discovery and the existing Port Watch runner path are exposed. Delivery position is derived from the Git log. `PostgresClaimStore` makes claim and lease exclusion visible to independent connections using one reachable PostgreSQL control stream. The test does not run on two physical machines, so it proves that exclusion is not process- or filesystem-local, not that cross-machine networking or availability works. |
| Reply with causal links, provenance, and safe retries | Full, at intent level | `reply` requires an explicit parent id; event-core binds actor, body hash, parent, target, artifacts, and envelope fields into the append-intent digest. No caller-possession claim is made. |
| Transfer responsibility with bounded context and completion criteria | Full | `handoff` emits the version-1 bounded context and stable-id criteria fields; `complete` is accepted only with exact criterion evidence coverage. |

The SDK grants no authority. Git host identity, branch protection, enrollment, and approvals remain outside this wrapper.

Portable work-delivery exclusion now requires the PostgreSQL control stream to be reachable. This sharpens, but does not resolve here, the tension with ADR 0039's no-server description; ADR 0044 already accepts shared infrastructure for delivery state.
engram: ARGUMENT_REFUSED: unrecognized flag --help
protocol: engramport-git-v0
project: my-project
mode: free_form
default_thread_mode: free_form
event_root: events
actor_root: actors
artifact_root: artifacts
hash_profile: engramport-git-body-v0
schema_version: 0
schema_version: 0
slug: me
display_name: me
kind: human
provider: unspecified
capabilities: []
event_directory: events/me
artifact_prefix: artifacts/me
```

### Command 6

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
rg -n 'completion_criteria|criteria_results|evidence_classes|bounded_context|criterion_id' node_modules/@engramport/sdk/dist/event-core-*.js | head -80
```

Exit code: 0

```text
119:	"bounded_context",
120:	"completion_criteria",
121:	"criteria_results"
178:function hashAppendIntent({ actor, thread, type, reply = null, next = null, content_sha256, artifacts = [], bounded_context = null, completion_criteria = null, criteria_results = null }) {
182:		bounded_context,
183:		completion_criteria,
185:		criteria_results,
364:		if (!Array.isArray(m.bounded_context) || m.bounded_context.length < 1 || m.bounded_context.length > MAX_CONTEXT_REFS) errors.push(`${relative}: bounded_context must contain 1-${MAX_CONTEXT_REFS} references`);
366:			if (encodedBytes(m.bounded_context) > MAX_CONTEXT_BYTES) errors.push(`${relative}: bounded_context exceeds ${MAX_CONTEXT_BYTES} encoded bytes`);
367:			m.bounded_context.forEach((reference, index) => validateReference(reference, `${relative}: bounded_context[${index}]`, errors));
369:		if (!Array.isArray(m.completion_criteria) || m.completion_criteria.length < 1 || m.completion_criteria.length > MAX_CRITERIA) errors.push(`${relative}: completion_criteria must contain 1-${MAX_CRITERIA} criteria`);
371:			if (encodedBytes(m.completion_criteria) > MAX_CRITERIA_BYTES) errors.push(`${relative}: completion_criteria exceeds ${MAX_CRITERIA_BYTES} encoded bytes`);
373:			m.completion_criteria.forEach((criterion, index) => {
374:				const label = `${relative}: completion_criteria[${index}]`;
379:				if (Object.keys(criterion).sort().join(",") !== "evidence_classes,id,statement") errors.push(`${label}: fields must be id, statement, and evidence_classes`);
384:				if (!Array.isArray(criterion.evidence_classes) || criterion.evidence_classes.length < 1 || criterion.evidence_classes.some((value) => !EVIDENCE_CLASSES.has(value)) || new Set(criterion.evidence_classes).size !== criterion.evidence_classes.length) errors.push(`${label}: evidence_classes must be a unique non-empty subset of event and artifact`);
387:		if (m.criteria_results !== void 0) errors.push(`${relative}: criteria_results is permitted only on completion events`);
389:		if (m.bounded_context !== void 0 || m.completion_criteria !== void 0) errors.push(`${relative}: bounded_context and completion_criteria are permitted only on handoff events`);
390:		if (m.criteria_results !== void 0) if (!Array.isArray(m.criteria_results) || m.criteria_results.length > MAX_CRITERIA) errors.push(`${relative}: criteria_results must contain at most ${MAX_CRITERIA} results`);
391:		else m.criteria_results.forEach((result, index) => {
392:			const label = `${relative}: criteria_results[${index}]`;
397:			if (Object.keys(result).sort().join(",") !== "criterion_id,evidence,status") errors.push(`${label}: fields must be criterion_id, status, and evidence`);
398:			if (!CRITERION_ID.test(result.criterion_id ?? "")) errors.push(`${label}: invalid criterion_id`);
403:	} else if (m.bounded_context !== void 0 || m.completion_criteria !== void 0 || m.criteria_results !== void 0) errors.push(`${relative}: structured handoff/completion fields are not permitted on ${m.type} events`);
494:					bounded_context: parsed.meta.bounded_context ?? null,
495:					completion_criteria: parsed.meta.completion_criteria ?? null,
496:					criteria_results: parsed.meta.criteria_results ?? null
603:		for (const [index, reference] of (event.meta.bounded_context ?? []).entries()) await resolveBoundReference(reference, event, `${event.relative}: bounded_context[${index}]`);
611:			if (event.meta.criteria_results !== void 0) errors.push(`${event.relative}: criteria_results cannot be supplied for a version-0 handoff`);
614:		const criteria = new Map((parent.meta.completion_criteria ?? []).map((criterion) => [criterion.id, criterion]));
615:		const results = event.meta.criteria_results;
617:			errors.push(`${event.relative}: criteria_results is required for a version-1 handoff completion`);
620:		const resultIds = results.map((result) => result?.criterion_id);
627:			const criterion = criteria.get(result?.criterion_id);
629:				if (criterion && !criterion.evidence_classes.includes(reference?.type)) errors.push(`${event.relative}: criterion ${criterion.id} does not permit ${reference?.type} evidence`);
630:				await resolveBoundReference(reference, event, `${event.relative}: criteria_results[${resultIndex}].evidence[${evidenceIndex}]`);
783:		bounded_context: boundedContext ?? null,
784:		completion_criteria: completionCriteria ?? null,
785:		criteria_results: criteriaResults ?? null
810:	if (boundedContext !== void 0) meta.push(line("bounded_context", boundedContext));
811:	if (completionCriteria !== void 0) meta.push(line("completion_criteria", completionCriteria));
812:	if (criteriaResults !== void 0) meta.push(line("criteria_results", criteriaResults));
```

### Command 7

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
sed -n '280,325p' node_modules/@engramport/sdk/dist/event-core-*.js
sed -n '369,404p' node_modules/@engramport/sdk/dist/event-core-*.js
rg -n 'function validateReference|--bounded-context|readJson|completion-criteria' node_modules/@engramport/sdk/dist/cli.mjs node_modules/@engramport/sdk/dist/event-core-*.js
```

Exit code: 0

```text
async function actorSurfaceIdentity(root, relative, source) {
	if (path.isAbsolute(relative)) throw new Error(`${source}: actor-owned prefix must be repository-relative`);
	const rootReal = await realpath(root);
	const absolute = path.resolve(root, relative);
	let surfaceReal;
	try {
		surfaceReal = await realpath(absolute);
	} catch {
		const portable = normalizeActorSurfaceIdentity(relative);
		surfaceReal = await realpath(path.resolve(root, portable));
	}
	const repositoryRelative = path.relative(rootReal, surfaceReal);
	if (repositoryRelative === ".." || repositoryRelative.startsWith(`..${path.sep}`) || path.isAbsolute(repositoryRelative)) throw new Error(`${source}: actor-owned prefix escapes repository root`);
	return normalizeActorSurfaceIdentity(repositoryRelative.split(path.sep).join("/"));
}
function assertActorSurfacesDisjoint(actors, field, label) {
	const records = [...actors.values()];
	for (let index = 0; index < records.length; index += 1) for (let other = index + 1; other < records.length; other += 1) if (inSurface(records[index][field], records[other][field]) || inSurface(records[other][field], records[index][field])) throw new Error(`${label} must be disjoint after realpath, case-folding, and Unicode normalization: ${records[index].slug} overlaps ${records[other].slug}`);
}
async function readActors(root, actorDir = path.join(root, "actors"), { strictSlugs = true } = {}) {
	const actors = /* @__PURE__ */ new Map();
	for (const name of await readdir(actorDir)) {
		if (!name.endsWith(".yaml")) continue;
		const text = await readFile(path.join(actorDir, name), "utf8");
		const slug = text.match(/^slug:\s*([^\s]+)\s*$/m)?.[1];
		const eventDirectory = text.match(/^event_directory:\s*([^\s]+)\s*$/m)?.[1];
		const artifactPrefix = text.match(/^artifact_prefix:\s*([^\s]+)\s*$/m)?.[1];
		if (!slug || !eventDirectory || !artifactPrefix) throw new Error(`actors/${name}: incomplete actor record`);
		if (name !== `${slug}.yaml`) throw new Error(`actors/${name}: filename must match declared slug ${slug}`);
		if (strictSlugs && !SLUG.test(slug)) throw new Error(`actors/${name}: invalid actor slug ${slug}`);
		if (eventDirectory !== `events/${slug}`) throw new Error(`actors/${name}: event_directory must match the append path for ${slug}`);
		if (artifactPrefix !== `artifacts/${slug}`) throw new Error(`actors/${name}: artifact_prefix must remain actor-specific`);
		if (actors.has(slug)) throw new Error(`actors/${name}: duplicate actor slug ${slug}`);
		const eventSurfaceIdentity = await actorSurfaceIdentity(root, eventDirectory, `actors/${name}`);
		const artifactSurfaceIdentity = await actorSurfaceIdentity(root, artifactPrefix, `actors/${name}`);
		actors.set(slug, {
			slug,
			eventDirectory,
			artifactPrefix,
			eventSurfaceIdentity,
			artifactSurfaceIdentity
		});
	}
	assertActorSurfacesDisjoint(actors, "eventSurfaceIdentity", "actor event directories");
	assertActorSurfacesDisjoint(actors, "artifactSurfaceIdentity", "actor artifact prefixes");
	return actors;
		if (!Array.isArray(m.completion_criteria) || m.completion_criteria.length < 1 || m.completion_criteria.length > MAX_CRITERIA) errors.push(`${relative}: completion_criteria must contain 1-${MAX_CRITERIA} criteria`);
		else {
			if (encodedBytes(m.completion_criteria) > MAX_CRITERIA_BYTES) errors.push(`${relative}: completion_criteria exceeds ${MAX_CRITERIA_BYTES} encoded bytes`);
			const ids = /* @__PURE__ */ new Set();
			m.completion_criteria.forEach((criterion, index) => {
				const label = `${relative}: completion_criteria[${index}]`;
				if (!criterion || typeof criterion !== "object" || Array.isArray(criterion)) {
					errors.push(`${label}: criterion must be an object`);
					return;
				}
				if (Object.keys(criterion).sort().join(",") !== "evidence_classes,id,statement") errors.push(`${label}: fields must be id, statement, and evidence_classes`);
				if (!CRITERION_ID.test(criterion.id ?? "")) errors.push(`${label}: invalid criterion id`);
				else if (ids.has(criterion.id)) errors.push(`${relative}: duplicate criterion id ${criterion.id}`);
				else ids.add(criterion.id);
				if (typeof criterion.statement !== "string" || !criterion.statement.trim() || Buffer.byteLength(criterion.statement, "utf8") > 1024) errors.push(`${label}: statement must contain 1-1024 bytes`);
				if (!Array.isArray(criterion.evidence_classes) || criterion.evidence_classes.length < 1 || criterion.evidence_classes.some((value) => !EVIDENCE_CLASSES.has(value)) || new Set(criterion.evidence_classes).size !== criterion.evidence_classes.length) errors.push(`${label}: evidence_classes must be a unique non-empty subset of event and artifact`);
			});
		}
		if (m.criteria_results !== void 0) errors.push(`${relative}: criteria_results is permitted only on completion events`);
	} else if (m.type === "completion") {
		if (m.bounded_context !== void 0 || m.completion_criteria !== void 0) errors.push(`${relative}: bounded_context and completion_criteria are permitted only on handoff events`);
		if (m.criteria_results !== void 0) if (!Array.isArray(m.criteria_results) || m.criteria_results.length > MAX_CRITERIA) errors.push(`${relative}: criteria_results must contain at most ${MAX_CRITERIA} results`);
		else m.criteria_results.forEach((result, index) => {
			const label = `${relative}: criteria_results[${index}]`;
			if (!result || typeof result !== "object" || Array.isArray(result)) {
				errors.push(`${label}: result must be an object`);
				return;
			}
			if (Object.keys(result).sort().join(",") !== "criterion_id,evidence,status") errors.push(`${label}: fields must be criterion_id, status, and evidence`);
			if (!CRITERION_ID.test(result.criterion_id ?? "")) errors.push(`${label}: invalid criterion_id`);
			if (!COMPLETION_STATUS.has(result.status)) errors.push(`${label}: status must be one of ${[...COMPLETION_STATUS].join(", ")}`);
			if (!Array.isArray(result.evidence) || result.evidence.length < 1 || result.evidence.length > MAX_CONTEXT_REFS) errors.push(`${label}: evidence must contain 1-${MAX_CONTEXT_REFS} references`);
			else result.evidence.forEach((reference, evidenceIndex) => validateReference(reference, `${label}.evidence[${evidenceIndex}]`, errors));
		});
	} else if (m.bounded_context !== void 0 || m.completion_criteria !== void 0 || m.criteria_results !== void 0) errors.push(`${relative}: structured handoff/completion fields are not permitted on ${m.type} events`);
}
node_modules/@engramport/sdk/dist/cli.mjs:643:		"completion-criteria",
node_modules/@engramport/sdk/dist/cli.mjs:756:		const readJsonArray = async (flag) => {
node_modules/@engramport/sdk/dist/cli.mjs:762:		const boundedContext = await readJsonArray("bounded-context");
node_modules/@engramport/sdk/dist/cli.mjs:763:		const completionCriteria = await readJsonArray("completion-criteria");
node_modules/@engramport/sdk/dist/cli.mjs:764:		const criteriaResults = await readJsonArray("criteria-results");
node_modules/@engramport/sdk/dist/cli.mjs:790:	console.log("EngramPort Git\n\nCommands:\n  init --actor SLUG --kind human|agent [--project SLUG] [--mode free_form|strict_relay]\n  verify\n  inbox --actor SLUG\n  thread declare --thread SLUG --mode MODE [--coordinator SLUG]\n  append --actor SLUG --thread SLUG --type TYPE --body FILE [--id UUIDV7] [--reply UUID] [--next SLUG] [--artifacts REF,...] [--bounded-context JSON] [--completion-criteria JSON] [--criteria-results JSON]");
node_modules/@engramport/sdk/dist/event-core-B9v0rHeZ.js:346:function validateReference(reference, label, errors) {
```

### Command 8

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
sed -n '346,363p' node_modules/@engramport/sdk/dist/event-core-*.js
sed -n '744,775p' node_modules/@engramport/sdk/dist/cli.mjs
```

Exit code: 0

```text
function validateReference(reference, label, errors) {
	if (!reference || typeof reference !== "object" || Array.isArray(reference)) {
		errors.push(`${label}: reference must be an object`);
		return;
	}
	const keys = Object.keys(reference);
	if (reference.type === "event") {
		if (keys.length !== 2 || !keys.includes("event_id")) errors.push(`${label}: event reference fields must be type and event_id`);
		if (!UUID_V7.test(reference.event_id ?? "")) errors.push(`${label}: invalid event_id`);
	} else if (reference.type === "artifact") {
		if (keys.length !== 2 || !keys.includes("ref")) errors.push(`${label}: artifact reference fields must be type and ref`);
		if (typeof reference.ref !== "string" || !/^([^#]+)#sha256=([0-9a-f]{64})$/.test(reference.ref)) errors.push(`${label}: invalid artifact ref`);
	} else errors.push(`${label}: reference type must be event or artifact`);
}
function validateV1Envelope(event, relative, errors) {
	const m = event.meta;
	if (!SHA256.test(m.intent_sha256 ?? "")) errors.push(`${relative}: invalid intent_sha256`);
	if (m.type === "handoff") {
		if (!files.length) console.log(`No open events addressed to ${options.actor}.`);
		return 0;
	}
	if (command === "append") {
		for (const required of [
			"actor",
			"thread",
			"type",
			"body"
		]) if (!options[required]) throw new Error(`append requires --${required}`);
		const body = await readFile(path.resolve(cwd, options.body), "utf8");
		const artifacts = options.artifacts ? options.artifacts.split(",").filter(Boolean) : [];
		const readJsonArray = async (flag) => {
			if (!options[flag]) return void 0;
			const value = JSON.parse(await readFile(path.resolve(cwd, options[flag]), "utf8"));
			if (!Array.isArray(value)) throw new Error(`append requires --${flag} to contain a JSON array`);
			return value;
		};
		const boundedContext = await readJsonArray("bounded-context");
		const completionCriteria = await readJsonArray("completion-criteria");
		const criteriaResults = await readJsonArray("criteria-results");
		const schemaVersion = options["schema-version"] === void 0 ? void 0 : Number(options["schema-version"]);
		const next = options.next === "null" ? null : options.next;
		const result = await appendEvent({
			actor: options.actor,
			thread: options.thread,
			type: options.type,
			body,
			reply: options.reply,
			next,
			artifacts,
			schemaVersion,
```

### Command 9

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
python3 <<'PY'
from pathlib import Path
kit=Path('/private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit')
template=(kit/'CONTRIBUTING.md').read_text().split('```actor-template\n')[1].split('```')[0]
for key,value in dict(slug='builder',display_name='Dry Run Builder',kind='agent',provider='local',capabilities='implementation').items():
    template=template.replace('{{'+key+'}}',value)
Path('actors/builder.yaml').write_text(template)
for prefix in ('events','artifacts'):
    p=Path(prefix)/'builder'
    p.mkdir()
    (p/'.gitkeep').touch()
Path('artifacts/me/task.txt').write_text('Write a local receipt stating that the kit-only relay ran.\n')
import hashlib,json
ref='artifacts/me/task.txt#sha256='+hashlib.sha256(Path('artifacts/me/task.txt').read_bytes()).hexdigest()
Path('../context.json').write_text(json.dumps([dict(type='artifact',ref=ref)]))
Path('../criteria.json').write_text(json.dumps([dict(id='receipt-written',statement='A local relay receipt is written.',evidence_classes=['artifact'])]))
Path('../handoff.md').write_text('Write a local receipt stating that the kit-only relay ran.\n')
print(template,end='')
print(ref)
PY
../consumer/node_modules/.bin/engram verify
../consumer/node_modules/.bin/engram thread declare --thread kit-relay --mode strict_relay
shasum -a 256 artifacts/me/task.txt
../consumer/node_modules/.bin/engram append --actor me --thread kit-relay --type handoff --next builder --body ../handoff.md --bounded-context ../context.json --completion-criteria ../criteria.json --artifacts "artifacts/me/task.txt#sha256=$(shasum -a 256 artifacts/me/task.txt | cut -d ' ' -f 1)"
../consumer/node_modules/.bin/engram inbox --actor builder
```

Exit code: 0

```text
schema_version: 0
slug: builder
display_name: Dry Run Builder
kind: agent
provider: local
capabilities: [implementation]
event_directory: events/builder
artifact_prefix: artifacts/builder
artifacts/me/task.txt#sha256=88ad389096ba205bc5d794d53a805d4105ed090f38424b835e7a6020ce79fd64
✓ verified 1 events across 1 thread(s) and 2 actors
threads/kit-relay.yaml
88ad389096ba205bc5d794d53a805d4105ed090f38424b835e7a6020ce79fd64  artifacts/me/task.txt
events/me/20260909T131316Z_01a0864d-21b3-7a2b-bcbb-34d4eb7fb0a6.md
events/me/20260909T131316Z_01a0864d-21b3-7a2b-bcbb-34d4eb7fb0a6.md
```

### Command 10

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
cat events/me/20260909T131316Z_01a0864d-21b3-7a2b-bcbb-34d4eb7fb0a6.md artifacts/me/task.txt
python3 <<'PY'
from pathlib import Path
import hashlib,json
Path('artifacts/builder/receipt.txt').write_text('The installed kit CLI delivered the local handoff to builder. This receipt records the local relay work.\n')
ref='artifacts/builder/receipt.txt#sha256='+hashlib.sha256(Path('artifacts/builder/receipt.txt').read_bytes()).hexdigest()
Path('../results.json').write_text(json.dumps([dict(criterion_id='receipt-written',status='satisfied',evidence=[dict(type='artifact',ref=ref)])]))
Path('../completion.md').write_text('Wrote the local relay receipt. Evidence is the bound artifact.\n')
print(Path('../results.json').read_text())
PY
shasum -a 256 artifacts/builder/receipt.txt
../consumer/node_modules/.bin/engram append --actor builder --thread kit-relay --type completion --reply 01a0864d-21b3-7a2b-bcbb-34d4eb7fb0a6 --next me --body ../completion.md --criteria-results ../results.json --artifacts "artifacts/builder/receipt.txt#sha256=$(shasum -a 256 artifacts/builder/receipt.txt | cut -d ' ' -f 1)"
../consumer/node_modules/.bin/engram inbox --actor me
../consumer/node_modules/.bin/engram verify
```

Exit code: 0

```text
---
schema_version: 1
id: 01a0864d-21b3-7a2b-bcbb-34d4eb7fb0a6
thread: kit-relay
from: me
type: handoff
occurred_at: 2026-09-09T13:13:16Z
in_reply_to: null
next: builder
content_sha256: 88ad389096ba205bc5d794d53a805d4105ed090f38424b835e7a6020ce79fd64
intent_sha256: 3ed878ffbacfb0b070bab5c6a7f105b10b782785af3f28e6f5cee424b6dc7530
thread_config_sha256: 570e537a927d9b33bdfe74faa8a8a2e1e6e453709a648f70e845365d3362c294
artifacts: [artifacts/me/task.txt#sha256=88ad389096ba205bc5d794d53a805d4105ed090f38424b835e7a6020ce79fd64]
bounded_context: [{"type":"artifact","ref":"artifacts/me/task.txt#sha256=88ad389096ba205bc5d794d53a805d4105ed090f38424b835e7a6020ce79fd64"}]
completion_criteria: [{"id":"receipt-written","statement":"A local relay receipt is written.","evidence_classes":["artifact"]}]
---
Write a local receipt stating that the kit-only relay ran.
Write a local receipt stating that the kit-only relay ran.
[{"criterion_id": "receipt-written", "status": "satisfied", "evidence": [{"type": "artifact", "ref": "artifacts/builder/receipt.txt#sha256=83a3ff6a82f5801575cb8edb55ed2b80c148ddc5facbef6dd99121919fa47661"}]}]
83a3ff6a82f5801575cb8edb55ed2b80c148ddc5facbef6dd99121919fa47661  artifacts/builder/receipt.txt
events/builder/20260909T131330Z_01a0864d-56c3-70cf-a5d1-b2d900c50206.md
events/builder/20260909T131330Z_01a0864d-56c3-70cf-a5d1-b2d900c50206.md
✓ verified 3 events across 2 thread(s) and 2 actors
```

### Command 11

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
git init
git remote -v
python3 <<'PY'
from pathlib import Path
import re
kit=Path('/private/tmp/claude-501/-Users-an2b-an2b-products-EngramPORT/a3345918-9d56-442d-b7d5-6d83f9aeeba3/scratchpad/dryrun-kit')
slug='newcomer'
assert not (Path('actors')/(slug+'.yaml')).exists()
template=(kit/'CONTRIBUTING.md').read_text().split('```actor-template\n')[1].split('```')[0]
for key,value in dict(slug=slug,display_name='New Builder',kind='agent',provider='local',capabilities='implementation').items():
    template=template.replace('{{'+key+'}}',value)
p=Path('actors')/(slug+'.yaml')
p.write_text(template)
for prefix in ('events','artifacts'):
    d=Path(prefix)/slug
    d.mkdir()
    (d/'.gitkeep').touch()
fields=dict(line.split(': ',1) for line in p.read_text().splitlines())
assert p.name==fields['slug']+'.yaml'
assert fields['event_directory']=='events/'+slug
assert fields['artifact_prefix']=='artifacts/'+slug
assert '{{' not in p.read_text()
print('Proposal filename, slug, event directory, artifact prefix, placeholders: agree')
print(template,end='')
print('Contract regex accepts a--b:',bool(re.fullmatch(r'^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$', 'a--b')))
PY
../consumer/node_modules/.bin/engram verify
git add actors/newcomer.yaml events/newcomer/.gitkeep artifacts/newcomer/.gitkeep
git diff --cached --stat
git diff --cached -- actors/newcomer.yaml events/newcomer/.gitkeep artifacts/newcomer/.gitkeep
```

Exit code: 0

```text
Initialized empty Git repository in /private/var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r/my-project/.git/
Proposal filename, slug, event directory, artifact prefix, placeholders: agree
schema_version: 0
slug: newcomer
display_name: New Builder
kind: agent
provider: local
capabilities: [implementation]
event_directory: events/newcomer
artifact_prefix: artifacts/newcomer
Contract regex accepts a--b: True
✓ verified 3 events across 2 thread(s) and 3 actors
 actors/newcomer.yaml        | 8 ++++++++
 artifacts/newcomer/.gitkeep | 0
 events/newcomer/.gitkeep    | 0
 3 files changed, 8 insertions(+)
diff --git a/actors/newcomer.yaml b/actors/newcomer.yaml
new file mode 100644
index 0000000..891e4e6
--- /dev/null
+++ b/actors/newcomer.yaml
@@ -0,0 +1,8 @@
+schema_version: 0
+slug: newcomer
+display_name: New Builder
+kind: agent
+provider: local
+capabilities: [implementation]
+event_directory: events/newcomer
+artifact_prefix: artifacts/newcomer
diff --git a/artifacts/newcomer/.gitkeep b/artifacts/newcomer/.gitkeep
new file mode 100644
index 0000000..e69de29
diff --git a/events/newcomer/.gitkeep b/events/newcomer/.gitkeep
new file mode 100644
index 0000000..e69de29
```

### Command 12

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
npm run proof:verify
```

Exit code: 1

```text
npm error Missing script: "proof:verify"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error Log files were not written due to an error writing to the directory: /Users/an2b/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```

### Command 13

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
npm test
```

Exit code: 1

```text
npm error Missing script: "test"
npm error
npm error To see a list of scripts, run:
npm error   npm run
npm error Log files were not written due to an error writing to the directory: /Users/an2b/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```

### Command 14

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
git remote get-url origin
```

Exit code: 2

```text
error: No such remote 'origin'
```

### Command 15

Working directory: /var/folders/n_/dfsqwnt95498qcjqzznwvvhr0000gn/T/engramport-second-builder-RFan1r

```sh
cd my-project
git status --short
find .. -path '*/.git' -prune -o -path '*/node_modules' -prune -o -path '*/npm-cache' -prune -o -type f -print | sort
```

Exit code: 0

```text
A  actors/newcomer.yaml
A  artifacts/newcomer/.gitkeep
A  events/newcomer/.gitkeep
?? actors/builder.yaml
?? actors/me.yaml
?? artifacts/builder/
?? artifacts/me/
?? engramport.yaml
?? events/builder/
?? events/me/
?? node_modules/
?? package-lock.json
?? package.json
?? threads/
../completion.md
../consumer/package-lock.json
../consumer/package.json
../context.json
../criteria.json
../handoff.md
../my-project/actors/builder.yaml
../my-project/actors/me.yaml
../my-project/actors/newcomer.yaml
../my-project/artifacts/builder/.gitkeep
../my-project/artifacts/builder/receipt.txt
../my-project/artifacts/me/.gitkeep
../my-project/artifacts/me/task.txt
../my-project/artifacts/newcomer/.gitkeep
../my-project/engramport.yaml
../my-project/events/builder/.gitkeep
../my-project/events/builder/20260909T131330Z_01a0864d-56c3-70cf-a5d1-b2d900c50206.md
../my-project/events/me/.gitkeep
../my-project/events/me/20260909T131221Z_01a0864c-471e-7398-b057-edff5bce8bbe.md
../my-project/events/me/20260909T131316Z_01a0864d-21b3-7a2b-bcbb-34d4eb7fb0a6.md
../my-project/events/newcomer/.gitkeep
../my-project/package-lock.json
../my-project/package.json
../my-project/threads/kit-relay.yaml
../results.json
```

