import test from "node:test";
import assert from "node:assert/strict";
import { PrincipalSessionBinding } from "../packages/git-adapter/src/d2-session-binding.mjs";

const connectionString = process.env.D2_DATABASE_URL ?? "postgres://engram_maintenance@127.0.0.1:5432/engramport";
test("D2 live checkout role and principal binding", async () => {
  const binding = new PrincipalSessionBinding({ connectionString });
  try {
    await assert.rejects(() => binding.mint({ className: "3.3", namespace: "credential", model: "B", keyLocator: "d2-live", metadata: {} }, null), e => e.code === "SESSION_UNBOUND");
    await binding.mint({ className: "3.3", namespace: "credential", model: "B", keyLocator: "d2-live", metadata: {} }, { verified: true, principalId: "11000000-0000-0000-0000-000000000001" });
  } finally { await binding.close(); }
});
