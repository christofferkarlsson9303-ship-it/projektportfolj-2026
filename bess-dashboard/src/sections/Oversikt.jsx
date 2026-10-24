import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Hero } from "../components/oversikt/Hero.jsx";
import { Nyckeltal } from "../components/oversikt/Nyckeltal.jsx";
import { Risker, Uppmarksamhet } from "../components/oversikt/Rutor.jsx";
import { Aktivitet } from "../components/oversikt/Aktivitet.jsx";
import { Gantt } from "../components/oversikt/Gantt.jsx";
import { Projektlage } from "../components/oversikt/Projektlage.jsx";
import { ForloradeAnbud } from "../components/oversikt/ForloradeAnbud.jsx";
import { Projektkort, Projektredigering } from "../components/oversikt/Projekt.jsx";
import { uppmarksamhet } from "../lib/oversikt.js";
import { projektUnderlag } from "../lib/berakningar.js";
import { Callout } from "../components/ds/index.js";

/* Översikten (DashboardView) — portföljen, inte dagens arbetslista.

   Byggd av designsystemets komponenter (components/ds). Ordning efter vikt:
   hälsning och snabbåtgärder, läget per projekt (tid, pengar, vad som
   blockerar), portföljens fasplan som Gantt-schema, fyra nyckeltal, flaggor,
   risker och ändringsloggen, och sist projektkorten och underlaget.

   Nästa uppgift, ledtider, nästa BESS-leverans och kommande 90 dagar låg här
   förut men upprepade Idag och Bygga batteripark (granskning 2026-10-23).
   Varje ruta är en egen namngiven region. */

const kortNamn = (p) => p.nr || p.ort || p.namn;

export function DashboardView() {
  const { state } = usePortfolj();
  const { fokus } = useUi();
  const [visaRedigering, setVisaRedigering] = useState(false);
  const [flik, setFlik] = useState("alla");

  const lista = useMemo(() => uppmarksamhet(state), [state]);
  const akuta = lista.filter((f) => f.niva === "hog").length;
  const saknarKV = state.projekt.filter((p) => p.kontraktsvarde === null).map(kortNamn);
  // Batch C:s senaste underlag, samma som i sidfoten.
  const batchC = state.projekt
    .filter((p) => p.id === "36037" || p.id === "36038")
    .map((p) => ({ p, u: projektUnderlag(state, p) }))
    .filter((x) => x.u)
    .map(({ p, u }) => `${p.nr} ${u.kalla.replace(/^Byggmötesprotokoll /, "")}${u.datum ? " " + u.datum : ""}`);

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
    <div className="flex flex-col gap-4 lg:gap-6">
      <Hero akuta={akuta} bevaka={lista.length - akuta} onVisaFlaggor={visaAkuta} />

      {/* Portföljens svar på tid, pengar och vad som blockerar — en rad per projekt.
          Det som ska göras i ett projekt står i Idag; det upprepas inte här. */}
      <Projektlage i={1} />

      <Gantt i={2} />

      <Nyckeltal />

      <section aria-labelledby="ov-laget">
        <h2 id="ov-laget" className="sr-only">
          Flaggor och risker i portföljen
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
          <Uppmarksamhet lista={lista} flik={flik} setFlik={setFlik} i={3} />
          <Risker i={4} />
          <Aktivitet i={5} />
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

      <ForloradeAnbud />

      <Callout ton="info">
        <b>Underlag och antaganden.</b> Datum, UR-serier, leverantörer och kontakter för 36037/36038 kommer
        ur byggmötesprotokollen{batchC.length ? ` (senast ${batchC.join(", ")})` : ""}, senaste tidplan och
        UR-status. Göteborg Skogome och
        Götene är nyligen tillagda i portföljmodellen och saknar ännu underlag — fyll i uppgifter under
        "Redigera projektuppgifter" ovan och i respektive flik.{" "}
        {saknarKV.length ? <b>Kontraktsvärde för {saknarKV.join(", ")} saknas i underlaget</b> : null}
        {saknarKV.length ? " och markeras som saknat på projektkortet. " : " "}
        Betalplanens datum för M5 (v. 42) är satt till 2026-10-16 som <span className="ant">ANTAGANDE</span>{" "}
        för 36037/36038 — justera mot faktisk fakturaplan. Riskvärdena är min bedömning, inte hämtade ur
        underlaget.
      </Callout>
    </div>
  );
}
