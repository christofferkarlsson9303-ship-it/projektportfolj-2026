import logotyp from "../../assets/one-nordic-logo.png";

export function DocumentHeader({ dokument: d, titel }) {
  return (
    <header className="field-document-head">
      <img src={logotyp} alt="ONE Nordic AB" />
      <div>
        <h1>{titel}</h1>
        <p>{d.projekt.nr || d.projekt.id} · {d.projekt.namn} · {d.dokumentNr}</p>
        <p>Datum: {d.datum} · Skapad av: {d.skapadAv || "________________"} · Mallrevision: {d.revision}</p>
        <p>Enhet/serienummer: {d.enhet || "________________"} · Utförare: {d.utforare || "________________"}</p>
        <p>Ritning/revision: {d.ritning || "________________"}</p>
      </div>
    </header>
  );
}
