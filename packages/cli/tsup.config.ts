import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  sourcemap: true,
  splitting: false,
  target: "node18",
  platform: "node",
  banner: {
    js: "#!/usr/bin/env node",
  },
});
