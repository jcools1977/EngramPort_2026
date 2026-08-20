# D2 live transcription revision

Moved the D2 live fixture after `d1-behavioural.sql` and immediately before the mutation harness. The runner now uses the published SCRAM endpoint and seeds/removes the mint-capable synthetic principal X around the fixture. Added the four committed D2 mutation descriptors (caller substitution, joint leakage, role guard, dirty release). Existing adapter timeout and `client.release(error)` behavior are preserved.
