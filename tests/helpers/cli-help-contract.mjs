import assert from "node:assert/strict";

export function assertHelp(output) {
  assert.match(output, /JSON_FILE is a filename, resolved from the current directory, containing a JSON array/);
  for (const flag of ["bounded-context", "completion-criteria", "criteria-results"]) {
    assert.ok(output.includes(`--${flag} JSON_FILE`), `missing JSON filename documentation: ${flag}`);
    const line = output.split(`--${flag} JSON_FILE (`)[1]?.split("\n")[1]?.trim();
    assert.ok(line, `missing JSON shape: ${flag}`);
    const shape = JSON.parse(line);
    assert.ok(Array.isArray(shape));
    const keys = flag === "bounded-context" ? ["event_id", "type"]
      : flag === "completion-criteria" ? ["evidence_classes", "id", "statement"]
        : ["criterion_id", "evidence", "status"];
    assert.deepEqual(Object.keys(shape[0]).sort(), keys);
    if (flag === "bounded-context") assert.deepEqual(Object.keys(shape[1]).sort(), ["ref", "type"]);
    if (flag === "criteria-results") assert.deepEqual(Object.keys(shape[0].evidence[0]).sort(), ["ref", "type"]);
  }
  for (const status of ["satisfied", "unmet", "blocked"]) assert.ok(output.includes(`"${status}"`));
  assert.match(output, /64 lowercase SHA-256 hex/);
}
