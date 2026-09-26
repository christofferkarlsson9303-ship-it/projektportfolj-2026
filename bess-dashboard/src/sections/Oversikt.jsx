import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Note } from "../components/ui/Primitiver.jsx";
import { Hero } from "../components/oversikt/Hero.jsx";
import { Nyckeltal } from "../components/oversikt/Nyckeltal.jsx";
import { Leveranser, Risker, Uppmarksamhet } from "../components/oversikt/Rutor.jsx";
import { Aktivitet } from "../components/oversikt/Aktivitet.jsx";
import { Tidslinje } from "../components/oversikt/Tidslinje.jsx";
import { Gantt } from "../components/oversikt/Gantt.jsx";
import { Ledtider } from "../components/oversikt/Ledtider.jsx";
import { Projektkort, Projektredigering } from "../components/oversikt/Projekt.jsx";
import { uppmarksamhet } from "../lib/oversikt.js";

/* Översikten — läget i portföljen just nu.

   Uppbyggd som ett bento-rutnät i fallande vikt: hälsning och snabbåtgärder,
   batteriparkens fasplan som Gantt-schema, ledtiderna som ska startas nu
   bredvid nästa BESS-leverans, fyra nyckeltal, och sedan det som kräver
   åtgärd, aktiviteten, tidslinjen och riskerna. Projektkorten och underlaget
   ligger sist — de är till för att läsas i lugn och ro. Varje ruta är en egen
   namngiven region, så sidan går att skumma och navigera med skärmläsare. */

const kortNamn = (p) => p.nr || p.ort || p.namn;

export function Oversikt() {
  const { state } = usePortfolj();
  const { fokus } = useUi();
  const [visaRedigering, setVisaRedigering] = useState(false);
  const [flik, setFlik] = useState("alla");

  const lista = useMemo(() => uppmarksamhet(state), [state]);
  const akuta = lista.filter((f) => f.niva === "hog").length;
  const saknarKV = state.projekt.filter((p) => p.kontraktsvarde === null).map(kortNamn);

  /* Flaggan "Kärndata saknas" pekar hit. Justering under render, som när
     andra vyer öppnar en utpekad post, och rullning när rutan finns i DOM. */
  const [seddFokus, setSeddFokus] = useState(null);
  if (fokus?.extra === "projektdata" && fokus.tid !== seddFokus) {
    setSeddFokus(fokus.tid);
    setVisaRedigering(true);
  }
  useEffect(() => {
    if (seddFokus) document.getElementById("projektuppgifter")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [seddFokus]);

  const visaAkuta = () => {
    setFlik("hog");
    document.getElementById("ov-uppm")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col gap-5">
      <Hero akuta={akuta} bevaka={lista.length - akuta} onVisaFlaggor={visaAkuta} />

      <section aria-labelledby="ov-planen">
        <h2 id="ov-planen" className="sr-only">
          Fasplan och ledtider
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Gantt i={1} />
          <Ledtider i={2} />
          <Leveranser i={3} />
        </div>
      </section>

      <Nyckeltal />

      <section aria-labelledby="ov-laget">
        <h2 id="ov-laget" className="sr-only">
          Läget i portföljen
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <Uppmarksamhet lista={lista} flik={flik} setFlik={setFlik} i={4} />
          <Aktivitet i={5} />
          <Tidslinje i={6} />
          <Risker i={7} />
        </div>
      </section>

      <section className="oversikt-sektion" aria-labelledby="ov-projekt">
        <div className="oversikt-rubrik">
          <h2 id="ov-projekt">Projekt</h2>
          <span className="oversikt-undertext">{state.projekt.length} i portföljen</span>
          <button
            type="button"
            className="btn sec mini oversikt-rubrik-knapp"
            onClick={() => setVisaRedigering((v) => !v)}
            aria-expanded={visaRedigering}
            aria-controls="projektuppgifter"
          >
            <Pencil size={14} aria-hidden="true" />
            {visaRedigering ? "Dölj projektuppgifter" : "Redigera projektuppgifter"}
          </button>
        </div>

        <div id="projektuppgifter">{visaRedigering ? <Projektredigering /> : null}</div>

        <div className="projkort-rutnat">
          {state.projekt.map((p) => (
            <Projektkort key={p.id} p={p} />
          ))}
        </div>
      </section>

      <Note>
        <b>Underlag och antaganden.</b> Datum, UR-serier, leverantörer och kontakter för 36037/36038 kommer
        ur byggmötesprotokoll BM7/BM8 (2026-08-17), senaste tidplan och UR-status. Göteborg Skogome och
        Götene är nyligen tillagda i portföljmodellen och saknar ännu underlag — fyll i uppgifter under
        "Redigera projektuppgifter" ovan och i respektive flik.{" "}
        {saknarKV.length ? <b>Kontraktsvärde för {saknarKV.join(", ")} saknas i underlaget</b> : null}
        {saknarKV.length ? " och markeras som saknat på projektkortet. " : " "}
        Betalplanens datum för M5 (v. 42) är satt till 2026-10-16 som <span className="ant">ANTAGANDE</span>{" "}
        för 36037/36038 — justera mot faktisk fakturaplan. Riskvärdena är min bedömning, inte hämtade ur
        underlaget.
      </Note>
    </div>
  );
}
