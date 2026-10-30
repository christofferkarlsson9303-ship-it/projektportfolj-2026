import { useLayoutEffect, useRef } from "react";
import { useUi } from "../../state/hooks.js";

/* Statusmeddelande. role="status" + aria-live gör att skärmläsare läser upp
   det utan att flytta fokus — i standalone-versionen fanns ingen utläsning alls.

   popover="manual" (F2, granskning 2026-10-29) lägger rutan i top layer, så att den
   syns ovanför en öppen <dialog> i stället för bakom dess backdrop. Rutan visas en
   gång och står kvar som live-region (synligheten styrs med .visa, som förut). Top
   layer är ordnad efter när något visades, så ett nytt meddelande flyttar upp rutan
   överst igen — annars hamnar den under en dialog som öppnats efter den. Utan stöd
   för popover är den en vanlig fast ruta med z-index, precis som förut. */
export function Toast() {
  const { toast } = useUi();
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    const visas = el.matches(":popover-open");
    if (visas && !toast) return;
    if (visas) el.hidePopover();
    el.showPopover();
  }, [toast]);

  return (
    <div
      ref={ref}
      popover="manual"
      className={`toast ${toast ? "visa" : ""} ${toast?.typ || ""}`.trim()}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {toast ? (
        <>
          <span className="tdot" />
          <span>{toast.txt}</span>
        </>
      ) : null}
    </div>
  );
}
