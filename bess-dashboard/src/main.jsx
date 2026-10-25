import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

/* Vyerna laddas när de öppnas. Efter en ny publicering kan en öppen flik
   peka på delar som inte längre finns — ladda då om sidan en gång. En CSS-del
   som inte går att hämta ska inte fälla vyn; den ritas ändå. */
window.addEventListener("vite:preloadError", (e) => {
  const css = /CSS/i.test(String(e.payload?.message || ""));
  if (css) {
    e.preventDefault();
    return;
  }
  try {
    if (sessionStorage.getItem("laddadOm") !== "1") {
      sessionStorage.setItem("laddadOm", "1");
      e.preventDefault();
      location.reload();
    }
  } catch {
    /* utan sessionStorage: låt felgränsen visa felet */
  }
});
/* Kom sidan igång efter omladdningen nollställs spärren, så att nästa
   publicering också får en omladdning. */
setTimeout(() => {
  try {
    sessionStorage.removeItem("laddadOm");
  } catch {
    /* ingen lagring */
  }
}, 10000);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
