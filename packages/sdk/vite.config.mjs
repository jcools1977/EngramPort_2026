import { builtinModules } from "node:module";
import { defineConfig } from "vite";

const builtins = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: "src/index.mjs",
      formats: ["es"],
      fileName: () => "index.mjs",
    },
    minify: false,
    outDir: "dist",
    rollupOptions: {
      external: (id) => builtins.has(id),
    },
    sourcemap: false,
  },
});
