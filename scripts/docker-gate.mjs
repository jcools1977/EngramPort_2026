import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// Probe the configured Docker endpoint, including Docker contexts and DOCKER_HOST.
// A socket file alone does not prove that the daemon can be reached.
export function dockerAvailability() {
  const result = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8", timeout: 10000,
  });
  if (result.status === 0) return { available: true };
  const detail = result.error?.code ?? (result.stderr ?? "").trim().split("\n").filter(Boolean)[0] ?? "";
  return { available: false, reason: `Docker endpoint unavailable: ${detail || `exit ${result.status}`}` };
}

export function dockerGate(gates, { availability = dockerAvailability(), env = process.env, emit = console.log } = {}) {
  if (availability.available) return true;
  if ((env.CI && env.CI !== "false" && env.CI !== "0") || env.ENGRAMPORT_REQUIRE_DOCKER === "1") {
    throw new Error(`DOCKER_REQUIRED gates=${gates.join(",")}: ${availability.reason}`);
  }
  for (const gate of gates) emit(`DOCKER_GATE_SKIP gate=${gate} reason=${availability.reason}`);
  return false;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const gates = process.argv.slice(2);
    if (gates.length === 0) throw new Error("Docker gate name required");
    process.exitCode = dockerGate(gates) ? 0 : 77;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
