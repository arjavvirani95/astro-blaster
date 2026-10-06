import { defineConfig } from "vite";

// Relative base so the build works on GitHub Pages under /astro-blaster/.
export default defineConfig({ base: "./", build: { chunkSizeWarningLimit: 1600 } });
