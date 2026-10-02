import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Several test files spin up their own PGlite (WASM) instance via
    // createTestDb(). Running files in parallel starts them all at once and
    // the concurrent cold-starts can blow past the default timeouts under
    // load; running files sequentially keeps this suite reliable.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
