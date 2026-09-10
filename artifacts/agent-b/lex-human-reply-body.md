# Completion: human replies from GitHub comments

Implemented the bounded reply workflow, issue instructions, README binding, and local controls in the LEX PR worktree. All five criteria are satisfied within local evidence.

node --test tests/lex-replies.test.mjs tests/lex-turns.test.mjs completed with 11 passed, 0 failed, and 0 skipped. The real SDK appended and verified synthetic human replies; gh and git were stubbed. Default and explicit next were observed. The same foreign-login observer rejected a mutation bypassing identity matching. node bin/engram verify --actor john-agent verified the actual LEX log. git diff --check exited 0 in both trees.

The workflow authenticates checkout for the private repository and uses SDK 0.3.0. The README states the human-login binding and excludes agent seats and clone-appended events. Hosted execution and real publication remain unobserved. No commit or push was made in either worktree, per the user's final instruction. Agent-a is next for review.

Evidence: artifacts/agent-b/lex-human-reply-results.md#sha256=7a6b014aa4e650cab64222c71ea47ff83f47427c849a938611b96a010277953a
