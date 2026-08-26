# Enrollment recommendations — independent answer

Parent handoff: `01a03e0a-691d-72f9-8f65-4edc066ab411`

This recommendation was written without reading
`artifacts/agent-a/enrollment-recommendation-sealed.md`. It is reading only: no
migration, database, enrollment, provider, identity, scheduler, or accepted
control changes. `executed=` remains 103.

## Recommendation 1 — a narrow issuer function operated by a dedicated bootstrap role; the root terminates at DeVere

**Recommend the combined A+B shape:** no direct table writes; two narrow
`SECURITY DEFINER` boundaries for identity enrollment and founding-authorization
issuance; executable only through a dedicated bootstrap-operator role. For the
current single-founder phase, **the ultimate root is DeVere as a person**, not
the function and not the PostgreSQL role. The function is enforcement and the
role is a capability. Legitimacy terminates at DeVere's authenticated managed
control-plane access and an explicit, recorded approval of the exact environment
and ceremony.

For the first ceremony, the operator role should be enabled/assumed only for the
bounded operation; the enrollment boundary should accept the exact verified
issuer/subject out of band; the issuer should bind an existing enrolled identity,
server-controlled tenant/principal reservations, a short maximum expiry, reason,
environment, and operator/audit identity; and the role should lose reachability
afterward until another explicit ceremony. Direct DML remains revoked. An empty
database is not the gate, and there is no "first caller wins" path.

This deliberately admits the unavoidable trust statement: DeVere can authorize
a founder because, before EngramPort has a founder, the deployment owner is the
only existing authority. Calling the endpoint merely a role would hide the
human who provisions and controls it. Calling it a custody system today would
add an offline signing/key lifecycle without removing the need to authorize its
custodian.

For later ceremonies in the current phase, use the same explicit operator path.
Do not silently let any authenticated founder enroll identities or issue new
founding authorizations: whether tenant founders may create other founders is a
product-governance decision not made by ADR 0027. If that product is wanted, it
needs a separately decided application boundary and separation between
enrollment, issuance, and tenant administration.

**Confidence: 0.68 (medium, and the least certain of the three).** The database
shape is straightforward; the endpoint is a governance choice and the project
has only one operator today.

**What would change this answer:** multiple human operators, unattended
bootstrap, a separation-of-duty requirement, or a material need for ceremonies
to be reviewed independently of database control-plane access. Any of those
would move the recommendation to D: an offline-signed, environment-bound
envelope verified by the narrow function, with the root terminating at a named
custody system and independently governed key custodians. Evidence that the
managed platform cannot expose a least-privileged, attributable operator role
would also move the answer away from A+B.

**What remains DeVere's:** accepting himself as the temporary human trust root,
and deciding whether EngramPort's future product permits founder-administered
enrollment. Engineering can make the chosen root narrow and auditable; it cannot
legitimate the root by itself.

## Recommendation 2 — authorize 0021/0022 on `engramport-dev`, schema-only

**Recommend authorizing the sequential schema rehearsal, with no durable real
identity.** Apply 0021 and 0022 only through a migration procedure that either
executes under the intended `engram_migrator` ownership model or explicitly
normalizes ownership afterward. Then fingerprint checksums, table/function
owners, `SECURITY DEFINER` owner and search path, forced-RLS policies, PUBLIC/app/
maintenance/operator ACLs, constraints, and empty-table state against the local
reference. Exercise the registry with synthetic identities only. Do not install
a schedule and do not describe the evidence project as an operational target.

The reason to apply is not freshness for its own sake. It separates managed
PostgreSQL compatibility and ownership/ACL proof from the later privileged
decision to persist a real person's stable identifier. The existing project is
already an evidence substrate; empty schema plus synthetic fixtures is aligned
with that purpose. Skipping 0021 to reach 0022 would break sequential migration
integrity.

The authorization should be conditional rather than blanket: no statement-by-
statement transcription without an exact post-application fingerprint, no
owner-excluding comparison, no real `(iss, sub)`, and no claim that the current
empty `cron.job` satisfies the later operational obligation.

**Confidence: 0.91 (high).** The split is reversible at the data/identity level
and directly targets the managed-owner mismatch F90 exposed.

**What would change this answer:** inability to make function/table ownership
and ACL behavior match the intended least-privilege model, or a decision that
`engramport-dev` must remain a frozen reproduction of the 0001-0020 evidence.
In either case, rehearse on a separate synthetic-only schema/project instead of
applying to dev. A failed fingerprint or proof gate changes the answer to "do
not proceed," not "accept the managed difference."

**What remains DeVere's:** the actual authorization to mutate the managed dev
project and accept its ongoing cost/state. This answer recommends the scope of
that authorization; it does not grant it.

## Recommendation 3 — take the split path; enroll the real subject only on the operational target

**Recommend the split path created by decision 2:** rehearse 0021/0022 on dev
with synthetic identities, then wait to persist the real verified subject until
there is a selected operational target. Do not enroll DeVere's real subject in
`engramport-dev` or in a disposable project merely to prove the write works.

"Operational target" should mean more than a production-like name. Before the
write it should have: the chosen issuance/enrollment root implemented; migration
ownership and ACLs verified; an approved retention, backup/PITR, disable, and
recovery policy for the stable account identifier; the production composition
selecting PostgreSQL; and the C17 store-and-scheduler obligation ready before
the enrolled identity can create a durable setup session. Enrollment itself is
not C17's first durable delegation, but it is the point after which relying on
an empty scheduler would become an operational bypass.

This postpones criterion-1 completion, but it avoids creating durable real-person
state in an evidence substrate and avoids pretending project deletion proves
erasure. The schema mechanics and real Google capture are already separable;
combining them now produces privacy/authority cost without adding a distinct
control.

**Confidence: 0.86 (high, below decision 2).** The main uncertainty is release
sequencing, not the security boundary.

**What would change this answer:** a concrete release gate requiring a managed
end-to-end enrollment rehearsal before the operational target exists. Even then,
prefer a separately authorized isolated staging target and a dedicated test
Workspace identity, with retention/erasure terms understood; do not use the real
founder subject by default. Enrolling the real subject on dev becomes acceptable
only if DeVere deliberately reclassifies dev as the operational target and it
meets the same ownership, retention, recovery, and C17 conditions—at which point
this is no longer "real identity in an evidence project."

**What remains DeVere's:** target selection, tolerance for delaying enrollment,
and authorization to persist the real global identifier. Engineering can state
the minimum safe target; it cannot decide where DeVere's identity should live.

## Ordered answer

1. Human root for now: DeVere, mediated by a dedicated operator role and narrow
   issuer/enrollment functions; move to offline custody if governance scales.
2. Yes to 0021/0022 on dev **schema-only**, conditional on ownership/ACL proof;
   no real identity and no scheduler claim.
3. Real subject only on the selected operational target; use dev as the
   synthetic schema rehearsal half of the split path.

Decision 1 is the least certain because it chooses a temporary governance root.
Decisions 2 and 3 are engineering recommendations with clearer falsifiers. All
three remain DeVere's actual decisions, and none is enacted here.
