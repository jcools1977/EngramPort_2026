import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migration=await readFile(new URL("../migrations/0001_canonical_core.sql",import.meta.url),"utf8");
const databaseTest=await readFile(new URL("failure/app-role-grants.sql",import.meta.url),"utf8");
const runner=await readFile(new URL("../scripts/run-db-tests",import.meta.url),"utf8");

test("app role has no blanket all-table grant",()=>{assert.doesNotMatch(migration,/GRANT\s+SELECT\s*,\s*INSERT\s+ON\s+ALL\s+TABLES[^;]+engram_app/i);});
test("app writes are limited to canonical append tables",()=>{assert.match(migration,/GRANT\s+INSERT\s+ON\s+events\s*,\s*event_recipients\s+TO\s+engram_app/i);for(const table of ["principals","projects","project_memberships","actors","actor_delegations","agent_sessions","threads"])assert.doesNotMatch(migration,new RegExp(`GRANT[^;]*INSERT[^;]*ON[^;]*\\b${table}\\b[^;]*TO\\s+engram_app`,"i"));});
test("app retains explicit reads needed by RLS and delegation trigger",()=>{const grant=migration.match(/GRANT\s+SELECT\s+ON\s+([^;]+)\s+TO\s+engram_app/i)?.[1]??"";for(const table of ["tenants","principals","projects","project_memberships","actors","actor_delegations","agent_sessions","threads","events","event_recipients"])assert.match(grant,new RegExp(`\\b${table}\\b`));});
test("maintenance remains separate authorization writer",()=>{assert.match(migration,/GRANT\s+SELECT\s*,\s*INSERT\s*,\s*UPDATE\s*,\s*DELETE\s+ON\s+ALL\s+TABLES[^;]+engram_maintenance/i);});
test("future database controls assert exact permission errors and positive paths",()=>{for(const table of ["actor_delegations","project_memberships","actors","principals"])assert.match(databaseTest,new RegExp(`'42501', 'permission denied for table ${table}'`));assert.match(databaseTest,/PASS app valid event INSERT/);assert.match(databaseTest,/PASS maintenance identity and authorization INSERT controls/);assert.match(databaseTest,/ROLLBACK;/);});
test("database runner executes grant controls after postgres seed",()=>{assert.match(runner,/deploy\/seed\.sql[\s\S]*tests\/failure\/app-role-grants\.sql[\s\S]*tests\/failure\/constraints\.sql/);assert.match(runner,/-U postgres -d engramport < "\$root_dir\/deploy\/seed\.sql"/);});
