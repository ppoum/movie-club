import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["server/index.cts"],
  bundle: true,
  platform: "node",
  bundle: true,
  minify: true,
  format: "cjs",
  outdir: "./dist-backend/",
});
