/* Platshållare medan innehåll laddas. Skimret stängs av av `prefers-reduced-motion` (global regel),
   och `etikett` läses upp en gång via role="status" i stället för att varje block annonseras. */
export function Skeleton({ className = "", etikett }) {
  const block = <span aria-hidden="true" className={`skeleton block rounded-lg ${className}`} />;
  return etikett ? (
    <div role="status" aria-busy="true">
      <span className="sr-only">{etikett}</span>
      {block}
    </div>
  ) : (
    block
  );
}
