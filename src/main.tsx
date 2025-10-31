import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

async function bootstrap() {
  // Polyfill URLPattern for older versions of Mobile Safari
  if (!("URLPattern" in window)) {
    try {
      await import("urlpattern-polyfill");
      // eslint-disable-next-line no-console
      console.info("Loaded URLPattern polyfill for Safari");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to load URLPattern polyfill", e);
    }
  }

  // Attach a global error handler to avoid silent white screens
  window.addEventListener("error", (event) => {
    // eslint-disable-next-line no-console
    console.error("Global window error:", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    // eslint-disable-next-line no-console
    console.error("Unhandled promise rejection:", event.reason);
  });

  createRoot(document.getElementById("root")!).render(<App />);
}

bootstrap();
