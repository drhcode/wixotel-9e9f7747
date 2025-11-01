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
        manualChunks: (id) => {
          // Let Vite handle chunking automatically to avoid circular dependency issues
          // Only split the largest vendors to reduce bundle size
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            // Group all other node_modules into vendor chunk
            return 'vendor';
          }
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
