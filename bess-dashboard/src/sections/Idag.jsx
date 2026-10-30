import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, CircleCheck, Printer } from "lucide-react";
import { usePortfolj, usePortfoljAtgarder, useUi } from "../state/hooks.js";
import { SnabbRad } from "../components/idag/SnabbRad.jsx";
import { useTangentlista } from "../components/idag/useTangentlista.js";
import { PTag } from "../components/ui/PTag.jsx";
import { StatusBadge } from "../components/ds/index.js";
import { Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { AGENDATYPER, arbetslage, dagsetikett } from "../lib/agenda.js";
import { kritiskLinje } from "../lib/kritiskLinje.js";
import { tidsdom } from "../lib/tidsdom.js";
import { datumKort, idag } from "../lib/datum.js";
import { useSnabbUtskrift } from "../components/field/SnabbUtskrift.jsx";
import { PunktPanel } from "../components/idag/PunktPanel.jsx";
import { arNal, siteObjekt } from "../lib/site.js";
import { Veckorutin } from "../components/idag/Veckorutin.jsx";
import { Ekonomirad } from "../components/idag/Ekonomirad.jsx";
import { HeroBild } from "../components/oversikt/Hero.jsx";

/* Idag — projektledarens arbetslista.

   Tre block, inget mer:

   0. Projektet (eller "Alla projekt") väljs i toppraden. I projektläge gäller
      allt på sidan det projektet; i portföljläge visas alla projekt och varje
      rad anger vilket projekt den hör till.
   1. Bandet svarar på "blir vi klara i tid" för valt projekt, ur
      kritiskLinje() — samma motor som Tidplan, inget räknas om här — och på
      hur många saker som väntar på dig. Faserna som styr visas bara när
      projektet är sent; då är det dem man ska öppna.
   2. Ett kort med allt som kräver handling, i tre rubriker efter hur
      bråttom det är: Brådskande (frister och passerade datum), Idag,
      Denna vecka. Tomma rubriker visas inte. Papper till laget ligger i
      kortets fot.
   3. Längre fram, infällt. Horisonten väljs där inne.

   Förklaringen av vad som räknas ligger i sidhjälpen ovanför, inte här.
   Varje rad går direkt till rätt post, inte bara till rätt flik. */

const HORISONTER = [
  ["14", "14 dagar"],
  ["30", "30 dagar"],
  ["60", "60 dagar"],
  ["90", "90 dagar"],
];

const MARKERING = {
  larm: "font-bold text-bad-ink",
  varning: "font-bold text-warn-ink",
  "": "font-semibold text-ink-soft",
};

/** Bocken till vänster på en punkt, i en fast kolumn på 32 px. Tom ring = öppen;
 *  ett klick markerar klar. Ifylld = nyss klar; ett klick till ångrar, som en
 *  kryssruta. Samma bredd i båda lägena, så att raden inte flyttar sig. */
function Bock({ titel, klar, onKlar, onAngra }) {
  return (
    <button
      type="button"
      onClick={klar ? onAngra : onKlar}
      aria-label={klar ? `Ångra klar: ${titel}` : `Markera klar: ${titel}`}
      title={klar ? "Ångra (x)" : "Markera klar (x)"}
      className="group/bock flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 transition-colors duration-150 ease-one hover:bg-ok-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-one-bla"
    >
      <span
        className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-solid transition-colors duration-150 ease-one ${
          klar ? "border-ok-ink bg-ok-ink" : "border-hairline-stark group-hover/bock:border-ok-ink"
        }`}
      >
        <Check
          size={12}
          strokeWidth={3}
          aria-hidden="true"
          className={`transition-opacity duration-150 ease-one ${klar ? "text-surface opacity-100" : "text-ok-ink opacity-0 group-hover/bock:opacity-100"}`}
        />
      </span>
    </button>
  );
}

/** En rad i arbetslistan. Radens huvudknapp leder till posten; den bär
 *  data-rad så att j/k hittar den (useTangentlista). Namnet börjar med "Öppna"
 *  för skärmläsare, pilen visar det för seende. En punkt har en bock framför;
 *  en nyss klarmarkerad punkt står kvar på sin plats, överstruken, med Ångra. */
function Arbetsrad({ nar, titel, undertext, pid, markering = "", onOppna, punktId, klar = false, onKlar, onAngra, bockTitel }) {
  return (
    <li className="flex items-center gap-1 border-0 border-t border-solid border-hairline first:border-t-0">
      {/* Samma vänsterkolumn på alla rader, så att datum och rubriker står i linje. */}
      {punktId ? <Bock titel={bockTitel} klar={klar} onKlar={onKlar} onAngra={onAngra} /> : <span aria-hidden="true" className="w-8 shrink-0" />}
      <button
        type="button"
        onClick={onOppna}
        data-rad=""
        data-punkt={punktId && !klar ? punktId : undefined}
        data-klar={klar ? punktId : undefined}
        className={`group flex min-w-0 flex-1 cursor-pointer items-center gap-x-3 rounded-sm border-0 bg-transparent py-2.5 text-left font-body text-ink transition-colors duration-150 ease-one hover:bg-sunken focus-visible:bg-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-one-bla -mr-2 px-2`}
      >
        <span className="sr-only">Öppna: </span>
        <span className={`w-[58px] shrink-0 text-[12.5px] tabular-nums ${klar ? "font-semibold text-ok-ink" : MARKERING[markering]}`}>{klar ? "Klar" : nar}</span>
        <span className="min-w-0 flex-1">
          <span data-titel className={`block text-[14px] font-semibold leading-snug ${klar ? "text-ink-faint line-through" : "text-ink"}`}>
            {titel}
          </span>
          {undertext ? <span className="mt-0.5 block text-[12px] text-ink-soft">{undertext}</span> : null}
          {/* På smal skärm under rubriken, så att rubriken får hela bredden. */}
          {pid ? <span className="mt-1 block sm:hidden"><PTag pid={pid} /></span> : null}
        </span>
        {pid ? <span className="hidden shrink-0 sm:block"><PTag pid={pid} /></span> : null}
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

const PRICK = { larm: "bg-rod", varning: "bg-orange", "": "bg-hairline-stark" };

/** En tangent i kortkommandoraden. */
function Tangent({ children }) {
  return (
    <kbd className="inline-flex min-w-[20px] items-center justify-center rounded-sm border border-solid border-hairline-stark bg-sunken px-1 font-body text-[11px] font-bold leading-[18px] text-ink-soft">
      {children}
    </kbd>
  );
}

/** En rubrik i arbetskortet med sina rader. Visas inte när den är tom.
 *  `antal` är det som återstår; `synliga` tar även med nyss klarmarkerade rader,
 *  så att en rubrik inte försvinner medan dess sista punkt kan ångras. */
function Del({ id, rubrik, ton = "", children, antal, synliga = antal }) {
  if (!antal && !synliga) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <h4 id={id} className="m-0 flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-ink-soft">
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PRICK[ton]}`} />
        {rubrik}
        <span className="font-semibold tabular-nums text-ink-faint">{antal}</span>
      </h4>
      <ul className="m-0 list-none p-0">{children}</ul>
    </section>
  );
}

/** Ett stort tal i bandet. */
function Bandtal({ etikett, varde, detalj }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">{etikett}</span>
      <span className="text-[26px] font-bold leading-none tabular-nums text-white">{varde}</span>
      {detalj ? <span className="text-[12px] leading-snug text-white/70">{detalj}</span> : null}
    </div>
  );
}

const lankKlass =
  "cursor-pointer border-0 bg-transparent p-0 font-body text-[13px] font-semibold text-white underline underline-offset-2 hover:text-white/80";

export function Idag() {
  const { state } = usePortfolj();
  const { visa, setValtProjekt, oppnaPost, valtProjekt, lage, setLage } = useUi();
  const [horisont, setHorisont] = useState("30");
  /* Punkten vars detaljpanel är öppen. Panelen och listan delar sammanhang:
     stängs panelen står man kvar i samma lista med samma val. */
  const [panelId, setPanelId] = useState(null);
  const portfolj = lage === "portfolj";
  const snabb = useSnabbUtskrift();
  const { dispatch } = usePortfoljAtgarder();
  const rotRef = useRef(null);
  const snabbRef = useRef(null);

  /* Nyss klarmarkerade punkter står kvar på sin plats i sex sekunder, överstrukna
     med Ångra — ingen bekräftelsedialog. Statusen ändras direkt och loggas som
     alla statusbyten; Ångra är ett nytt statusbyte tillbaka till öppen. */
  const [nyssKlara, setNyssKlara] = useState(() => new Set());
  const timrar = useRef(new Map());
  useEffect(() => {
    const t = timrar.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const slapp = useCallback((id) => {
    clearTimeout(timrar.current.get(id));
    timrar.current.delete(id);
    setNyssKlara((s) => {
      if (!s.has(id)) return s;
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  }, []);

  const markeraKlar = useCallback((id) => {
    const pt = (state.punkter || []).find((x) => x.id === id);
    if (!pt || pt.status === "klarmarkerad") return;
    dispatch({ type: "UPPDATERA_STATUS", lista: "punkter", id, falt: "status", varde: "klarmarkerad" });
    setNyssKlara((s) => new Set(s).add(id));
    clearTimeout(timrar.current.get(id));
    timrar.current.set(id, setTimeout(() => {
      /* Har raden fokus när den försvinner flyttas fokus till nästa rad, så att
         j/k fortsätter där man var. */
      const rad = rotRef.current?.querySelector(`[data-klar="${CSS.escape(id)}"]`);
      if (rad && rad === document.activeElement) {
        const alla = [...rotRef.current.querySelectorAll("[data-rad]")].filter((r) => r.getClientRects().length > 0);
        const i = alla.indexOf(rad);
        (alla[i + 1] || alla[i - 1])?.focus();
      }
      slapp(id);
    }, 6000));
  }, [state.punkter, dispatch, slapp]);

  const angra = useCallback((id) => {
    slapp(id);
    dispatch({ type: "UPPDATERA_STATUS", lista: "punkter", id, falt: "status", varde: "oppen" });
  }, [dispatch, slapp]);

  /* Domen för valt projekt — samma motor som Tidplan. */
  const p = state.projekt.find((x) => x.id === valtProjekt) || state.projekt[0];
  const filterPid = portfolj ? null : p?.id || null;
  /* Listan räknas som om de nyss klara fortfarande vore öppna, så att de står kvar på sin plats. */
  const listState = useMemo(
    () => (nyssKlara.size ? { ...state, punkter: state.punkter.map((pt) => (nyssKlara.has(pt.id) ? { ...pt, status: "oppen" } : pt)) } : state),
    [state, nyssKlara]
  );
  const l = useMemo(() => arbetslage(listState, Number(horisont), filterPid), [listState, horisont, filterPid]);
  const arKlar = (r) => r.typ === "Punkt" && nyssKlara.has(r.id);
  const klara = (lista) => lista.filter(arKlar).length;

  useTangentlista({
    rotRef,
    onKlar: markeraKlar,
    onAngra: angra,
    onNy: () => snabbRef.current?.focus(),
    onSkrivUt: !portfolj && p ? () => snabb.arbetslista(p.id) : undefined,
  });
  const nu = idag();
  const k = useMemo(() => (p ? kritiskLinje(state, p.id, nu) : null), [state, p, nu]);
  const kritiska = k ? k.faser.filter((f) => f.kritisk) : [];
  const sent = !!k && k.forsening > 0;
  /* Domen — samma text som portföljen och Översikt (lib/tidsdom.js). En sen
     leverans som inte är markerad levererad ger "Risk", aldrig "I tid". */
  const dom = p ? tidsdom(state, p.id, nu, k) : { ton: "warn", text: "Uppgifter saknas", mening: null, sena: [] };
  const domMening = !k
    ? "Ange start och slut på projektet under Översikt, så räknas planen fram."
    : sent
      ? `Beräknat ${k.forsening} ${k.forsening === 1 ? "dag" : "dagar"} efter kontraktets färdigdatum. ${kritiska.length === 1 ? "Det kritiska momentet flyttar" : "De kritiska momenten flyttar"} slutbesiktningen.`
      : [k.kontrakt ? `Kontraktet säger ${datumKort(k.kontrakt)}.` : "Kontraktets färdigdatum saknas.", dom.mening].filter(Boolean).join(" ");

  const dagar = (n) => (n === 0 ? "0 dagar" : `${n > 0 ? "+" : "−"}${Math.abs(n)} ${Math.abs(n) === 1 ? "dag" : "dagar"}`);
  const motPlan = k?.baslinje && k.motBaslinje !== null ? `${dagar(k.motBaslinje)} mot plan` : "beräknad";

  const harSite = p ? siteObjekt(state, p.id).some((o) => !arNal(o)) : false;

  /* Brådskande: frister först, sedan det som passerat sitt datum. Nyss klara räknas inte. */
  const bradskande = l.frister.length + l.forfallet.length - klara(l.forfallet) + (l.utanDatum.length ? 1 : 0);
  const narmast = l.idag.length - klara(l.idag) + l.veckan.length - klara(l.veckan);
  /* Samma rader som listan visar — ÄTA utan datum är en rad, inte en per ÄTA. */
  const attGora = bradskande + narmast;

  /* Utförare med öppna punkter i listan, för valt projekt — papper via snabbutskrift. */
  const utforareIListan = p && !portfolj
    ? [...new Set([...l.forfallet, ...l.idag, ...l.veckan]
        .filter((r) => r.typ === "Punkt" && (r.pid === p.id || r.pid === "bada"))
        .map((r) => (state.punkter || []).find((x) => x.id === r.id))
        .map((x) => x?.utforare || "")
        .filter(Boolean))].sort((a, b) => a.localeCompare(b, "sv")).slice(0, 4)
    : [];

  /* Hoppa till en agendapost: byt projekt och gå till den vy som äger typen. */
  const oppnaAgenda = (rad) => {
    /* Punkter hanteras i panelen, utan sidbyte. Allt annat leder till sin vy. */
    if (rad.typ === "Punkt") {
      setPanelId(rad.id);
      return;
    }
    if (rad.pid && rad.pid !== "bada") setValtProjekt(rad.pid);
    visa((AGENDATYPER[rad.typ] || { vy: "oversikt" }).vy);
  };

  const oppnaPunktRegister = () => {
    const pt = state.punkter.find((x) => x.id === panelId);
    if (pt && pt.projektId !== "bada") {
      setValtProjekt(pt.projektId);
      setLage("projekt");
    }
    setPanelId(null);
    visa("punkter");
  };

  /* Varför en punkt ligger där den ligger. */
  const varfor = (r) => {
    const egen = r.uppfoljning && r.uppfoljning === r.datum;
    if (r.d < 0) return egen ? "Din uppföljning har passerat" : "Fristen har passerat";
    return egen ? "Din uppföljning" : "Fristen närmar sig";
  };
  const punktText = (r) =>
    [
      "Punkt",
      r.agare ? `Ansvarig: ${r.agare}` : "Ansvarig saknas",
      r.forfaller ? `frist ${datumKort(r.forfaller)}` : "ingen frist",
      r.uppfoljning ? `uppföljning ${datumKort(r.uppfoljning)}` : null,
      r.plats ? `plats ${r.plats}` : null,
      r.foton ? `${r.foton} foto${r.foton > 1 ? "n" : ""}` : null,
      varfor(r),
    ].filter(Boolean).join(" · ");

  /* Frister pekar på en enskild post — ÄTA-vyn öppnar den direkt. */
  const oppnaFrist = (f) => {
    if (f.pid && f.pid !== "bada") setValtProjekt(f.pid);
    if (f.vy === "ata") oppnaPost("ata", f.id);
    else visa(f.vy);
  };

  const agendaRad = (r) => (
    <Arbetsrad
      key={`${r.typ}-${r.id}-${r.datum}`}
      nar={dagsetikett(r.d)}
      markering={r.d < 0 ? "larm" : r.d <= 3 ? "varning" : ""}
      titel={
        <>
          {r.titel}
          {r.extra === "avvikelse" ? <StatusBadge status="forsenad" label="Avvikelse" className="ml-2" /> : null}
        </>
      }
      undertext={
        r.typ === "Punkt"
          ? punktText(r)
          : r.typ === "Beställning"
            ? `Beställ senast ${r.datum} · ledtid ${r.ledtidVeckor} v till moment ${r.moment}`
            : `${r.typ} · ${r.datum}`
      }
      pid={r.pid}
      onOppna={() => oppnaAgenda(r)}
      punktId={r.typ === "Punkt" ? r.id : undefined}
      klar={arKlar(r)}
      bockTitel={r.titel}
      onKlar={() => markeraKlar(r.id)}
      onAngra={() => angra(r.id)}
    />
  );

  return (
    <div ref={rotRef} className="flex flex-col gap-4 lg:gap-5">
      {/* ---------- 1. Bandet ---------- */}
      <section
        aria-label="Sammanfattning"
        className="hero-med-bild hero-tat relative flex flex-col gap-4 overflow-hidden rounded-xl bg-one-djup px-5 py-5 text-white shadow-sm print:hidden md:px-6"
      >
        <HeroBild fil="bess-rader-skymning.jpg" position="60% 45%" />
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          {portfolj ? (
            <div className="flex min-w-0 max-w-[560px] flex-col gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">Alla projekt</span>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {state.projekt.map((pr) => {
                  const { ton, text } = tidsdom(state, pr.id, nu);
                  return (
                    <li key={pr.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <button type="button" className={lankKlass} onClick={() => { setValtProjekt(pr.id); setLage("projekt"); }}>
                        {pr.nr ? `${pr.nr} ` : ""}{pr.namn}
                      </button>
                      <StatusBadge ton={ton} label={text} />
                    </li>
                  );
                })}
              </ul>
              <p className="m-0 text-[13px] text-white/70">Välj ett projekt för att se och ändra dess rader.</p>
            </div>
          ) : (
          <div className="flex min-w-0 max-w-[560px] flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-white/80">Blir vi klara i tid</span>
              <StatusBadge ton={dom.ton} label={dom.text} />
            </span>
            {p ? (
              <p className="m-0 text-[19px] font-semibold leading-snug text-white">
                {p.nr ? `${p.nr} ` : ""}
                {p.namn}
              </p>
            ) : null}
            <p className="m-0 text-[14px] text-white/80">{domMening}</p>
          </div>
          )}

          <div className="flex gap-8">
            {portfolj ? null : <Bandtal etikett="Slutbesiktning" varde={k?.slutPrognos ? datumKort(k.slutPrognos) : "—"} detalj={motPlan} />}
            <Bandtal etikett="Att göra" varde={attGora} detalj={attGora === 1 ? "sak kräver din åtgärd" : "saker kräver din åtgärd"} />
          </div>
        </div>

        {!portfolj && sent && kritiska.length ? (
          <p className="m-0 border-0 border-t border-solid border-white/15 pt-3 text-[13px] text-white">
            <span className="text-white/70">Moment som styr: </span>
            {kritiska.map((f, i) => (
              <span key={f.nr}>
                {i ? <span aria-hidden="true" className="text-white/50"> · </span> : null}
                <button type="button" className={lankKlass} onClick={() => { setValtProjekt(p.id); oppnaPost("epc", `fas-${f.nr}`); }}>
                  {f.nr} {f.kort}
                </button>
              </span>
            ))}
          </p>
        ) : null}

        <nav aria-label="Genvägar" className="flex flex-wrap gap-x-5 gap-y-1">
          <button type="button" className={lankKlass} onClick={() => visa("tidplan")}>Tidplan</button>
          <button type="button" className={lankKlass} onClick={() => visa("punkter")}>Öppna punkter</button>
          <button type="button" className={lankKlass} onClick={() => visa("ata")}>ÄTA</button>
          {harSite ? <button type="button" className={lankKlass} onClick={() => visa("site")}>Siten i 3D</button> : null}
        </nav>
      </section>

      {/* ---------- Vad kostar det — samma prognos som Ekonomi ---------- */}
      {!portfolj && p ? <Ekonomirad pid={p.id} /> : null}

      {/* ---------- Dagens rutin ur metoden (§ 3.2) ---------- */}
      <Veckorutin />

      {/* ---------- 2. Att göra ---------- */}
      <section
        aria-labelledby="idag-attgora"
        className="flex min-w-0 flex-col gap-5 rounded-xl border border-solid border-hairline bg-surface p-4 shadow-sm md:p-6"
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 id="idag-attgora" className="m-0 font-head text-base font-bold text-ink">Att göra</h3>
          <span className="text-[13px] font-semibold text-ink-soft">
            {portfolj ? "alla projekt" : `${p?.nr ? `${p.nr} ` : ""}${p?.namn || ""}`}
          </span>
        </div>

        {p ? <SnabbRad ref={snabbRef} pid={p.id} projektNamn={portfolj ? `${p.nr ? `${p.nr} ` : ""}${p.namn}` : ""} /> : null}

        {!bradskande && !narmast && !nyssKlara.size ? (
          <p className="m-0 flex items-center gap-2 text-[14px] text-ink">
            <CircleCheck size={18} strokeWidth={2.2} aria-hidden="true" className="shrink-0 text-ok-ink" />
            Inget brådskande och inget med datum den närmaste veckan.
          </p>
        ) : null}

        <Del id="idag-bradskande" rubrik="Brådskande" ton="larm" antal={bradskande} synliga={bradskande + klara(l.forfallet)}>
          {l.frister.map((f) => (
            <Arbetsrad
              key={f.id}
              nar={f.timmar === null ? "—" : f.niva === "forfallen" ? `${Math.floor(f.timmar / 24)} d sen` : `${Math.max(0, 24 - f.timmar)} h kvar`}
              markering={f.niva === "forfallen" ? "larm" : "varning"}
              titel={f.titel}
              undertext={`${f.typ} · ${f.text}`}
              pid={f.pid}
              onOppna={() => oppnaFrist(f)}
            />
          ))}
          {l.forfallet.map(agendaRad)}
          {l.utanDatum.length ? (
            <Arbetsrad
              nar="Datum?"
              markering="larm"
              titel={`${l.utanDatum.length} ÄTA saknar händelsedatum`}
              undertext={`24-timmarsfristen kan inte räknas: ${l.utanDatum.slice(0, 5).map((u) => u.nr).join(", ")}${l.utanDatum.length > 5 ? " m.fl." : ""}`}
              onOppna={() => visa("ata")}
            />
          ) : null}
        </Del>

        <Del id="idag-idag" rubrik="Idag" ton="varning" antal={l.idag.length - klara(l.idag)} synliga={l.idag.length}>
          {l.idag.map(agendaRad)}
        </Del>

        <Del id="idag-veckan" rubrik="Denna vecka" antal={l.veckan.length - klara(l.veckan)} synliga={l.veckan.length}>
          {l.veckan.map(agendaRad)}
        </Del>

        {utforareIListan.length ? (
          <div
            className="flex flex-wrap items-center gap-2 border-0 border-t border-solid border-hairline pt-4 text-[13px]"
            role="group"
            aria-label="Skriv ut arbetslista"
          >
            <Printer size={15} strokeWidth={2} aria-hidden="true" className="text-ink-soft" />
            <span className="text-ink-soft">Papper till laget:</span>
            {utforareIListan.map((n) => (
              <button
                key={n}
                type="button"
                className="btn sec mini"
                aria-label={`Skriv ut arbetslista – ${n}`}
                onClick={() => snabb.arbetslista(p.id, { utforare: n })}
              >
                {n}
              </button>
            ))}
          </div>
        ) : null}

        {/* Kortkommandon — bara där det finns ett tangentbord att tala om. */}
        <p className="m-0 hidden flex-wrap items-center gap-x-4 gap-y-2 border-0 border-t border-solid border-hairline pt-4 text-[12px] text-ink-faint md:flex print:hidden">
          <span className="flex items-center gap-1"><Tangent>j</Tangent><Tangent>k</Tangent> flytta</span>
          <span className="flex items-center gap-1"><Tangent>Enter</Tangent> öppna</span>
          <span className="flex items-center gap-1"><Tangent>x</Tangent> klar / ångra</span>
          <span className="flex items-center gap-1"><Tangent>n</Tangent> ny punkt</span>
          {!portfolj ? <span className="flex items-center gap-1"><Tangent>p</Tangent> skriv ut arbetslista</span> : null}
        </p>
      </section>

      {/* ---------- 3. Längre fram, infällt ---------- */}
      <details
        id="idag-kommande"
        className="group rounded-xl border border-solid border-hairline bg-surface shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-[14px] font-semibold text-ink md:px-6 [&::-webkit-details-marker]:hidden">
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-ink-soft transition-transform group-open:rotate-90" />
          Längre fram
          <span className="font-semibold tabular-nums text-ink-faint">{l.kommande.length}</span>
          <span className="ml-auto text-[12.5px] font-normal text-ink-soft">inom {horisont} dagar</span>
        </summary>
        <section aria-label={`Längre fram — inom ${horisont} dagar`} className="flex flex-col gap-3 px-4 pb-4 md:px-6 md:pb-6">
          <Vyvaljare etikett="Horisont" varde={horisont} onValj={setHorisont} alternativ={HORISONTER} />
          {l.kommande.length ? (
            <ul className="m-0 list-none p-0">{l.kommande.map(agendaRad)}</ul>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">Inget mer med datum inom {horisont} dagar.</p>
          )}
        </section>
      </details>

      {panelId ? <PunktPanel key={panelId} id={panelId} onStang={() => setPanelId(null)} onOppnaRegister={oppnaPunktRegister} /> : null}
    </div>
  );
}