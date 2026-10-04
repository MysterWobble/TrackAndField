// Vite settings. The live site is on GitHub Pages at mysterwobble.github.io/TrackAndField/, so the built
// game (and `npm run preview`, which tests that build) lives under /TrackAndField/. The dev server
// (npm run dev) still serves from / so local links work.
import { defineConfig } from "vite";

export default defineConfig(({ command, isPreview }) => ({
  base: command === "build" || isPreview ? "/TrackAndField/" : "/",
}));
