import { builtinModules } from "node:module";
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/main.ts"],
  format: "cjs",
  target: "es2021",
  platform: "node",
  outDir: ".",
  clean: false,
  dts: false,
  sourcemap: false,
  deps: {
    neverBundle: ["obsidian", "electron", /^@codemirror\//, /^@lezer\//, ...builtinModules],
    alwaysBundle: ["@aws-sdk/client-s3"],
    onlyBundle: false,
  },
  outputOptions: {
    codeSplitting: false,
    entryFileNames: "[name].js",
  },
});
