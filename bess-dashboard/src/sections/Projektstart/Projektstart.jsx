import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, CheckList, Meter, Overline, StatusBadge } from "../../components/ds/index.js";
import { PdfExporter } from "../../components/print/PdfExporter.jsx";
import { laddaNerPdf } from "../../components/print/laddaNerPdf.jsx";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { idag } from "../../lib/datum.js";
import { HeroBild, Kraftkurva } from "../../components/oversikt/Hero.jsx";
import { TON_KLASS } from "../../lib/status.js";
import { RiskDonut } from "./RiskDonut.jsx";
import { Styrtriangel } from "./Styrtriangel.jsx";
import { FasIndikator } from "./FasIndikator.jsx";
import { FasKrav } from "./FasKrav.jsx";
import { FasNav } from "./FasNav.jsx";
import { EJ_VUNNET_ORSAKER, FAS_ANTAL, FAS_MODELL, faseInfo, statusEtikett } from "../../data/projektfaser.ts";
import { aktuellFas, arEjVunnetUtkast, faltSynligt, fasKrav, fasLage, godkandaFaser, pdfKvar, rapportFas, stegLast } from "../../lib/projektfas.js";
import { KATALOG_RUBRIK, STEG } from "../../data/projektstartSteg.js";
import {
  SISTA_STEG,
  synligaSteg,
  UTKAST_NYCKEL,
  arAvbockad,
  stegPunkter,
  lasUtkast,
  luckor,
  nyTabellrad,
  projektFranUtkast,
  kortAndringar,
  historikRad,
  medHistorik,
  milstolparUtanDatum,
  nyaRaderForProjekt,
  projektstartDokument,
  projektstartPost,
  utkastAndrat,
  utkastFranProjekt,
  utkastFranPost,
  projektstartFel,
  riskNivaForVarde,
  riskvardeForRad,
  tomtUtkast,
} from "../../lib/projektstart.js";

/* Fliken Projektstart — ONE-P-guiden. Guidens sidor är grupperade i åtta faser
   (se data/projektfaser.ts). Projektet startar i fas 1 och nästa fas låses upp
   först när allt obligatoriskt i den förra är godkänt (lib/projektfas.js).
   Utkastet bor i webbläsaren tills man trycker Skapa projekt på sista sidan. Då skapas
   projektet med de riskrader och milstolpar man skrev in, i den fas det har nått.
   Ekonomivärden (kontraktssumma, betalplan) skrivs inte in här, de sätts i den
   vanliga ekonomiflödet. */

function laddaUtkast() {
  try {
    return lasUtkast(window.localStorage.getItem(UTKAST_NYCKEL));
  } catch {
    return tomtUtkast();
  }
}

/** Alternativ i en select är strängar eller [värde, etikett]-par. */
const altPar = (a) => (Array.isArray(a) ? a : [a, a]);

function Faltruta({ f, varde, onChange }) {
  const id = `ps-${f.id}`;
  const bred = f.bred ? "md:col-span-2" : "";
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${bred}`}>
      <label htmlFor={id}>
        <Overline as="span">{f.etikett}{f.obligatoriskt ? <span aria-hidden="true"> *</span> : null}</Overline>
      </label>
      {f.typ === "textarea" ? (
        <textarea id={id} rows={3} value={varde} aria-required={f.obligatoriskt || undefined} onChange={(e) => onChange(e.target.value)} />
      ) : f.typ === "select" ? (
        <select id={id} value={varde} aria-required={f.obligatoriskt || undefined} onChange={(e) => onChange(e.target.value)}>
          {["beslut", "niva", "offra", "orsakEjVunnet", "ersattningsform"].includes(f.id) ? <option value="">Välj …</option> : null}
          {f.alternativ.map(altPar).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} type={f.typ} value={varde} placeholder={f.placeholder} aria-required={f.obligatoriskt || undefined} onChange={(e) => onChange(e.target.value)} />
      )}
      {f.tips ? <span className="text-xs text-ink-soft">{f.tips}</span> : null}
    </div>
  );
}

const LJUSNAMN = { gron: ["ok", "Grön", "Enligt plan"], gul: ["warn", "Gul", "Avvikelse som hanteras inom projektet"], rod: ["bad", "Röd", "Allvarlig avvikelse, kräver hjälp eller beslut"] };

/** Projektledarens trafikljus för en fas, med en kort kommentar. Samma val igen rensar det. */
function Trafikljus({ nr, varde, onChange }) {
  return (
    <div className="flex w-full flex-col gap-2 pl-10">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Trafikljus för fas ${nr}`}>
        <span className="text-[12px] text-ink-soft">Trafikljus</span>
        {Object.entries(LJUSNAMN).map(([id, [ton, namn, hjalp]]) => (
          <button
            key={id}
            type="button"
            title={hjalp}
            aria-pressed={varde?.ljus === id}
            onClick={() => onChange(nr, id)}
            className={`inline-flex items-center gap-1.5 rounded-full border border-solid px-3 py-1 text-[12px] font-bold transition-colors duration-150 ${varde?.ljus === id ? `${TON_KLASS[ton]} border-current` : "border-hairline-stark bg-transparent text-ink-soft hover:bg-sunken"}`}
          >
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />
            {namn}
          </button>
        ))}
      </div>
      {varde ? (
        <input
          type="text"
          maxLength={300}
          value={varde.kommentar}
          placeholder={varde.ljus === "rod" ? "Vad behövs: hjälp eller beslut?" : "Kommentar (valfri)"}
          aria-label={`Kommentar till trafikljuset för fas ${nr}`}
          onChange={(e) => onChange(nr, varde.ljus, e.target.value)}
        />
      ) : null}
    </div>
  );
}

const FASSTATUS = { klar: ["ok", "Godkänd"], upplast: ["info", "Upplåst"], aktuell: ["warn", "Pågår"], last: ["neutral", "Låst"] };

const RISKTON = { lag: ["ok", "låg"], medel: ["warn", "medel"], hog: ["bad", "hög"] };

/** Riskvärdet som märke. Pulsar till när värdet ändras, inte vid första visning. */
function RiskBadge({ value }) {
  const [forra, setForra] = useState(value);
  const [andrat, setAndrat] = useState(false);
  if (value !== forra) {
    setForra(value);
    setAndrat(true);
  }
  const [ton, text] = RISKTON[riskNivaForVarde(value)];
  return (
    <span
      key={value}
      title={`Riskvärde ${value}, ${text}`}
      className={`inline-flex h-6 min-w-[34px] items-center justify-center rounded-md px-1.5 text-[13px] font-bold tabular-nums transition-colors duration-300 ${TON_KLASS[ton]} ${andrat ? "ps-puls" : ""}`}
    >
      {value}
      <span className="sr-only"> riskvärde, {text}</span>
    </span>
  );
}

function Tabell({ tabell, rader, onChange, standardRad }) {
  const arRisker = tabell.id === "risker";
  const [nyId, setNyId] = useState(null);
  const lagg = () => {
    const ny = nyTabellrad(tabell, standardRad);
    setNyId(ny.id);
    onChange([...rader, ny]);
  };
  /* Den nya raden får fokus i första fältet, så att man kan skriva direkt. */
  useEffect(() => {
    if (nyId) document.querySelector(`[data-rad-id="${nyId}"] input`)?.focus({ preventScroll: false });
  }, [nyId]);
  const uppdatera = (rid, kol, v) => onChange(rader.map((r) => (r.id === rid ? { ...r, [kol]: v } : r)));
  return (
    <Card id={`ps-tabell-${tabell.id}`} title={tabell.titel} action={<button type="button" className="btn sec mini" onClick={lagg}><Plus size={14} aria-hidden="true" /> Lägg till rad</button>}>
      {tabell.anmarkning ? <p className="m-0 text-[12.5px] text-ink-soft">{tabell.anmarkning}</p> : null}
      {tabell.obligatorisk ? <p className="m-0 text-[12.5px] text-ink-soft">Obligatoriskt för fasen: minst en rad där {tabell.obligatorisk.map((id) => tabell.kolumner.find((k) => k.id === id)?.etikett.toLowerCase()).join(" och ")} är ifyllt.</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-[13px]">
          <thead>
            <tr>
              {tabell.kolumner.map((k) => (
                <Fragment key={k.id}>
                  <th scope="col" className="px-1 pb-1 text-left"><Overline as="span">{k.etikett}</Overline></th>
                  {arRisker && k.id === "konsekvens" ? <th scope="col" className="px-1 pb-1 text-left"><Overline as="span">Värde</Overline></th> : null}
                </Fragment>
              ))}
              <th scope="col" className="w-10"><span className="sr-only">Ta bort</span></th>
            </tr>
          </thead>
          <tbody>
            {rader.map((r, i) => (
              <tr key={r.id} data-rad-id={r.id} className={r.id === nyId ? "ps-rad-in" : undefined}>
                {tabell.kolumner.map((k) => {
                  const namn = `${tabell.titel}, rad ${i + 1}: ${k.etikett}`;
                  return (
                    <Fragment key={k.id}>
                    <td className={`p-1 align-top ${k.bredd === "wide" ? "min-w-[220px]" : k.bredd === "mid" ? "min-w-[150px]" : "min-w-[110px]"}`}>
                      {k.typ === "select" ? (
                        <select aria-label={namn} value={r[k.id]} onChange={(e) => uppdatera(r.id, k.id, e.target.value)}>
                          {k.alternativ.map(altPar).map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                        </select>
                      ) : (
                        <input aria-label={namn} type={k.typ} value={r[k.id]} onChange={(e) => uppdatera(r.id, k.id, e.target.value)} />
                      )}
                    </td>
                    {arRisker && k.id === "konsekvens" ? (
                      <td className="p-1 align-middle">
                        <RiskBadge value={riskvardeForRad(r)} />
                      </td>
                    ) : null}
                    </Fragment>
                  );
                })}
                <td className="p-1 align-top">
                  <button type="button" className="btn sec mini" aria-label={`Ta bort rad ${i + 1} i ${tabell.titel}`} onClick={() => onChange(rader.filter((x) => x.id !== r.id))}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Kontrollpunkter({ steg, utkast, onToggle }) {
  const [barOppna, setBarOppna] = useState(false);
  const grupper = (steg.katalog || []).flatMap((bucket) => {
    const punkter = stegPunkter({ katalog: [bucket], grupper: steg.grupper });
    const namn = [...new Set(punkter.map((p) => p.grupp))];
    return namn.map((g) => ({ rubrik: steg.katalog.length > 1 ? `${KATALOG_RUBRIK[bucket]}: ${g}` : g, bucket, punkter: punkter.filter((p) => p.grupp === g) }));
  });
  const alla = grupper.flatMap((g) => g.punkter);
  const oppna = alla.filter((p) => !arAvbockad(utkast, p));
  const kritiskaOppna = oppna.filter((p) => p.kritisk).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-ink-soft" aria-live="polite">
          {oppna.length ? `${oppna.length} öppna${kritiskaOppna ? `, varav ${kritiskaOppna} kritiska` : ""}` : "Alla kontrollpunkter i steget är bockade"}
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" className="m-0 h-[18px] w-[18px] cursor-pointer accent-one-bla" checked={barOppna} onChange={(e) => setBarOppna(e.target.checked)} />
          Visa bara öppna
        </label>
      </div>
      {grupper.map((g) => {
        const klara = g.punkter.filter((p) => arAvbockad(utkast, p)).length;
        const synliga = barOppna ? g.punkter.filter((p) => !arAvbockad(utkast, p)) : g.punkter;
        const allaKlara = klara === g.punkter.length;
        if (barOppna && !synliga.length) return null;
        return (
          <Card
            key={g.rubrik}
            id={`ps-kp-${g.bucket}-${g.rubrik.replace(/[^\p{L}\p{N}]+/gu, "-")}`}
            title={g.rubrik}
            badge={<span className="text-xs text-ink-soft tabular-nums">{klara} av {g.punkter.length}</span>}
            action={
              <button
                type="button"
                className="btn sec mini"
                aria-label={`${allaKlara ? "Rensa" : "Bocka av alla i"} ${g.rubrik}`}
                onClick={() => g.punkter.forEach((p) => onToggle(g.bucket, p.id, !allaKlara))}
              >
                {allaKlara ? "Rensa alla" : "Bocka alla"}
              </button>
            }
          >
            <Meter value={klara} max={g.punkter.length} size="sm" />
            <CheckList
              label={g.rubrik}
              items={synliga.map((p) => ({ id: p.id, label: p.kritisk ? `${p.text} (kritisk)` : p.text, hint: p.tips, checked: arAvbockad(utkast, p) }))}
              onChange={(pid, v) => onToggle(g.bucket, pid, v)}
            />
          </Card>
        );
      })}
    </div>
  );
}

function Sammanfattning({ utkast, faser, onLjus, fel, kanSkapa, skapar, redigerar, andrat, ejSparad, pdfDokument, sparr, onSkapa, onSpara, onGaTill }) {
  const nuFas = aktuellFas(utkast);
  const l = luckor(utkast, nuFas);
  const v = utkast.v;
  const risker = (utkast.rader.risker || []).filter((r) => r.titel?.trim()).length;
  const milstolpar = (utkast.rader.milstolpar || []).filter((m) => m.namn?.trim() && m.datum).length;
  const utanDatum = milstolparUtanDatum(utkast);
  const rader = [
    ["Projekt", `${v.nr ? v.nr + " " : ""}${v.namn || "Namn saknas"}`],
    ["Fas", `${nuFas} av ${FAS_ANTAL} · ${faseInfo(nuFas).kort}`],
    ["Projektstatus", statusEtikett(faseInfo(nuFas).status)],
    ["Beställare", v.bestallare || "—"],
    ["Plats", v.plats || "—"],
    ["Start", v.startdatum || "—"],
    ["Färdig", v.fardigdatum || "—"],
    ["Kontraktsform", v.kontraktsform || "—"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Card id="ps-sammanfattning" title={redigerar ? "Sparad projektstart" : "Det här skapas"}>
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
          {rader.map(([k, val]) => (
            <div key={k} className="min-w-0">
              <dt><Overline as="span">{k}</Overline></dt>
              <dd className="m-0 mt-1 truncate border-0 border-b border-solid border-hairline pb-1 text-[14px] text-ink">{val}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 text-[13.5px] text-ink">
          {redigerar
            ? "Ändringarna sparas i projektstarten och projektkortet, och en rad läggs i uppdateringsloggen. Nya risker och milstolpar läggs till i projektet. Befintliga ändrar du på sina egna sidor."
            : `Projektet skapas med ${risker} riskrader och ${milstolpar} milstolpar. Mallarna för handlingsplan, APD och slutdokumentation kommer med automatiskt.`}
          {utanDatum ? ` ${utanDatum} ${utanDatum === 1 ? "milstolpe saknar" : "milstolpar saknar"} datum och tas inte med förrän datumet är ifyllt.` : ""}
        </p>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span>Kontrollpunkter avbockade</span>
            <span className="tabular-nums text-ink-soft">{l.klara} av {l.totalt}</span>
          </div>
          <Meter value={l.klara} max={l.totalt} label="Avbockade kontrollpunkter" />
        </div>
      </Card>

      <Card id="ps-faser" title="Faserna" subtitle="Status och obligatoriska punkter per fas. Nästa fas låses upp när allt obligatoriskt i den förra är godkänt. Fas 2 kräver dessutom vunnet anbud.">
        <ul className="m-0 flex list-none flex-col p-0">
          {faser.map((f) => {
            const forst = STEG.find((s) => s.fas === f.nr);
            const last = f.status === "last";
            const [ton, text] = FASSTATUS[f.status];
            return (
              <li key={f.nr} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-0 border-t border-solid border-hairline py-3 first:border-t-0">
                <span className="w-6 shrink-0 text-right font-head text-[15px] text-ink-soft">{f.nr}</span>
                <span className="min-w-[10rem] flex-1">
                  <b className="block text-[14px] text-ink">{f.titel}</b>
                  <span className="mt-1 flex items-center gap-2 text-[12px] text-ink-soft">
                    <Meter value={f.klara} max={f.totalt} size="sm" label={`Fas ${f.nr}: ${f.klara} av ${f.totalt} obligatoriska punkter`} className="w-28 [&>span]:transition-[width] [&>span]:duration-500" />
                    <span className="tabular-nums">{f.klara} av {f.totalt} obligatoriska</span>
                  </span>
                </span>
                <StatusBadge ton={ton} label={text} />
                <button type="button" className="btn sec mini" disabled={last} onClick={() => onGaTill(forst.id)}>Öppna</button>
                {last ? null : <Trafikljus nr={f.nr} varde={utkast.trafikljus?.[f.nr]} onChange={onLjus} />}
              </li>
            );
          })}
        </ul>
      </Card>

      {l.kritiskaOppna.length ? (
        <Callout ton="info">
          <b className="block">{l.kritiskaOppna.length} av {l.kritiskaTotalt} kritiska punkter är inte bockade</b>
          {redigerar
            ? "De syns i PDF:en så att ledningen ser vad som återstår, och de måste vara bockade för att låsa upp nästa fas."
            : "Det stoppar inte skapandet. Projektet startar i den fas det har nått, och nästa fas låses upp när punkterna är bockade."}
        </Callout>
      ) : null}

      {sparr.length ? (
        <Callout ton="info">
          <b className="block">PDF:en är ett utkast tills fas {nuFas} ({faseInfo(nuFas).kort}) är godkänd</b>
          Du kan ladda ned den redan nu för att visa ledningen. Den visar upplåsta faser och märks Utkast. För att godkänna fas {nuFas} återstår:
          <div className="mt-2 flex flex-wrap gap-2">
            {sparr.map((x) => (
              <button key={`${x.stegId}-${x.id}`} type="button" className="btn sec mini" onClick={() => onGaTill(x.stegId)}>{x.etikett}</button>
            ))}
          </div>
        </Callout>
      ) : null}

      {fel ? <Callout ton="bad"><b className="block">{redigerar ? "Projektstarten kan inte sparas ännu" : "Projektet kan inte skapas ännu"}</b>{fel}</Callout> : null}

      <div className="flex flex-wrap items-center gap-3">
        {redigerar ? (
          <button type="button" className="btn" disabled={!kanSkapa || (!andrat && !ejSparad)} onClick={onSpara}>{ejSparad ? "Spara projektstart" : "Spara ändringar"}</button>
        ) : (
          <button type="button" className="btn" disabled={!kanSkapa || skapar} aria-busy={skapar} onClick={onSkapa}>{skapar ? "Skapar …" : "Skapa projekt"}</button>
        )}
        <PdfExporter
          dokument={pdfDokument}
          typ="projektstart"
          label="Ladda ned PDF"
          className="btn sec"
          disabled={!v.namn?.trim()}
          title={!v.namn?.trim() ? "Ange projektnamnet först." : sparr.length ? "Utkast: aktuell fas är inte godkänd än." : undefined}
        />
      </div>
      <p className="m-0 text-[12.5px] text-ink-soft">{redigerar ? `PDF:en omfattar de upplåsta faserna (fas 1${rapportFas(utkast) > 1 ? `–${rapportFas(utkast)}` : ""}) och innehåller det som står i guiden just nu, även osparade ändringar. Den märks Utkast tills aktuell fas är godkänd. Spara först så kommer dagens rad med i uppdateringsloggen.` : "PDF:en omfattar de upplåsta faserna och går att ladda ned när som helst, till exempel för genomgång med ledningen innan anbudet lämnas. Den märks Utkast tills aktuell fas är godkänd. När anbudsunderlaget är genomgånget kan det visas för ledningen även medan ni inväntar tilldelning."}</p>
    </div>
  );
}

export function Projektstart() {
  /* Validering av nytt projekt (nummer, namn) gäller hela portföljen, också förlorade anbud. */
  const { state, heltState, dispatch, laggTill, sattLista, uppd } = usePortfolj();
  const { visa, visaToast, setValtProjekt, bekrafta, projektstartMal, rensaProjektstartMal } = useUi();
  const [utkast, setUtkast] = useState(laddaUtkast);
  const [skapar, setSkapar] = useState(false);
  /* "ny" är den pågående nya projektstarten (utkast i webbläsaren). Ett projekt-id
     öppnar den sparade projektstarten för det projektet, för ändringar och ny PDF. */
  const [lage, setLage] = useState("ny");
  const redigerar = lage !== "ny";
  const sparadeFor = (pid) => (state.projektstart || []).find((x) => x.projektId === pid);
  const post = redigerar ? sparadeFor(lage) : null;
  const projektet = redigerar ? state.projekt.find((p) => p.id === lage) : null;
  /* Det som senast sparades (eller första ifyllningen), för Ångra och för att se om något ändrats. */
  const [grund, setGrund] = useState(null);
  const andrat = !!grund && utkastAndrat(utkast, grund);

  useEffect(() => {
    if (redigerar) return;
    try {
      window.localStorage.setItem(UTKAST_NYCKEL, JSON.stringify(utkast));
    } catch {
      /* Utkastet fungerar även utan lagring, men sparas då inte mellan besök. */
    }
  }, [utkast, redigerar]);

  /* Projektets fas räknas ur utkastet. Ett steg i en låst fas kan inte vara det som visas,
     till exempel efter att man har avbockat något i en tidigare fas. Då visas fasens första sida. */
  const nuFas = aktuellFas(utkast);
  const ejVunnet = arEjVunnetUtkast(utkast);
  const stegLista = useMemo(() => synligaSteg(utkast), [utkast]);
  /* Ett förlorat anbud har bara fas 1: fas 2–8 döljs. */
  const faser = useMemo(() => fasLage(utkast).filter((f) => !ejVunnet || f.nr === 1), [utkast, ejVunnet]);
  const krav = useMemo(() => fasKrav(utkast, nuFas), [utkast, nuFas]);
  const sparr = useMemo(() => pdfKvar(utkast), [utkast]);
  const sparrText = !utkast.v.namn?.trim() ? "Ange projektnamnet först." : sparr.length ? "Utkast: aktuell fas är inte godkänd än." : undefined;
  const sparadIndex = Math.max(0, stegLista.findIndex((s) => s.id === utkast.steg));
  const index = stegLast(utkast, stegLista[sparadIndex]) ? stegLista.findIndex((s) => s.fas === nuFas) : sparadIndex;
  const steg = stegLista[index];
  const sista = steg.id === SISTA_STEG;
  const nasta = stegLista[index + 1];

  const forhandsrad = useMemo(() => projektFranUtkast(utkast, "forhandsgranskning").projekt, [utkast]);
  const utanDetta = redigerar ? { ...heltState, projekt: heltState.projekt.filter((p) => p.id !== lage) } : heltState;
  /* Ett förlorat anbud kräver en orsak innan det kan skapas eller sparas. */
  const orsakFel = ejVunnet && !krav.klar ? "Välj orsak till ej vunnet anbud." : "";
  const fel = sista ? projektstartFel(utanDetta, forhandsrad) || orsakFel : "";

  /* När en fas godkänns låses nästa upp och projektets status följer med. Meddelandet visas
     bara när fasen ändras av arbetet i guiden, inte när man byter projekt. Ett befintligt projekt
     flyttas direkt till den nya fasen (SATT_PROJEKTFAS), så att projektkort, tidplan och milstolpar
     visar samma fas utan att guiden först sparas. Fasen flyttas bara framåt här; backar guiden
     (en bock tas bort) gäller det först när projektstarten sparas. */
  const forraFas = useRef({ lage, fas: nuFas });
  useEffect(() => {
    const f = forraFas.current;
    if (f.lage === lage && nuFas > f.fas) {
      if (projektet && !ejVunnet && projektet.fas !== nuFas) dispatch({ type: "SATT_PROJEKTFAS", id: projektet.id, fas: nuFas });
      visaToast(`Fas ${nuFas} (${faseInfo(nuFas).kort}) är upplåst. Projektets status är nu ${statusEtikett(faseInfo(nuFas).status)}.`);
    }
    forraFas.current = { lage, fas: nuFas };
    // projektet och ejVunnet läses bara när fasen ändras; de ska inte i sig utlösa effekten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lage, nuFas, visaToast]);

  /* Nytt steg ska börja överst. Annars står man kvar längst ned efter en lång checklista. */
  const forstaVisning = useRef(true);
  useEffect(() => {
    if (forstaVisning.current) {
      forstaVisning.current = false;
      return;
    }
    const el = document.getElementById("ps-steg");
    if (!el) return;
    /* Toppraden ligger fast över innehållet, så vi stannar en bit ovanför kortet. */
    const topp = document.querySelector("header")?.getBoundingClientRect().height || 0;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - topp - 16) });
  }, [utkast.steg]);

  const pdfDokument = projektstartDokument(utkast, { datum: idag(), skapadAv: hamtaNamn() || "", historik: post?.historik || [], sparad: post?.uppdaterad?.slice(0, 10) || "" });

  const sattFalt = (id, v) => setUtkast((u) => ({ ...u, v: { ...u.v, [id]: v, ...(id === "anbudsutfall" ? { rapporteringsskede: "" } : {}) } }));
  const sattRader = (id, rader) => setUtkast((u) => ({ ...u, rader: { ...u.rader, [id]: rader } }));
  /** Sätter eller rensar projektledarens trafikljus för en fas. Samma ljus igen rensar det. */
  const sattLjus = (nr, ljus, kommentar) =>
    setUtkast((u) => {
      const nu = { ...(u.trafikljus || {}) };
      if (!ljus || (ljus === nu[nr]?.ljus && kommentar === undefined)) delete nu[nr];
      else nu[nr] = { ljus, kommentar: kommentar ?? nu[nr]?.kommentar ?? "" };
      return { ...u, trafikljus: nu };
    });
  const kryssa = (bucket, pid, v) => setUtkast((u) => ({ ...u, kryss: { ...u.kryss, [bucket]: { ...u.kryss[bucket], [pid]: v } } }));
  /* Sidor i en låst fas går inte att öppna. */
  const gaTill = (id) =>
    setUtkast((u) => {
      const mal = stegLista.find((x) => x.id === id);
      if (!mal || stegLast(u, mal)) return u;
      return { ...u, steg: id, besokta: u.besokta.includes(u.steg) ? u.besokta : [...u.besokta, u.steg] };
    });

  /** Öppnar guiden för ett projekt (eller en ny projektstart när `valt` är null). */
  const oppnaLage = (valt) => {
    const sparad = valt ? sparadeFor(valt.id) : null;
    const oppnat = !valt ? laddaUtkast() : sparad ? utkastFranPost(sparad, valt) : utkastFranProjekt(valt, state);
    setLage(valt ? valt.id : "ny");
    setUtkast(oppnat);
    setGrund(valt ? oppnat : null);
  };

  const bytLage = async (nytt) => {
    if (nytt === lage) return;
    if (andrat && !(await bekrafta("Dina ändringar i den sparade projektstarten är inte sparade och försvinner.", { titel: "Osparade ändringar", ok: "Byt ändå", fara: true }))) return;
    oppnaLage(nytt === "ny" ? null : state.projekt.find((p) => p.id === nytt));
  };

  /* Ett projektkort kan be om att få sitt projekts projektstart öppnad direkt. */
  useEffect(() => {
    if (!projektstartMal) return;
    const valt = state.projekt.find((p) => p.id === projektstartMal);
    if (valt) oppnaLage(valt);
    rensaProjektstartMal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projektstartMal]);

  const sparaAndringar = () => {
    if (!projektet) return;
    const f = projektstartFel(utanDetta, forhandsrad) || orsakFel;
    if (f) {
      visaToast(f, "warn");
      return;
    }
    const nu = new Date().toISOString();
    const rad = historikRad(utkast, { datum: idag(), av: hamtaNamn() || "" });
    if (post) sattLista("projektstart", state.projektstart.map((x) => (x.id === post.id ? { ...x, utkast: { v: utkast.v, rader: utkast.rader, kryss: utkast.kryss, fasGolv: utkast.fasGolv, trafikljus: utkast.trafikljus || {}, fm: FAS_MODELL }, uppdaterad: nu, historik: medHistorik(x.historik, rad) } : x)));
    else laggTill("projektstart", projektstartPost(projektet.id, utkast, nu, [rad]));
    setGrund(utkast);
    for (const [falt, varde] of kortAndringar(utkast, projektet)) uppd("projekt", projektet.id, falt, varde);
    const nya = nyaRaderForProjekt(utkast, projektet.id, state);
    for (const r of nya.risker) laggTill("risker", r);
    for (const m of nya.milstolpar) laggTill("milstolpar", m);
    const tillagt = [nya.risker.length && `${nya.risker.length} ${nya.risker.length === 1 ? "risk" : "risker"}`, nya.milstolpar.length && `${nya.milstolpar.length} ${nya.milstolpar.length === 1 ? "milstolpe" : "milstolpar"}`].filter(Boolean);
    if (ejVunnet) {
      oppnaLage(null);
      visa("oversikt");
      visaToast("Projektstarten är sparad och anbudet är flyttat till arkivet som ej vunnet.");
      return;
    }
    visaToast(`Projektstarten är sparad och projektkortet uppdaterat.${tillagt.length ? ` ${tillagt.join(" och ")} lades till i projektet.` : ""}`);
  };

  const angra = () => grund && setUtkast({ ...grund, steg: utkast.steg });

  const borjaOm = async () => {
    const ja = await bekrafta("Allt du skrivit i guiden tas bort. Projekt som redan är skapade påverkas inte.", { titel: "Börja om", ok: "Börja om", fara: true });
    if (ja) setUtkast(tomtUtkast());
  };

  const skapa = async () => {
    const id = `projekt-${crypto.randomUUID()}`;
    const { projekt, risker, milstolpar } = projektFranUtkast(utkast, id);
    const f = projektstartFel(heltState, projekt) || orsakFel;
    if (f) {
      visaToast(f, "warn");
      return;
    }
    setSkapar(true);
    // PDF-underlaget byggs innan utkastet töms. Projektet skapas först, så att ett
    // PDF-fel aldrig hindrar det.
    const pdfUnderlag = projektstartDokument(utkast, { datum: idag(), skapadAv: hamtaNamn() || "" });
    dispatch({ type: "SKAPA_PROJEKT", rad: projekt });
    for (const r of risker) laggTill("risker", r);
    for (const m of milstolpar) laggTill("milstolpar", m);
    laggTill("projektstart", projektstartPost(id, utkast, undefined, [historikRad(utkast, { datum: idag(), av: hamtaNamn() || "" })]));
    /* PDF:en laddas ned automatiskt när fas 1 är godkänd. Ett utkast kan alltid laddas ned för hand. */
    const pdfKlar = godkandaFaser(utkast) >= 1 ? await laddaNerPdf(pdfUnderlag, "projektstart", visaToast) : null;
    try {
      window.localStorage.removeItem(UTKAST_NYCKEL);
    } catch {
      /* Inget att städa om lagringen är avstängd. */
    }
    setUtkast(tomtUtkast());
    setSkapar(false);
    /* Ett förlorat anbud ligger i arkivet och väljs inte som aktivt projekt. */
    if (ejVunnet) {
      visa("oversikt");
      visaToast(`Anbudet är flyttat till arkivet som ej vunnet (${(EJ_VUNNET_ORSAKER.find(([k]) => k === utkast.v.orsakEjVunnet) || [null, "orsak saknas"])[1]})${pdfKlar ? " och PDF:en är nedladdad" : ""}.`);
      return;
    }
    setValtProjekt(id);
    visa("metod");
    visaToast(`Projektet är skapat i fas ${aktuellFas(utkast)} (${faseInfo(aktuellFas(utkast)).kort})${pdfKlar === null ? ". PDF:en märks utkast tills fas 1 är godkänd, och går att ladda ned när du vill" : pdfKlar ? " och PDF:en är nedladdad" : ", men PDF:en kunde inte skapas"}. Kontrollera kontrakt, betalplan, priser och kontrollkrav före användning.`);
  };

  /* Alt + Skift + pil vänster/höger bläddrar mellan stegen utan att lämna tangentbordet. */
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return;
      const ny = e.key === "ArrowRight" ? stegLista[index + 1] : e.key === "ArrowLeft" ? stegLista[index - 1] : null;
      if (!ny) return;
      e.preventDefault();
      gaTill(ny.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <section aria-label="Projektstart" className="hero-med-bild relative overflow-hidden rounded-xl bg-one-djup px-4 py-4 text-white md:px-6 md:py-5">
        <HeroBild fil="hero-batterigata.jpg" video="hero-batterigata.mp4" position="80% 60%" />
        <Kraftkurva />
        <div className="relative flex max-w-[44rem] flex-col gap-3">
          <span aria-live="polite" className="text-[11px] font-bold uppercase tracking-wider opacity-80">ONE-P · {redigerar ? `${projektet?.nr || ""} ${projektet?.namn || ""} · ` : ""}Fas {nuFas} av {FAS_ANTAL} · Steg {index + 1} av {stegLista.length}</span>
          <h2 key={steg.id} className="ps-byt m-0 font-head text-[22px] leading-tight text-white">{steg.titel}</h2>
          <p className="m-0 text-[12.5px] opacity-90">Projektstatus: <b>{statusEtikett(faseInfo(nuFas).status)}</b> · {faseInfo(nuFas).titel}</p>
          <Meter value={index + 1} max={stegLista.length} label="Steg i guiden" ton="pagar" className="[&>span]:transition-[width] [&>span]:duration-500 [&>span]:ease-out" />
          <FasIndikator faser={faser} visadFas={steg.fas} />
        </div>
      </section>
      {!redigerar && !ejVunnet && !krav.klar ? (
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-soft" role="note">
          <span>Utkastet sparas automatiskt i den här webbläsaren. Du behöver inte fylla i allt nu: du kan skapa projektet redan på sista sidan och fylla i resten senare.</span>
          <button type="button" className="btn sec mini" onClick={() => gaTill(SISTA_STEG)}>Gå till Granska och skapa</button>
        </p>
      ) : null}
      {state.projekt.length ? (
        <Card
          id="ps-befintliga"
          title={redigerar ? `Du ändrar projektstarten för ${projektet?.nr ? projektet.nr + " " : ""}${projektet?.namn || ""}` : "Ändra ett befintligt projekt"}
          subtitle={
            redigerar
              ? "Ändringarna sparas när du trycker Spara på sista steget. PDF:en kan laddas ned där när som helst."
              : "Öppna projektstarten för ett projekt du redan har för att fylla i, ändra eller ta en ny PDF."
          }
        >
          <div className="flex flex-wrap gap-2" role="group" aria-label="Befintliga projekt">
            {redigerar ? (
              <button type="button" className="btn sec mini" onClick={() => bytLage("ny")}>
                <ChevronLeft size={14} aria-hidden="true" /> Ny projektstart
              </button>
            ) : null}
            {state.projekt.map((pr) => (
              <button
                key={pr.id}
                type="button"
                className={`btn mini ${pr.id === lage ? "" : "sec"}`}
                aria-pressed={pr.id === lage}
                onClick={() => bytLage(pr.id)}
              >
                {pr.nr ? `${pr.nr} ` : ""}{pr.namn}
                {sparadeFor(pr.id) ? "" : <span className="ml-1 opacity-70">· ej ifylld</span>}
              </button>
            ))}
          </div>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6">
      <nav aria-label="Stegen i projektstarten" className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
        <label className="flex flex-col gap-1 lg:hidden">
          <Overline as="span">Steg {index + 1} av {stegLista.length}</Overline>
          <select value={steg.id} onChange={(e) => gaTill(e.target.value)} aria-label="Välj steg">
            {stegLista.map((s, i) => {
              const last = stegLast(utkast, s);
              return <option key={s.id} value={s.id} disabled={last}>{i + 1}. {s.titel}{last ? " (låst)" : ""}</option>;
            })}
          </select>
        </label>
        <FasNav utkast={utkast} faser={faser} steg={stegLista} aktivtId={steg.id} onGaTill={gaTill} />
        <div className="flex flex-wrap gap-2">
          {sista ? null : (
            <PdfExporter dokument={pdfDokument} typ="projektstart" label="Ladda ned PDF" className="btn sec mini" disabled={!utkast.v.namn?.trim()} title={sparrText} />
          )}
          {redigerar ? (
            <button type="button" className="btn sec mini" disabled={!andrat} onClick={angra}>Ångra ändringar</button>
          ) : (
            <button type="button" className="btn sec mini" onClick={borjaOm}>Börja om</button>
          )}
        </div>
        {redigerar && post?.uppdaterad ? <span className="text-[12px] text-ink-soft">Senast sparad {post.uppdaterad.slice(0, 10)}</span> : null}
      </nav>

      <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
        {redigerar && !post ? (
          <Callout ton="info">
            <b className="block">Projektet har ingen sparad projektstart</b>
            Guiden är ifylld från projektkortet, riskregistret och milstolparna. Checklistor och direktiv är tomma. Gå igenom stegen och tryck Spara projektstart på sista steget.
          </Callout>
        ) : null}
        <FasKrav krav={krav} onGaTill={gaTill} ejVunnet={ejVunnet} />
        {nuFas === 1 && !ejVunnet ? <Callout ton="info"><b className="block">Beslutsunderlag till ledningen</b>Fas 1 har två delar: Anbud (projektkort, avropsacceptans, anbudsfrågor, kontrakt) och Planering (projektdirektiv, intressenter). Fyll i det ni vet och ladda ned PDF:en på sista steget. Ledningen tar ställning till om anbudet ska lämnas in. Fas 2 och dess kontroller kommer med först efter vunnet anbud och genomgången fas 1. {krav.klar ? <button type="button" className="btn sec mini mt-2" onClick={() => gaTill("avrop")}>Ange anbudsutfall</button> : null}</Callout> : null}
        <Card
          id="ps-steg"
          title={`${index + 1}. ${steg.titel}`}
          subtitle={steg.sammanfattning}
          badge={<StatusBadge label={steg.fas ? `Fas ${steg.fas} · ${faseInfo(steg.fas).kort}` : "Klart"} ton="neutral" />}
        >
          {steg.grund ? (
            <Callout ton="info">
              <b>Tre grundsanningar</b>
              {steg.grund.map((g) => <span key={g} className="block">{g}</span>)}
            </Callout>
          ) : null}
          {steg.falt ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {steg.falt.filter((f) => faltSynligt(f, utkast)).map((f) => <Faltruta key={f.id} f={f} varde={utkast.v[f.id] ?? ""} onChange={(v) => sattFalt(f.id, v)} />)}
            </div>
          ) : null}
        </Card>

        {steg.tabell ? <Tabell tabell={steg.tabell} rader={utkast.rader[steg.tabell.id] || []} onChange={(r) => sattRader(steg.tabell.id, r)} standardRad={steg.id === "risker" ? { fas: String(nuFas) } : undefined} /> : null}
        {steg.id === "direktiv" ? <Styrtriangel v={utkast.v} /> : null}
        {steg.id === "direktiv" ? <>
          <p className="m-0 text-[13px] text-ink-soft">Risker och tidplan nedan är samma uppgifter som används i senare faser. Ange även kända framtida risker redan i anbudet.</p>
          {["risker", "tidplan"].map((id) => { const t = STEG.find((x) => x.id === id).tabell; return <Tabell key={id} tabell={{ ...t, obligatorisk: undefined }} rader={utkast.rader[t.id] || []} onChange={(r) => sattRader(t.id, r)} standardRad={id === "risker" ? { fas: "1" } : undefined} />; })}
        </> : null}
        {steg.id === "risker" ? <RiskDonut rader={utkast.rader.risker || []} /> : null}
        {steg.katalog ? <Kontrollpunkter steg={steg} utkast={utkast} onToggle={kryssa} /> : null}
        {sista ? <Sammanfattning utkast={utkast} faser={faser} fel={fel} kanSkapa={!fel} skapar={skapar} redigerar={redigerar} andrat={andrat} ejSparad={redigerar && !post} pdfDokument={pdfDokument} sparr={sparr} onLjus={sattLjus} onSkapa={skapa} onSpara={sparaAndringar} onGaTill={gaTill} /> : null}

        <div className="flex items-center justify-between gap-3">
          <button type="button" className="btn sec group" disabled={index === 0} onClick={() => gaTill(stegLista[index - 1].id)}>
            <ChevronLeft size={16} aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-x-0.5" /> Föregående
          </button>
          <span className="text-[12px] tabular-nums text-ink-soft">{index + 1} / {stegLista.length}</span>
          {sista ? <span /> : (
            <button type="button" className="btn group" disabled={!nasta || stegLast(utkast, nasta)} title={nasta && stegLast(utkast, nasta) ? `Fas ${nasta.fas} låses upp när fas ${nuFas} är godkänd` : undefined} onClick={() => gaTill(nasta.id)}>
              Nästa <ChevronRight size={16} aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5" />
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

