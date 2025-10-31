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
    // ✅ Add legacy build for iPhone/iPad Safari
    legacy({
      targets: ["defaults", "safari >= 12", "iOS >= 12"],
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      modernPolyfills: true,
    }),
  ].filter(Boolean),

  build: {
    target: ["es2017", "safari13"], // ✅ ensures compatibility
    sourcemap: false,
    minify: "esbuild", // ✅ safer than terser for Safari
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
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
