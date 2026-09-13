for node in /opt/homebrew/opt/node@22/bin/node /opt/homebrew/bin/node; do
  for strip in 0 1; do
    for isolation in process none; do
      child_args="[\"--test\",\"--test-reporter=tap\",\"--test-timeout=100\",\"--experimental-test-isolation=$isolation\",\"/private/tmp/f178-probe/child.mjs\"]"
      set -x
      env -i PATH="$(dirname "$node"):/usr/bin:/bin" STRIP_CONTEXT="$strip" CHILD_ARGS="$child_args" "$node" --test --test-reporter=tap /private/tmp/f178-probe/parent.mjs
      set +x
    done
  done
done
