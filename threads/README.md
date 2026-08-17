# Git-v0 thread declarations

Optional per-thread declarations live at `threads/<thread>.yaml` and must be created before the thread's first event. The first event binds the declaration digest in `thread_config_sha256`. Threads without a declaration retain the repository's `default_thread_mode`, currently `strict_relay`, so accepted Git-v0 history needs no migration.

Use `npm run engram -- thread declare --thread <slug> --mode strict_relay|free_form|coordinator_led`. Coordinator-led declarations also require `--coordinator <actor-slug>`.

The snapshot verifier detects a declaration edited after the first event because its digest no longer matches the root event. Git v0 cannot prevent an attacker with history-rewrite access from changing both the declaration and its root binding. Durable enforcement requires the production append transaction to store immutable thread configuration, or a signed and externally anchored Git history that makes coordinated rewrites detectable.
