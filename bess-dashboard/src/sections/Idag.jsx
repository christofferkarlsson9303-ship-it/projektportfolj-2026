import { useMemo, useState } from "react";
import { ChevronRight, CircleCheck } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { PTag } from "../components/ui/PTag.jsx";
import { Callout, Card, StatusBadge } from "../components/ds/index.js";
import { Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { AGENDATYPER, arbetslage, dagsetikett } from "../lib/agenda.js";

/* Idag — projektledarens arbetslista.

   Resten av verktyget är ordnat efter dokumenttyp: ÄTA för sig, risker för sig,
   dagbok för sig. Arbetsdagen är inte ordnad så. Den här vyn vänder på det och
   samlar allt som kräver handling, sorterat på hur bråttom det är — frister
   först, sedan förfallet, sedan det närmaste i tiden.

   Varje rad går direkt till rätt post, inte bara till rätt flik.

   Vyn står på designsystemet: sammanfattningen är en mörk ruta i ONE Blågrön
   (läget bärs av ett statusmärke, inte av en röd eller orange yta), varje
   grupp är ett Card med antal till höger och en smal kant i gruppens ton.
   Tomma grupper visas inte som egna kort — frister och förfallet slås ihop
   till en rad när båda är tomma, så att det som finns hamnar högt upp. */

const HORISONTER = [
  ["14", "14 dagar"],
  ["30", "30 dagar"],
  ["60", "60 dagar"],
  ["90", "90 dagar"],
];

/* ---------- Byggstenar ---------- */

const GRUPPTON = {
  larm: { kant: "border-l-[3px] border-l-rod", antal: "bg-bad-bg text-bad-ink" },
  varning: { kant: "border-l-[3px] border-l-orange", antal: "bg-warn-bg text-warn-ink" },
  neutral: { kant: "", antal: "bg-sunken text-ink-soft" },
};

/** Antal i gruppens huvud — bara siffran, i gruppens ton. */
function Antal({ n, klass }) {
  return (
    <span
      className={`inline-flex min-w-[26px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${klass}`}
    >
      {n}
      <span className="sr-only"> poster</span>
    </span>
  );
}

function Grupp({ id, rubrik, antal, ton = "neutral", action, children, tom }) {
  const t = GRUPPTON[antal ? ton : "neutral"];
  return (
    <Card
      id={id}
      title={rubrik}
      className={t.kant}
      badge={antal ? <Antal n={antal} klass={t.antal} /> : null}
      action={action}
    >
      {antal ? children : <p className="m-0 text-[13px] text-ink-soft">{tom}</p>}
    </Card>
  );
}

/** En rad i arbetslistan. Hela raden är en knapp som leder till posten —
 *  ingen separat "Öppna"-knapp per rad. Namnet börjar med "Öppna" för
 *  skärmläsare, pilen till höger visar det för seende. */
function Arbetsrad({ vansterKolumn, titel, undertext, pid, markering, onOppna }) {
  return (
    <li className="border-0 border-t border-solid border-hairline first:border-t-0">
      <button
        type="button"
        onClick={onOppna}
        className="group -mx-2 flex w-[calc(100%+16px)] cursor-pointer items-center gap-x-3 rounded-lg border-0 bg-transparent px-2 py-2.5 text-left font-body text-ink transition-colors hover:bg-sunken"
      >
        <span className="sr-only">Öppna: </span>
        <span
          className={`w-[64px] shrink-0 text-right text-[12.5px] tabular-nums ${
            markering === "larm"
              ? "font-bold text-bad-ink"
              : markering === "varning"
                ? "font-bold text-warn-ink"
                : "font-semibold text-ink-soft"
          }`}
        >
          {vansterKolumn}
        </span>

        <span className="min-w-0 flex-1 pl-2">
          <span data-titel className="block text-[13.5px] font-semibold leading-snug text-ink">
            {titel}
          </span>
          {undertext ? <span className="mt-0.5 block text-[12px] text-ink-soft">{undertext}</span> : null}
        </span>

        {pid ? <PTag pid={pid} /> : null}

        <ChevronRight
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="shrink-0 text-ink-faint transition-colors group-hover:text-one-djup"
        />
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
          {r.titel}
          {r.extra === "avvikelse" ? <StatusBadge status="forsenad" label="Avvikelse" className="ml-2" /> : null}
        </>
      }
      undertext={`${r.typ} · ${r.datum}`}
      pid={r.pid}
      onOppna={() => oppnaAgenda(r)}
    />
  );

  const attGora =
    l.frister.length + l.forfallet.length + l.idag.length + l.veckan.length + l.utanDatum.length;

  const lage =
    l.forfallnaFrister.length || l.forfallet.length
      ? "larm"
      : l.frister.length || l.idag.length || l.utanDatum.length
        ? "varning"
        : "lugn";

  const LAGE = {
    larm: { ton: "bad", text: "Frist eller datum passerat" },
    varning: { ton: "warn", text: "Bevaka" },
    lugn: { ton: "ok", text: "Lugnt läge" },
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* ---------- Sammanfattning ---------- */}
      <section
        aria-label="Sammanfattning"
        className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl bg-one-djup px-5 py-5 text-white shadow-sm md:px-6"
      >
        <div className="text-[42px] font-bold leading-none tabular-nums">{attGora}</div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">
              {attGora === 1 ? "sak kräver din åtgärd" : "saker kräver din åtgärd"}
            </span>
            <StatusBadge ton={LAGE[lage].ton} label={LAGE[lage].text} />
          </div>
          <div className="text-[14px]">
            {l.forfallnaFrister.length
              ? `${l.forfallnaFrister.length} frist${l.forfallnaFrister.length > 1 ? "er" : ""} är överskriden — börja där.`
              : l.frister.length
                ? `${l.frister.length} frist${l.frister.length > 1 ? "er" : ""} löper just nu.`
                : l.forfallet.length
                  ? `${l.forfallet.length} post${l.forfallet.length > 1 ? "er" : ""} har passerat sitt datum.`
                  : l.utanDatum.length
                    ? `${l.utanDatum.length} post${l.utanDatum.length > 1 ? "er" : ""} saknar händelsedatum — fyll i det först.`
                    : "Inga frister löper. Nedan ligger det närmaste i tiden."}
          </div>
        </div>
      </section>

      {l.utanDatum.length ? (
        <Callout ton="bad">
          <b>
            {l.utanDatum.length} post{l.utanDatum.length === 1 ? "" : "er"} saknar händelsedatum.
          </b>{" "}
          24-timmarsfristen kan inte räknas förrän datumet är ifyllt:{" "}
          {l.utanDatum.slice(0, 5).map((u) => u.nr).join(", ")}
          {l.utanDatum.length > 5 ? " m.fl." : ""}
          <div className="mt-2">
            <button type="button" className="btn djup mini" onClick={() => visa("ata")}>
              Öppna ÄTA och hinder
            </button>
          </div>
        </Callout>
      ) : null}

      {/* ---------- Frister och förfallet ----------
          Tomma grupper får inget eget kort. Är båda tomma blir de en rad. */}
      {l.frister.length ? (
        <Grupp
          id="idag-frister"
          rubrik="Frister som löper"
          antal={l.frister.length}
          ton={l.forfallnaFrister.length ? "larm" : "varning"}
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
              />
            ))}
          </Lista>
        </Grupp>
      ) : null}

      {l.forfallet.length ? (
        <Grupp id="idag-forfallet" rubrik="Har passerat sitt datum" antal={l.forfallet.length} ton="larm">
          <Lista>{l.forfallet.map(agendaRad)}</Lista>
        </Grupp>
      ) : null}

      {!l.frister.length && !l.forfallet.length ? (
        <section
          aria-label="Frister och förfallet"
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-solid border-hairline bg-surface px-4 py-3 text-[13.5px] text-ink md:px-6"
        >
          <CircleCheck size={17} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-ok-ink" />
          <span className="font-semibold">Inga frister löper</span>
          <span aria-hidden="true" className="text-ink-faint">·</span>
          <span className="font-semibold">Inget har passerat sitt datum</span>
          <span className="basis-full pl-[29px] text-[12.5px] text-ink-soft md:basis-auto md:pl-0 md:ml-auto">
            ÄTA och hinder underrättade, incidenter rapporterade
          </span>
        </section>
      ) : null}

      {/* ---------- Idag och denna vecka ---------- */}
      <Grupp
        id="idag-veckan"
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
        id="idag-kommande"
        rubrik={`Längre fram — inom ${horisont} dagar`}
        antal={l.kommande.length}
        action={<Vyvaljare etikett="Horisont" varde={horisont} onValj={setHorisont} alternativ={HORISONTER} />}
        tom={`Inget mer med datum inom ${horisont} dagar.`}
      >
        <Lista>{l.kommande.map(agendaRad)}</Lista>
      </Grupp>

      <Callout>
        <b>Vad som räknas här.</b> Frister mäts i timmar och kommer ur ABT 06: underrättelse om störning
        inom 24 timmar från händelsen, incidentrapport inom 24 timmar. Agendan mäts i dagar och samlar
        milstolpar, leveranser, faktureringstillfällen, öppna punkter, byggmöten och kontraktets
        färdigställandetid. Poster utan datum syns inte i listan — de ligger under respektive flik.
      </Callout>
    </div>
  );
}
