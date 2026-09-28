/* Rullbar yta för en tabell som inte går via DataTable. Regionen får
   tabindex, så att en bred tabell går att rulla i sidled med tangentbordet —
   en ren overflow-container går annars inte att nå. Etiketten namnger
   regionen för skärmläsare. `tscroll` ger designsystemets tabellregler:
   celldelare, tabulärsiffror och kortvy på mobil (td[data-label]). */

export function TableRegion({ label, className = "", children }) {
  return (
    <div className={`tscroll ${className}`.trim()} tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}
