import { mkdir, rm, copyFile } from "node:fs/promises";
import { build } from "esbuild";

const distDir = "dist";
const popupDir = `${distDir}/popup`;

await rm(distDir, { recursive: true, force: true });
await mkdir(popupDir, { recursive: true });

await Promise.all([
  build({
    entryPoints: ["src/background.ts"],
    bundle: true,
    outfile: `${distDir}/background.js`,
    platform: "browser",
    target: "firefox115",
    format: "iife",
    sourcemap: false,
    minify: false
  }),
  build({
    entryPoints: ["src/popup/popup.ts"],
    bundle: true,
    outfile: `${popupDir}/popup.js`,
    platform: "browser",
    target: "firefox115",
    format: "iife",
    sourcemap: false,
    minify: false
  })
]);

await Promise.all([
  copyFile("src/manifest.json", `${distDir}/manifest.json`),
  copyFile("src/popup/popup.html", `${popupDir}/popup.html`),
  copyFile("src/popup/popup.css", `${popupDir}/popup.css`)
]);
