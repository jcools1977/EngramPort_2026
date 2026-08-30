import {
  appendEvent, listInbox, listInboxEntries, validateAppendInputs,
} from "../../git-adapter/src/event-core.mjs";
import {
  FileClaimStore, FileInboxCache, FileWatchStore, PortWatch, PostgresClaimStore, RecordingRunner,
  gitAuthorizedInboxSource,
} from "../../port-watch/src/index.mjs";

export {
  FileClaimStore, FileInboxCache, FileWatchStore, PortWatch, PostgresClaimStore, RecordingRunner,
  appendEvent, gitAuthorizedInboxSource, listInbox, listInboxEntries, validateAppendInputs,
};

export const CLAIM_COVERAGE = Object.freeze([
  Object.freeze({
    id: "publish",
    coverage: "full",
    qualifier: "Typed version-1 append is delegated to event-core. Exclusive creation and actor-directory verification make never-overwrite structural.",
  }),
  Object.freeze({
    id: "discover",
    coverage: "full-with-dependency",
    qualifier: "Inbox position is log-derived. PostgreSQL claim exclusion is shared across independent connections to one reachable control database; this is not evidence from two physical machines.",
  }),
  Object.freeze({
    id: "respond",
    coverage: "full",
    qualifier: "Replies carry explicit parent ids and hashed provenance. Retry equality is canonical-intent equality only and proves no caller possession.",
  }),
  Object.freeze({
    id: "handoff",
    coverage: "full",
    qualifier: "Version-1 handoffs carry bounded references and stable completion criteria; completions require exact criterion evidence coverage.",
  }),
]);

export class EngramPortClient {
  constructor({ actor, cwd = process.cwd() } = {}) {
    if (typeof actor !== "string" || !actor) throw new TypeError("EngramPortClient requires an actor slug");
    this.actor = actor;
    this.cwd = cwd;
  }

  append(input, options = {}) {
    if (!input || typeof input !== "object") throw new TypeError("append requires an event input");
    return appendEvent({ ...input, actor: this.actor }, { cwd: this.cwd, id: options.id });
  }

  reply({ inReplyTo, ...input }, options = {}) {
    if (typeof inReplyTo !== "string" || !inReplyTo) throw new TypeError("reply requires inReplyTo");
    return this.append({ ...input, type: input.type ?? "reply", reply: inReplyTo }, options);
  }

  handoff(input, options = {}) {
    return this.append({ ...input, type: "handoff" }, options);
  }

  complete({ inReplyTo, ...input }, options = {}) {
    if (typeof inReplyTo !== "string" || !inReplyTo) throw new TypeError("complete requires inReplyTo");
    return this.append({ ...input, type: "completion", reply: inReplyTo }, options);
  }

  inbox({ entries = false } = {}) {
    return entries
      ? listInboxEntries({ actor: this.actor, cwd: this.cwd })
      : listInbox({ actor: this.actor, cwd: this.cwd });
  }

  createPortWatch({ store, runner, cache = null, claimStore = null, supervisorScopes = [], leaseMs = 300_000, state } = {}) {
    const inbox = gitAuthorizedInboxSource({ cwd: this.cwd, cache, state });
    return new PortWatch({
      store, runner, inbox, claim_store: claimStore,
      supervisor_scopes: supervisorScopes, lease_ms: leaseMs,
    });
  }
}

export function createClient(options) { return new EngramPortClient(options); }
