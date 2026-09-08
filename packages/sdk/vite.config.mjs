import { builtinModules } from "node:module";
import { defineConfig } from "vite";

const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: { index: "src/index.mjs", cli: "src/cli.mjs" },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.mjs`,
    },
    minify: false,
    outDir: "dist",
    rollupOptions: {
      external: (id) => builtins.has(id),
    },
    sourcemap: false,
  },
});
