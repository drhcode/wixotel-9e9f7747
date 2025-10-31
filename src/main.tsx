// src/main.tsx

// ✅ Ensure Safari (iPhone/iPad) supports URLPattern before React Router loads
import "urlpattern-polyfill";

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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
