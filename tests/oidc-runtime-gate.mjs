// This exact runtime reproduced a native abort before OIDC worker requests.
// The upstream defect identity is unconfirmed; other versions must still run.
export function oidcRuntimeGate({ version = process.versions.node, emit = console.log } = {}) {
  if (version !== "26.5.0") return true;
  emit(`OIDC_RUNTIME_SKIP runtime=Node ${version} reason=Miniflare startup aborts in InternalCallbackScope::Close (execution_async_id != 0) after asynchronous filesystem work; upstream defect identity unconfirmed; rerun on CI Node 22`);
  return false;
}
