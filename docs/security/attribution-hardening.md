# Attribution hardening: what must be configured outside the repository

Covers **F108** (registry integrity), **F111** (unauthorized authorship) and **F113** (one identity, no signatures). These are one problem seen from three angles, and **no in-tree control resolves any of them**, because the commit that forges an event can amend whatever would have caught it.

## The order matters more than the settings

**Do not begin with branch protection.** The agents push directly to `main`, and the entire relay depends on it. Requiring pull-request review would halt coordination the moment it is enabled, and the instinct to "just turn on protection" is the change most likely to break this project while appearing to secure it.

### Step 1: give each actor its own git identity

Today `git log` shows every commit by every actor as `J. DeVere Cooley`. Until that changes, **signing proves only that DeVere's machine made the commit**, which is already known and is not the question.

Each actor needs a distinct `user.name` and `user.email` configured in the environment where it runs. This is free, reversible, and immediately makes the existing history's uniformity visible as an anomaly rather than a norm.

### Step 2: bind the identity into the actor record

`actors/*.yaml` names a slug, an event directory and an artifact prefix, and **names no key**. Adding a signing identity is what lets the verifier check that an event's claimed author signed the commit that introduced it.

**This is the first mechanism in the project that would make attribution verifiable rather than asserted**, and it is the missing link between enrollment and integrity: enrollment currently issues an authorization with nothing to bind it to.

### Step 3: require signed commits

`gh api -X PUT repos/{owner}/{repo}/branches/main/protection/required_signatures`

Compatible with direct pushes, so the relay survives. Verifies nothing useful before steps 1 and 2.

### Step 4: decide the review boundary deliberately

Required review is the only measure that addresses an **authorized** writer committing a malicious change, which is the ADR 0039 threat. It is also the one that stops the agents.

**The resolution is not technical.** It is a decision about which paths deserve friction: `actors/`, `AGENTS.md` and the verifier are the surfaces where a bad commit is unrecoverable, and `events/` is where friction would be fatal. `CODEOWNERS` scoped to the first set, rather than blanket protection, is the shape that fits.

## What remains true after all four steps

**A builder can still write a well-formed event claiming to be another actor.** Signing proves who made the commit, not that the `from:` field is honest. Closing that requires the verifier to compare the event's claimed author against the signing identity of the commit that introduced it, which is step 2's payoff and is real work rather than configuration.

**Stated plainly because the alternative is a security page that reads as complete.**

## Progress, 2026-08-31

**Steps 1 and 3 are done for the two committing actors.** DeVere generated `engramport_agent_a` and `engramport_agent_b` and registered both as GitHub signing keys. Agent-a's commits are now signed and verify locally as `G`, signed by `agent-a@engramport.local`.

**Step 2 is deliberately not done in the tree.** The `allowed_signers` mapping lives at `~/.ssh/engramport_allowed_signers`, **outside the repository**, because F128 established that an in-tree actor-to-key binding is rewritable by any actor who can commit, together with whatever check would have caught the edit. Putting the binding in `actors/*.yaml` would have looked like progress and changed nothing.

**Agent-c has no key and must not be given one.** It holds no repository write path: its events are committed by whoever runs the supervisor. A commit labeled agent-c would be another actor authoring as agent-c, which is the operation F127 measured as accepted.

**The limitation that bounds what any of this proves:** all keys live on one machine, readable by any process running as that user. **This demonstrates the mechanism and not custody.** Real per-builder isolation requires separate machines or accounts, which a genuine second builder would have and this repository never will. That belongs in the lab report rather than being discovered by a reader.

