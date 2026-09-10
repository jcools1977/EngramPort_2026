// Node can check the module graph without claiming Cloudflare runtime behavior.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'cloudflare:workers') return {url: 'data:text/javascript,export class DurableObject {} export class RpcTarget {}', shortCircuit: true};
  return nextResolve(specifier, context);
}
