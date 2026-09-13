for node in /opt/homebrew/opt/node@22/bin/node /opt/homebrew/bin/node; do
  for isolation in process none; do
    set -x
    env -i PATH="$(dirname "$node"):/usr/bin:/bin" "$node" --test --test-reporter=tap --test-timeout=100 --experimental-test-isolation="$isolation" /private/tmp/f178-probe/child.mjs
    set +x
  done
done
