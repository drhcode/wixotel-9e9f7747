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
    // Let @vitejs/plugin-legacy handle browser targets; avoid overriding
    sourcemap: false,
    minify: "esbuild",
    reportCompressedSize: false, // avoid OOM when computing gzip for legacy bundle
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
          ],
          "recharts": ["recharts"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "lucide-vendor": ["lucide-react"],
          "date-vendor": ["date-fns"],
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
