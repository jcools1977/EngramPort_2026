// Pure projection of verified Git event metadata. Actor claims are observations,
// not independent proof of execution. Corrections never replace observations.
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}
function environmentKey({ version, platform, tree_shape }) {
  // Observation time is not an environment identity. Repeating a command in
  // the same pinned environment must be able to resolve its earlier result.
  return canonical({ version, platform, tree_shape });
}
function criterionKey(handoffId, criterionId) { return `${handoffId}:${criterionId}`; } /* V2_REPORT_HANDOFF_KEY */

export function deriveCriteriaReport(events) {
  const ordered = [...events.values()].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at) || a.id.localeCompare(b.id));
  const byId = new Map(ordered.map((e) => [e.id, e]));
  const groups = new Map();
  for (const event of ordered) for (const criterion of event.completion_criteria ?? []) {
    const key = criterionKey(event.id, criterion.id);
    if (!groups.has(key)) groups.set(key, { handoff_id: event.id, criterion_id: criterion.id, statement: criterion.statement, observations: [], latest: new Map(), conflict: null, decision: null });
  }
  ordered.forEach((event, order) => {
    for (const criterion of event.completion_criteria ?? []) {
      const restates = criterion.restates;
      if (!restates) continue;
      const target = byId.get(restates.handoff_id);
      const group = groups.get(criterionKey(restates.handoff_id, criterion.id));
      if (group && target?.from === event.from && target.id !== event.id) group.decision = { event_id: event.id, environment: restates.environment, statement: criterion.statement }; /* V2_REPORT_OWNER */
    }
    if (event.type !== "completion") return;
    let parent = byId.get(event.in_reply_to);
    if (parent?.type === "withdrawal") parent = byId.get(parent.in_reply_to);
    if (parent?.type !== "handoff") return;
    const touched = new Set();
    for (const result of event.criteria_results ?? []) {
      const group = groups.get(criterionKey(parent.id, result.criterion_id));
      if (!group) continue;
      const observation = { event_id: event.id, status: result.status, evidence: result.evidence, environment: result.environment ?? null };
      group.observations.push(observation);
      if (event.schema_version !== 2 || !result.environment) continue;
      const key = environmentKey(result.environment);
      const existing = group.latest.get(key);
      // Retain conflicting entries within a single completion, not last-entry-wins.
      const statuses = existing?.order === order ? new Set(existing.statuses) : new Set();
      statuses.add(result.status);
      group.latest.set(key, { order, statuses });
      touched.add(group);
    }
    for (const group of touched) {
      const entries = [...group.latest.entries()];
      const differing = entries.filter(([key, value]) => entries.some(([otherKey, other]) => key !== otherKey && [...value.statuses].some((s) => [...other.statuses].some((v) => s !== v))));
      if (differing.length) {
        if (!group.conflict) group.conflict = { order, pinned: new Set() };
        for (const [key] of differing) group.conflict.pinned.add(key);
      }
      if (group.conflict) {
        const pins = [...group.conflict.pinned].map((key) => group.latest.get(key));
        const statuses = new Set(pins.flatMap((v) => [...v.statuses]));
        if (pins.every((v) => v.order > group.conflict.order) && statuses.size === 1 && differing.length === 0) group.conflict = null; /* V2_REPORT_CLEAR_BOTH */
      }
    }
  });
  const criteria = [...groups.values()].map((g) => ({
    handoff_id: g.handoff_id, criterion_id: g.criterion_id, statement: g.statement,
    state: g.decision ? "decided-by-owner" : g.conflict ? "contested" : g.observations.length ? "observed" : "cannot-tell",
    observations: g.observations, owner_restatement: g.decision,
  }));
  const records = ordered.filter((e) => e.type !== "correction").map((event) => ({
    event_id: event.id, type: event.type, criteria_results: event.criteria_results ?? [],
    corrections: ordered.filter((c) => c.type === "correction" && c.corrects === event.id).map((c) => ({ event_id: c.id, corrects: c.corrects, from: c.from })),
  })); /* V2_REPORT_PRESERVE_ORIGINAL */
  const markdown = ["## Criteria observations", "", ...(criteria.length ? criteria.map((c) => `- Handoff ${c.handoff_id}, criterion ${c.criterion_id}: ${c.state}. Observations: ${c.observations.map((o) => `${o.event_id} status=${o.status} environment=${JSON.stringify(o.environment)}`).join("; ") || "none"}.${c.owner_restatement ? ` Owner restatement: ${JSON.stringify(c.owner_restatement)}.` : ""}`) : ["cannot-tell: no criteria results."]), "", "## Corrections beside originals", "", ...records.filter((r) => r.corrections.length).map((r) => `- Original ${r.event_id}, type=${r.type}, criteria_results=${JSON.stringify(r.criteria_results)}. Corrections: ${r.corrections.map((c) => c.event_id).join(", ")}.`), ""].join("\n");
  return { criteria, records, state: criteria.some((c) => c.state === "contested") ? "contested" : criteria.some((c) => c.observations.length) ? "observed" : "cannot-tell", markdown };
}
