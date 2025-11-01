// vite.config.js

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from "@vitejs/plugin-legacy";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 8080,
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Use legacy plugin only for production builds to reduce dev bundle size
    mode !== "development" &&
      legacy({
        targets: ["defaults", "safari >= 12", "iOS >= 12"],
        additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
        modernPolyfills: true,
      }),
  ].filter(Boolean),

  build: {
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
  },

  optimizeDeps: {
    esbuildOptions: {
      target: "es2017",
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
