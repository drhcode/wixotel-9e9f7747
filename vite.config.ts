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
    legacy({
      // Use modern Safari targets, not iOS 10.x
      targets: ["defaults", "safari >= 13", "ios_saf >= 13"],
      // Generate modern and legacy bundles correctly
      additionalLegacyPolyfills: ["regenerator-runtime/runtime"],
      modernPolyfills: true,
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  build: {
    target: ["es2019", "safari13"], // important for SWC & Safari support
    sourcemap: true,                // helps debug white screens
  },

  optimizeDeps: {
    esbuildOptions: {
      target: "es2019", // ensures code works on Safari 13+
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
