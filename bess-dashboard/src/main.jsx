import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { laddaOmEnGang } from "./lib/laddaOm.js";

/* Vite signalerar när en delfil från en äldre publicering saknas. Ladda om en gång. */
window.addEventListener("vite:preloadError", (ev) => {
  if (laddaOmEnGang()) ev.preventDefault();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
