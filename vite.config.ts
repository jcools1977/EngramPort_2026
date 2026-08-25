import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_date: "2026-05-22",
  compatibility_flags: ["nodejs_compat"],
  routes: [{ pattern: "app.engramport.com", custom_domain: true }],
  vars: {
    OIDC_ISSUER: "https://accounts.google.com",
    OIDC_AUTHORIZATION_ENDPOINT: "https://accounts.google.com/o/oauth2/v2/auth",
    OIDC_CLIENT_ID: "1074508038321-g7n86n4nj23858t9mm4r94fqmugkb0sd.apps.googleusercontent.com",
    OIDC_REDIRECT_URI: "https://app.engramport.com/auth/callback",
    OIDC_SCOPE: "openid",
    OIDC_TRANSACTION_TTL_MS: "600000",
  },
  durable_objects: {
    bindings: [{ name: "OIDC_TRANSACTIONS", class_name: "OidcTransactionDurableObject" }],
  },
  migrations: [{ tag: "oidc-transactions-v1", new_sqlite_classes: ["OidcTransactionDurableObject"] }],
  secrets: { required: ["OIDC_CLIENT_SECRET"] },
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
