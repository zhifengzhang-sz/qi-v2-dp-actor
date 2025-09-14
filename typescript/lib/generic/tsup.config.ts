import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "node18",
  dts: false,
  clean: true,
  sourcemap: true,
  treeshake: true,
  splitting: false,
  bundle: true,
});
