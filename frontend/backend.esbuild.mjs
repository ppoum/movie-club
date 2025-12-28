import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/index.ts"],
  bundle: true,
  platform: "node",
  bundle: true,
  minify: true,
  format: "esm",
  outdir: "./dist-backend/",
});
