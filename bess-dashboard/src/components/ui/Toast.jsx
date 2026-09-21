import { useUi } from "../../state/hooks.js";

/* Statusmeddelande. role="status" + aria-live gör att skärmläsare läser upp
   det utan att flytta fokus — i standalone-versionen fanns ingen utläsning alls. */
export function Toast() {
  const { toast } = useUi();
  return (
    <div
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
