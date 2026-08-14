# The Port family: how the components relate

Status: proposed
Owner: agent-a (architecture)
Date: 2026-08-14

## One sentence each

| Component | What it is | Direction of data |
|---|---|---|
| **Port Log** | The immutable event history. The canonical record. | Written through the event API only |
| **EngramPort** | The durable collaboration substrate: identity, authorization, threads, projections, retrieval, and the interfaces over them | Owns Port Log |
| **Port Context** | Truth made bounded for a machine. The section 9.3 context package | Reads |
| **Port Package** | Truth made sufficient for a newcomer. The signed onboarding welcome package | Reads |
| **Port Watch** | Truth made timely. The opt-in supervisor that wakes agents when authorized work exists | Reads |
| **Re:PORT** | Truth made legible for a human. The read-only project correspondent | Reads |

## The invariant that orders them

**Port Log is truth. Everything else is a projection of it, and no projection may become truth by being useful.**

Port Context, Port Package, Port Watch, and Re:PORT are all derived. Each may be deleted and rebuilt from the log without loss. None may write project facts. Where a component does append events, and Re:PORT and Port Watch both do, those events are records of the component's own activity, never assertions about the project that the component invented.

This is ADR 0001 restated at the product level, and it is the sentence to check any future feature against.

## Why they are separate and where they share

The four derived components answer four different questions about the same log:

- Port Context: "What does this machine need to know right now, within a token budget?"
- Port Package: "What does a newcomer need to start, and how do they verify it?"
- Port Watch: "Is there authorized work, and should something wake?"
- Re:PORT: "What happened, why does it matter, and how sure are we?"

They share two cores, and building either twice would be a mistake:

**Retrieval and authorization core**, shared by Port Context, Port Package, and Re:PORT. All three must exclude inaccessible evidence *before* candidate selection, per specification sections 8 and 9.2. Three separate implementations of authorization-before-retrieval is three chances to leak. There must be one.

**Delivery core**, shared by Port Watch and Re:PORT. Both are webhook-first with cursor-based polling recovery, both must avoid work when project state is unchanged, and both inherit the at-least-once semantics of section 4.4 and the retry ladder of section 16. One implementation, two consumers.

Where they genuinely differ is the **output contract**: a token-budgeted package for a model, a signed manifest for a newcomer, a wake decision for a supervisor, an audience-shaped narrative envelope for a human. That difference is real and belongs in separate components. The retrieval underneath it does not.

## The composition, end to end

1. A participant is onboarded by **Port Package**, which is itself assembled from **Port Context** over **Port Log**, and delivered with a first handoff.
2. **Port Watch** notices authorized work for that participant and wakes it, handing it a **Port Context** package and nothing more.
3. The agent works and publishes intentional, structured events into **Port Log** through **EngramPort**.
4. **Re:PORT** reads those accepted events and tells the story to humans, citing the event ids it used.

Re:PORT closes the loop that Port Watch opens. Port Watch is how work reaches an agent without a human; Re:PORT is how a human learns what happened without reading a log. Together they are the reason a human can be absent from the loop without being absent from the project.

## The boundary each must not cross

- **Port Context** must not decide what is true; it selects and bounds, and it labels what it selected.
- **Port Package** must not grant; it carries a grant that was decided elsewhere, and its manifest is authority while its parts are data.
- **Port Watch** must not decide what an agent does; it decides only when one runs. Specification section 2.3 forbids the alternative.
- **Re:PORT** must not write project facts, assign work, approve anything, or execute; it reports, and its output is labeled generated.

Each of these is a line that an implementation crosses by accident and convenience, never by decision. Each has a corresponding structural control in its own design document rather than a rule someone is asked to remember.

## Naming note

"Port Log" and "Port Context" name things the engineering specification already defines: the canonical event log of section 5, and the context package of section 9.3. They are product names for existing primitives, not new subsystems, and the specification's terms remain normative in engineering documents.
