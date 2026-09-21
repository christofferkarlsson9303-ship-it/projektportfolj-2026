import { VYMETA as META } from "../data/vyer.js";

/* Platshållare för de sektioner som ännu inte är porterade till React.
   Standalone-filen är kvar och orörd — den är fortfarande den vy som gäller
   för dessa flikar tills de flyttats över. */
export function UnderMigrering({ vy }) {
  const m = META[vy] || { namn: vy, lead: "" };
  return (
    <div className="card">
      <h3>{m.namn}</h3>
      <div className="lead">{m.lead}</div>
      <div className="note" style={{ marginTop: 16 }}>
        <b>Den här sektionen är inte flyttad till React ännu.</b> Funktionen finns kvar oförändrad i{" "}
        <code>Projektportfolj_standalone_2026-09-17.html</code>, som lämnats orörd. Migreringen sker
        sektion för sektion så att inget tappas på vägen.
      </div>
    </div>
  );
}
