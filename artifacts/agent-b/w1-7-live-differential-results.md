# W1-7 live-differential revision

The harness now provisions synthetic Vault keys/policy/token, invokes the accepted Vault HTTP boundary, and runs the scoped synth-a/prod-real checks. Provisioning is fail-closed and cleanup-preserving; no setup command is suppressed. The current cached Vault run returned HTTP 400 during provisioning, so the command exited nonzero and the full live four-part differential is not claimed. This is an honest harness failure, not a green simulation.

Structural W1-7 suite remains 5/5; proof and lint remain green. No production signing fallback, real credentials, schema, threat-model, provider or excluded work was touched. A7/A8/B5 and B1–B4 remain open; A6/B9 remain with W1-8.
