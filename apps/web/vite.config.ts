import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const apiPort = env.PORT || "4000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        // Bundle `shared` from its TypeScript source. Its built dist is
        // CommonJS (for the API), and Rollup can't see named exports through
        // a linked CommonJS package, which breaks `vite build`.
        shared: fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url)),
      },
    },
    server: {
      proxy: {
        "/api": `http://localhost:${apiPort}`,
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/setupTests.ts"],
    },
  };
});
