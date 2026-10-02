import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "../..", "");
  const apiPort = env.PORT || "4000";

  return {
    plugins: [react()],
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
