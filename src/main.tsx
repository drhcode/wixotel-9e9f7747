// src/main.tsx

// ✅ Ensure Safari (iPhone/iPad) supports URLPattern before React Router loads
import { URLPattern as URLPatternPolyfill } from "urlpattern-polyfill";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force URLPattern polyfill on buggy Mobile Safari implementations
try {
  const TestURLPattern: any = (window as any).URLPattern;
  // Some Safari versions have a broken native URLPattern that throws on simple patterns
  const needsPolyfill = !TestURLPattern ? true : (() => {
    try {
      // If this throws, use the polyfill
      // Also exercise a common route pattern used by React Router
      // eslint-disable-next-line no-new
      new TestURLPattern({ pathname: "/:param*" });
      return false;
    } catch {
      return true;
    }
  })();

  if (needsPolyfill) {
    (window as any).URLPattern = URLPatternPolyfill as any;
    console.warn("Using URLPattern polyfill due to buggy native implementation");
  }
} catch (e) {
  // As a last resort, set the polyfill
  (window as any).URLPattern = URLPatternPolyfill as any;
}

// ✅ Global error listeners (for debugging mobile Safari)
window.addEventListener("error", (event) => {
  console.error("Global window error:", event.error || event.message);
});
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});

// ✅ Mount React app
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
} else {
  console.error("Root element not found!");
}
