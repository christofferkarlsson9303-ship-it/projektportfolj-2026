import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { PTag } from "../components/ui/PTag.jsx";
import { Note } from "../components/ui/Primitiver.jsx";
import { Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { AGENDATYPER, arbetslage, dagsetikett } from "../lib/agenda.js";

/* Idag — projektledarens arbetslista.

   Resten av verktyget är ordnat efter dokumenttyp: ÄTA för sig, risker för sig,
   dagbok för sig. Arbetsdagen är inte ordnad så. Den här vyn vänder på det och
   samlar allt som kräver handling, sorterat på hur bråttom det är — frister
   först, sedan förfallet, sedan det närmaste i tiden.

   Varje rad går direkt till rätt post, inte bara till rätt flik. */

const HORISONTER = [
  ["14", "14 dagar"],
  ["30", "30 dagar"],
  ["60", "60 dagar"],
  ["90", "90 dagar"],
];

/* ---------- Byggstenar ---------- */

function Grupp({ rubrik, antal, ton = "neutral", children, tom }) {
  const toner = {
    larm: "border-l-4 border-l-rod",
    varning: "border-l-4 border-l-orange",
    neutral: "",
  };

  return (
    <section className={`card ${toner[ton]}`} role="region" aria-label={rubrik} style={{ marginBottom: 16 }}>
      <div className="kortrad">
        <div style={{ minWidth: 0 }}>
          <h3>
            {rubrik}
            {antal ? <span className="fcount ml-2">{antal}</span> : null}
          </h3>
        </div>
      </div>
      {antal ? <div className="mt-3">{children}</div> : <p className="lead mt-2">{tom}</p>}
    </section>
  );
}

/** En rad i arbetslistan. Hela raden är klickbar och leder till posten. */
function Arbetsrad({ vansterKolumn, titel, undertext, pid, markering, onOppna, oppnaText }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-hairline py-2.5 last:border-b-0">
      <span
        className={`w-[74px] shrink-0 font-head text-[12.5px] font-bold tabular-nums ${
          markering === "larm" ? "text-rod" : markering === "varning" ? "text-warn-ink" : "text-ink-soft"
        }`}
      >
        {vansterKolumn}
      </span>

      <span className="min-w-[200px] flex-1">
        <span className="block text-[13.5px] font-semibold leading-snug text-ink">{titel}</span>
        {undertext ? <span className="mt-0.5 block text-[12px] text-ink-soft">{undertext}</span> : null}
      </span>

      {pid ? <PTag pid={pid} /> : null}

      <button type="button" className="btn sec mini" onClick={onOppna}>
        Öppna
        <span className="sr-only">: {oppnaText || titel}</span>
      </button>
    </li>
  );
}

function Lista({ children }) {
  return <ul className="m-0 list-none p-0">{children}</ul>;
}

/* ---------- Sektionen ---------- */

export function Idag() {
  const { state } = usePortfolj();
  const { visa, setValtProjekt, oppnaPost } = useUi();
  const [horisont, setHorisont] = useState("30");

  const l = useMemo(() => arbetslage(state, Number(horisont)), [state, horisont]);

  /* Hoppa till en agendapost: byt projekt och gå till den vy som äger typen. */
  const oppnaAgenda = (rad) => {
    if (rad.pid && rad.pid !== "bada") setValtProjekt(rad.pid);
    visa((AGENDATYPER[rad.typ] || { vy: "oversikt" }).vy);
  };

  /* Frister pekar på en enskild post — ÄTA-vyn öppnar den direkt. */
  const oppnaFrist = (f) => {
    if (f.pid && f.pid !== "bada") setValtProjekt(f.pid);
    if (f.vy === "ata") oppnaPost("ata", f.id);
    else visa(f.vy);
  };

  const agendaRad = (r) => (
    <Arbetsrad
      key={`${r.typ}-${r.id}-${r.datum}`}
      vansterKolumn={dagsetikett(r.d)}
      markering={r.d < 0 ? "larm" : r.d <= 3 ? "varning" : ""}
      titel={
        <>
          <span aria-hidden="true" className="mr-1.5 text-one-bla">
            {(AGENDATYPER[r.typ] || {}).ikon || "•"}
          </span>
          {r.titel}
          {r.extra === "avvikelse" ? <span className="pill p-bad ml-2">Avvikelse</span> : null}
        </>
      }
      undertext={`${r.typ} · ${r.datum}`}
      pid={r.pid}
      onOppna={() => oppnaAgenda(r)}
      oppnaText={`${r.typ} ${r.titel}`}
    />
  );

  const attGora =
    l.frister.length + l.forfallet.length + l.idag.length + l.veckan.length + l.utanDatum.length;

  const lage =
    l.forfallnaFrister.length || l.forfallet.length
      ? "larm"
      : l.frister.length || l.idag.length
        ? "varning"
        : "lugn";

  return (
    <>
      {/* ---------- Sammanfattning ---------- */}
      <div
        className={`mb-4 flex flex-wrap items-center gap-5 rounded-card px-6 py-5 text-white ${
          lage === "larm" ? "bg-rod" : lage === "varning" ? "bg-orange" : "bg-one-djup"
        }`}
      >
        <div className="font-head text-[42px] font-bold leading-none">{attGora}</div>
        <div className="min-w-0">
          <div className="text-[12px] uppercase tracking-[.05em] opacity-85">
            {attGora === 1 ? "sak kräver din åtgärd" : "saker kräver din åtgärd"}
          </div>
          <div className="mt-1 text-[14px]">
            {l.forfallnaFrister.length
              ? `${l.forfallnaFrister.length} frist${l.forfallnaFrister.length > 1 ? "er" : ""} är överskriden — börja där.`
              : l.frister.length
                ? `${l.frister.length} frist${l.frister.length > 1 ? "er" : ""} löper just nu.`
                : l.forfallet.length
                  ? `${l.forfallet.length} post${l.forfallet.length > 1 ? "er" : ""} har passerat sitt datum.`
                  : "Inga frister löper. Nedan ligger det närmaste i tiden."}
          </div>
        </div>

        <div className="ml-auto">
          <Vyvaljare
            etikett="Horisont"
            varde={horisont}
            onValj={setHorisont}
            alternativ={HORISONTER}
          />
        </div>
      </div>

      {/* ---------- Frister ---------- */}
      <Grupp
        rubrik="Frister som löper"
        antal={l.frister.length}
        ton={l.forfallnaFrister.length ? "larm" : l.frister.length ? "varning" : "neutral"}
        tom="Alla ÄTA och hinder med händelsedatum är underrättade, alla incidenter rapporterade."
      >
        <Lista>
          {l.frister.map((f) => (
            <Arbetsrad
              key={f.id}
              vansterKolumn={
                f.timmar === null ? "—" : f.niva === "forfallen" ? `${Math.floor(f.timmar / 24)} d sen` : `${Math.max(0, 24 - f.timmar)} h`
              }
              markering={f.niva === "forfallen" ? "larm" : "varning"}
              titel={f.titel}
              undertext={`${f.typ} · ${f.text}`}
              pid={f.pid}
              onOppna={() => oppnaFrist(f)}
              oppnaText={f.titel}
            />
          ))}
        </Lista>
      </Grupp>

      {l.utanDatum.length ? (
        <Note niva="bad">
          <b>
            {l.utanDatum.length} post{l.utanDatum.length === 1 ? "" : "er"} saknar händelsedatum.
          </b>{" "}
          24-timmarsfristen kan inte räknas förrän datumet är ifyllt:{" "}
          {l.utanDatum.slice(0, 5).map((u) => u.nr).join(", ")}
          {l.utanDatum.length > 5 ? " m.fl." : ""}
          <div className="rowbtns">
            <button type="button" className="btn mini" onClick={() => visa("ata")}>
              Öppna ÄTA och hinder
            </button>
          </div>
        </Note>
      ) : null}

      {/* ---------- Förfallet ---------- */}
      <Grupp
        rubrik="Har passerat sitt datum"
        antal={l.forfallet.length}
        ton="larm"
        tom="Inget har passerat sitt datum."
      >
        <Lista>{l.forfallet.map(agendaRad)}</Lista>
      </Grupp>

      {/* ---------- Idag och denna vecka ---------- */}
      <Grupp
        rubrik="Idag och inom sju dagar"
        antal={l.idag.length + l.veckan.length}
        ton={l.idag.length ? "varning" : "neutral"}
        tom="Inget med datum den närmaste veckan."
      >
        <Lista>
          {l.idag.map(agendaRad)}
          {l.veckan.map(agendaRad)}
        </Lista>
      </Grupp>

      {/* ---------- Längre fram ---------- */}
      <Grupp
        rubrik={`Längre fram — inom ${horisont} dagar`}
        antal={l.kommande.length}
        tom={`Inget mer med datum inom ${horisont} dagar.`}
      >
        <Lista>{l.kommande.map(agendaRad)}</Lista>
      </Grupp>

      <Note>
        <b>Vad som räknas här.</b> Frister mäts i timmar och kommer ur ABT 06: underrättelse om störning
        inom 24 timmar från händelsen, incidentrapport inom 24 timmar. Agendan mäts i dagar och samlar
        milstolpar, leveranser, faktureringstillfällen, öppna punkter, byggmöten och kontraktets
        färdigställandetid. Poster utan datum syns inte i listan — de ligger under respektive flik.
      </Note>
    </>
  );
}
