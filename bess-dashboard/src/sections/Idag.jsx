import { useMemo, useState } from "react";
import { ChevronRight, CircleCheck } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { PTag } from "../components/ui/PTag.jsx";
import { Callout, Card, Overline, StatusBadge } from "../components/ds/index.js";
import { Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { AGENDATYPER, arbetslage, dagsetikett } from "../lib/agenda.js";
import { kritiskLinje } from "../lib/kritiskLinje.js";
import { datumKort, idag } from "../lib/datum.js";
import { useSnabbUtskrift } from "../components/field/SnabbUtskrift.jsx";
import { SiteToppvy } from "../components/site/SiteToppvy.jsx";
import { arNal, arOppenPunkt, siteObjekt } from "../lib/site.js";

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
   till en rad när båda är tomma, så att det som finns hamnar högt upp.

   Bandet svarar först på "blir vi klara i tid" för valt projekt, ur
   kritiskLinje() — samma motor som Tidplan, inget räknas om här. Sedan på
   "vad gör jag nu": antalet att göra med dagens märke. Två märken, två frågor,
   olika ord. Ytan förblir one-djup även när projektet är sent. */

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

/** Ett tal i bandet. Egen rad, inte StatTile: bandet är mörkt och talen ska
 *  inte bli vita kort i kortet. */
function Bandtal({ etikett, varde, detalj, className = "" }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 py-2 sm:gap-1.5 sm:px-4 sm:py-3 sm:first:pl-0 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">{etikett}</span>
      <span className="text-2xl font-bold leading-none tabular-nums text-white">{varde}</span>
      {detalj ? <span className="text-[12px] leading-snug text-white/70">{detalj}</span> : null}
    </div>
  );
}

const lankKlass =
  "cursor-pointer border-0 bg-transparent p-0 font-body text-white underline underline-offset-2 hover:text-white/80";

/* ---------- Sektionen ---------- */

export function Idag() {
  const { state } = usePortfolj();
  const { visa, setValtProjekt, oppnaPost, valtProjekt } = useUi();
  const [horisont, setHorisont] = useState("30");
  const snabb = useSnabbUtskrift();

  const l = useMemo(() => arbetslage(state, Number(horisont)), [state, horisont]);

  /* Domen för valt projekt — samma motor som Tidplan. */
  const p = state.projekt.find((x) => x.id === valtProjekt) || state.projekt[0];
  const nu = idag();
  const k = useMemo(() => (p ? kritiskLinje(state, p.id, nu) : null), [state, p, nu]);
  const kritiska = k ? k.faser.filter((f) => f.kritisk) : [];
  const dom = !k || k.forsening === null
    ? { ton: "warn", text: "Uppgifter saknas" }
    : k.forsening > 0
      ? { ton: "bad", text: `${k.forsening} ${k.forsening === 1 ? "dag" : "dagar"} sent` }
      : { ton: "ok", text: "I tid" };
  const domMening = !k
    ? "Ange start och slut på projektet."
    : k.forsening > 0
      ? `Beräknat ${k.forsening} ${k.forsening === 1 ? "dag" : "dagar"} efter kontraktets färdigdatum. ${kritiska.length === 1 ? "Den kritiska fasen flyttar" : "De kritiska faserna flyttar"} slutbesiktningen.`
      : k.slutPrognos
        ? `Slutbesiktning beräknas till ${datumKort(k.slutPrognos)}${k.kontrakt ? `, kontraktet säger ${datumKort(k.kontrakt)}` : ""}.`
        : "Slutbesiktningen kan inte beräknas ännu.";
  const dagar = (n) => (n === 0 ? "0 dagar" : `${n > 0 ? "+" : "−"}${Math.abs(n)} ${Math.abs(n) === 1 ? "dag" : "dagar"}`);

  /* Utförare med öppna punkter i listan, för valt projekt — papper via snabbutskrift. */
  const utforareIListan = p
    ? [...new Set([...l.forfallet, ...l.idag, ...l.veckan]
        .filter((r) => r.typ === "Punkt" && (r.pid === p.id || r.pid === "bada"))
        .map((r) => (state.punkter || []).find((x) => x.id === r.id))
        .map((x) => x?.utforare || "")
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv")).slice(0, 4)
    : [];

  /* Siten för valt projekt — toppvyn visas bara när det finns volymer. */
  const site = p ? siteObjekt(state, p.id) : [];
  const siteVolymer = site.filter((o) => !arNal(o)).length;
  const siteNalar = site.filter(arNal).map((o) => ({ o, punkt: (state.punkter || []).find((x) => x.id === o.punktId) }));
  const oppnaNalar = siteNalar.filter((n) => arOppenPunkt(n.punkt)).length;

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
        className="flex flex-col gap-3 rounded-xl bg-one-djup print:hidden px-5 py-5 text-white shadow-sm md:px-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">Blir vi klara i tid</span>
          <StatusBadge ton={dom.ton} label={dom.text} />
        </div>
        {p ? (
          <p className="m-0 text-[19px] font-semibold leading-snug text-white">
            {p.nr ? `${p.nr} ` : ""}
            {p.namn}
          </p>
        ) : null}
        <p className="m-0 text-[14px] text-white/80">{domMening}</p>

        <div className="grid grid-cols-1 border-0 border-t border-solid border-white/15 sm:grid-cols-3 lg:grid-cols-4">
          <Bandtal
            etikett="Beräknad slutbesiktning"
            varde={k?.slutPrognos ? datumKort(k.slutPrognos) : "—"}
            detalj={k?.kontrakt ? `kontraktet: ${datumKort(k.kontrakt)}` : null}
          />
          <Bandtal
            className="sm:border-0 sm:border-l sm:border-solid sm:border-white/15"
            etikett="Mot ursprunglig plan"
            varde={k?.baslinje && k.motBaslinje !== null ? dagar(k.motBaslinje) : "—"}
            detalj={
              k && !k.baslinje ? (
                <>
                  Ingen baslinje.{" "}
                  <button type="button" className={lankKlass} onClick={() => visa("tidplan")}>
                    Spara på tidplanen
                  </button>
                </>
              ) : k?.baslinje ? `sparad ${k.baslinje.sparad}` : null
            }
          />
          <Bandtal
            className="sm:border-0 sm:border-l sm:border-solid sm:border-white/15"
            etikett="Styr slutdatumet"
            varde={k ? `${kritiska.length} ${kritiska.length === 1 ? "fas" : "faser"}` : "—"}
            detalj={k ? `av ${k.faser.length} faser` : null}
          />
          <div className="flex min-w-0 flex-col gap-1.5 border-0 border-t border-solid border-white/15 py-3 sm:col-span-3 lg:col-span-1 lg:border-l lg:border-t-0 lg:px-4">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                {attGora === 1 ? "Sak kräver din åtgärd" : "Saker kräver din åtgärd"}
              </span>
              <StatusBadge ton={LAGE[lage].ton} label={LAGE[lage].text} />
            </span>
            <span className="text-2xl font-bold leading-none tabular-nums text-white">{attGora}</span>
            <span className="text-[12px] leading-snug text-white/70">
            {l.forfallnaFrister.length
              ? `${l.forfallnaFrister.length} frist${l.forfallnaFrister.length > 1 ? "er" : ""} är överskriden — börja där.`
              : l.frister.length
                ? `${l.frister.length} frist${l.frister.length > 1 ? "er" : ""} löper just nu.`
                : l.forfallet.length
                  ? `${l.forfallet.length} post${l.forfallet.length > 1 ? "er" : ""} har passerat sitt datum.`
                  : l.utanDatum.length
                    ? `${l.utanDatum.length} post${l.utanDatum.length > 1 ? "er" : ""} saknar händelsedatum — fyll i det först.`
                    : "Inga frister löper. Nedan ligger det närmaste i tiden."}
            </span>
          </div>
        </div>

        <div className="border-0 border-t border-solid border-white/15 pt-3 text-[13px]">
          {!k ? null : kritiska.length ? (
            <p className="m-0 font-semibold text-white">
              <span className="font-normal text-white/70">Faser som styr: </span>
              {kritiska.map((f, i) => (
                <span key={f.nr}>
                  {i ? <span aria-hidden="true" className="text-white/50"> · </span> : null}
                  <button type="button" className={`${lankKlass} font-semibold`} onClick={() => { setValtProjekt(p.id); oppnaPost("epc", `fas-${f.nr}`); }}>
                    {f.nr} {f.kort}
                  </button>
                </span>
              ))}
            </p>
          ) : (
            <p className="m-0 text-white/80">Ingen fas styr slutdatumet.</p>
          )}
        </div>
      </section>

      {/* ---------- Siten ovanifrån ----------
          Ritad ur samma volymer som 3D-vyn. Ingen ruta utan volymer. */}
      {siteVolymer ? (
        <Card
          id="idag-site"
          title="Siten"
          subtitle={`${siteVolymer} ${siteVolymer === 1 ? "volym" : "volymer"}${oppnaNalar ? `, ${oppnaNalar} ${oppnaNalar === 1 ? "nål" : "nålar"} på öppna punkter` : ""}. Klicka på bilden för att gå in.`}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,520px)_minmax(0,1fr)] md:items-start">
            <button
              type="button"
              onClick={() => visa("site")}
              aria-label={`Öppna siten för ${p.nr ? `${p.nr} ` : ""}${p.namn}`}
              className="block w-full cursor-pointer rounded-lg border border-solid border-hairline bg-transparent p-0 transition-colors hover:border-one-bla focus-visible:outline focus-visible:outline-2 focus-visible:outline-one-bla"
            >
              <SiteToppvy objekt={site} etikett="Toppvy över siten" className="rounded-lg" />
            </button>
            <div className="flex min-w-0 flex-col gap-2">
              <Overline>Nålar på siten</Overline>
              {siteNalar.length ? (
                <ul className="m-0 list-none p-0 text-[13px]">
                  {siteNalar.map(({ o, punkt }) => (
                    <li key={o.id} className="flex items-baseline gap-2 border-0 border-t border-solid border-hairline py-1.5 first:border-t-0">
                      <span aria-hidden="true" className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full bg-orange" />
                      <span className="min-w-0 flex-1 text-ink">
                        {punkt ? punkt.titel : "Punkten finns inte längre"}
                        {punkt && !arOppenPunkt(punkt) ? <span className="text-ink-soft"> (klar)</span> : null}
                      </span>
                      {punkt?.forfaller ? <span className="shrink-0 tabular-nums text-ink-soft">{datumKort(punkt.forfaller)}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[13px] text-ink-soft">Inga nålar. En nål på siten pekar på en öppen punkt.</p>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {!k && p ? (
        <Callout ton="info">
          Ange projektets startdatum och färdigdatum under Översikt eller Bygga batteripark. Då räknas planen fram.
        </Callout>
      ) : null}

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

      {utforareIListan.length ? (
        <div className="flex flex-wrap items-center gap-2 text-[13px]" role="group" aria-label="Skriv ut arbetslista">
          <span className="text-ink-soft">Papper till laget:</span>
          {utforareIListan.map((n) => (
            <button key={n} type="button" className="btn sec mini" onClick={() => snabb.arbetslista(p.id, { utforare: n })}>
              Skriv ut arbetslista – {n}
            </button>
          ))}
        </div>
      ) : null}

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
