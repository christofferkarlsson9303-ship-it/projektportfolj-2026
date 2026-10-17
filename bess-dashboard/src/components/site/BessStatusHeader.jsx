import { useState } from "react";
import { Activity, AlertTriangle, BatteryCharging, Box, Check, CircleDot, Cpu, Receipt, Server, Zap } from "lucide-react";
import { Meter } from "../ds/index.js";
import { FAS_ANTAL, arFasNr, faseInfo, statusEtikett } from "../../data/projektfaser.ts";
import { komponentLage } from "../../lib/veckoOversikt.js";
import { MALLAR, fmtTal } from "../../lib/site.js";
import { fmtSEK } from "../../lib/format.js";

/* BESS-översikten överst i Veckokoll: projektets namn och effekt, tre nyckeltal (besvarat, öppna
   avvikelser, ÄTA-påverkan), de fyra stadierna i bygget och parkens komponenter — allt med riktig data ur
   portföljen. Inga påhittade projekt eller komponenter: finns inget på siten visas det som ett tomt läge
   med en väg dit.

   Färger: bandet står på sidebarens mörkblå token och cyan accent (--one-bla); varning och avvikelse är
   designsystemets orange och röda toner. Status står alltid som text bredvid färgen. Interaktiva rutor är
   knappar med aria-expanded, och rörelse är bara transform/opacity (avstängd vid prefers-reduced-motion). */

const STADIE_TON = {
  klar: { kant: "border-turkos", text: "Klart", ikon: Check },
  pagaende: { kant: "border-one-bla", text: "Pågår", ikon: Activity },
  sen: { kant: "border-rod", text: "Försenat", ikon: AlertTriangle },
  ej_startat: { kant: "border-hairline-stark", text: "Ej startat", ikon: CircleDot },
};

const IKON_FOR_TYP = { container: BatteryCharging, skid: Cpu, ehouse: Box, trafo: Zap };
const TYPNAMN = { container: "Batteri", skid: "Kraftelektronik", ehouse: "Teknikhus", trafo: "Nät" };

const RUTA =
  "cursor-pointer rounded-lg border border-solid text-left font-body transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none " +
  "hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-[0.99] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-one-bla";

const R = 16;
const OMKRETS = 2 * Math.PI * R;

function Ring({ andel }) {
  return (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={R} fill="none" strokeWidth="4" className="stroke-white/15" />
        <circle
          cx="20"
          cy="20"
          r={R}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className="stroke-one-bla transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
          strokeDasharray={OMKRETS}
          strokeDashoffset={OMKRETS * (1 - andel / 100)}
        />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums">{andel}%</span>
    </span>
  );
}

function Nyckeltal({ ikon: Ikon, ikonKlass = "", kant = "border-white/15", titel, varde, hint, onClick, atgard }) {
  const inre = (
    <>
      {Ikon ? <Ikon size={20} aria-hidden="true" className={`shrink-0 ${ikonKlass}`} /> : null}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-himmel">{titel}</span>
        <span className="block text-[15px] font-bold leading-snug tabular-nums">{varde}</span>
        {hint ? <span className="block text-[11.5px] leading-snug text-white/80">{hint}</span> : null}
      </span>
    </>
  );
  const klass = `flex items-center gap-3 rounded-lg border border-solid bg-white/5 px-4 py-2.5 ${kant}`;
  return onClick ? (
    <button type="button" onClick={onClick} aria-label={atgard} className={`${klass} cursor-pointer text-left font-body text-white transition-[transform,background-color] duration-150 hover:-translate-y-px hover:bg-white/10 active:scale-[0.98] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}>
      {inre}
    </button>
  ) : (
    <div className={klass}>{inre}</div>
  );
}

export function BessStatusHeader({ projekt, effekt, siffror, ata, stadier, komponenter, ur, onVisaI3D, onOppnaSiten, onOppnaAta, onOppnaTidplan }) {
  const [valtStadie, setValtStadie] = useState(null);
  const [valdKomp, setValdKomp] = useState(null);
  const fas = arFasNr(projekt.fas) ? projekt.fas : null;
  const fasInfo = fas ? faseInfo(fas) : null;
  const stadie = stadier.find((s) => s.id === valtStadie) || null;
  const komp = komponenter.find((k) => k.id === valdKomp) || null;
  const kompLage = komp ? komponentLage(komp, ur) : null;
  const avvikelser = siffror.avvikelse;

  return (
    <section aria-labelledby="bess-rubrik" className="mb-4 overflow-hidden rounded-xl border border-solid border-hairline bg-surface shadow-sm lg:mb-6">
      {/* Band: projekt, effekt och nyckeltal */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-0 border-b-4 border-solid border-one-bla bg-[var(--sidebar-2)] p-5 text-white">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-solid border-one-bla/40 bg-one-bla/20 text-one-bla">
            <Zap size={22} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id="bess-rubrik" className="m-0 font-head text-[19px] font-bold leading-tight tracking-tight">
                {projekt.nr ? `${projekt.nr} ` : ""}
                {projekt.namn}
              </h3>
              {effekt ? <span className="rounded-full bg-knapp-bla px-2.5 py-0.5 text-[11.5px] font-semibold text-white">BESS {effekt}</span> : null}
            </div>
            <p className="m-0 mt-0.5 text-[12px] text-white/80">
              {fasInfo ? `Fas ${fas} av ${FAS_ANTAL} · ${fasInfo.kort} · ${statusEtikett(fasInfo.status)}` : statusEtikett(projekt.status)}
              {projekt.ort ? ` · ${projekt.ort}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-3" role="group" aria-label="Nyckeltal för veckan">
          <div className="flex items-center gap-3 rounded-lg border border-solid border-white/15 bg-white/5 px-4 py-2.5">
            <Ring andel={siffror.andel} />
            <span>
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-himmel">Besvarat</span>
              <span className="block text-[15px] font-bold tabular-nums">
                {siffror.besvarade}/{siffror.totalt} frågor
              </span>
            </span>
          </div>
          <Nyckeltal
            ikon={AlertTriangle}
            ikonKlass={avvikelser ? "text-rod" : siffror.varning ? "text-orange" : "text-turkos"}
            kant={avvikelser ? "border-rod" : siffror.varning ? "border-orange" : "border-white/15"}
            titel="Öppna avvikelser"
            varde={avvikelser ? `${avvikelser} ${avvikelser === 1 ? "avvikelse" : "avvikelser"}` : "Inga avvikelser"}
            hint={siffror.varning ? `${siffror.varning} ${siffror.varning === 1 ? "varning" : "varningar"} att kontrollera` : null}
          />
          <Nyckeltal
            ikon={Receipt}
            ikonKlass="text-one-bla"
            titel="ÄTA-påverkan"
            varde={`${ata.oppna} ${ata.oppna === 1 ? "öppen post" : "öppna poster"}`}
            hint={ata.ejFakturerat ? `${fmtSEK(ata.ejFakturerat)} godkänt, ej fakturerat` : ata.pagaende ? `${fmtSEK(ata.pagaende)} under prissättning` : "Inget väntar på faktura"}
            onClick={onOppnaAta}
            atgard="Öppna ÄTA och hinder"
          />
        </div>
      </div>

      {/* Stadier i bygget */}
      <div className="border-0 border-b border-solid border-hairline bg-sunken p-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          <Activity size={14} aria-hidden="true" className="text-text-bla" /> Bygget i fyra steg
        </div>
        {stadier.length ? (
          <>
            <ol aria-label="Stadier i bygget" className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {stadier.map((s, i) => {
                const t = STADIE_TON[s.status];
                const Ikon = t.ikon;
                const vald = s.id === valtStadie;
                return (
                  <li key={s.id} className="min-w-0">
                    <button
                      type="button"
                      aria-expanded={vald}
                      aria-controls="bess-stadie-detalj"
                      onClick={() => setValtStadie(vald ? null : s.id)}
                      className={`${RUTA} flex w-full flex-col gap-1.5 border-l-4 bg-surface p-2.5 ${t.kant} ${vald ? "shadow-md ring-2 ring-one-bla/30" : "hover:border-hairline-stark"}`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.status === "klar" ? "bg-turkos text-white" : s.status === "pagaende" ? "bg-knapp-bla text-white" : s.status === "sen" ? "bg-rod text-white" : "bg-hairline text-ink-soft"}`}
                        >
                          {s.status === "klar" ? <Check size={14} strokeWidth={3} /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">{s.namn}</span>
                      </span>
                      <Meter value={s.andel} size="sm" ton={s.status === "klar" ? "klar" : "pagar"} />
                      <span className="flex items-center justify-between text-[11.5px] text-ink-soft">
                        <span className="inline-flex items-center gap-1">
                          <Ikon size={12} aria-hidden="true" /> {t.text}
                        </span>
                        <span className="tabular-nums">{s.klara}/{s.totalt}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div id="bess-stadie-detalj" aria-live="polite">
              {stadie ? (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border-0 border-l-4 border-solid border-one-bla bg-surface p-3 text-[12.5px] text-ink">
                  <span>
                    <b>{stadie.namn}:</b> {stadie.klara} av {stadie.totalt} kontrollpunkter bockade i moment {stadie.kod.join(", ") || stadie.moment.join(", ")} i checklistan. Status: {STADIE_TON[stadie.status].text.toLowerCase()}.
                  </span>
                  <span className="flex gap-2">
                    <button type="button" className="btn sec mini" onClick={onOppnaTidplan}>
                      Öppna tidplanen
                    </button>
                    <button type="button" className="btn sec mini" onClick={() => setValtStadie(null)}>
                      Stäng
                    </button>
                  </span>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p className="m-0 text-[13px] text-ink-soft">Checklistan går inte att räkna för det här projektet.</p>
        )}
      </div>

      {/* Parkens komponenter */}
      <div className="p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            <Server size={14} aria-hidden="true" className="text-text-bla" /> Parkens komponenter (Siten i 3D)
          </div>
          <span className="text-[11.5px] text-ink-soft">{komponenter.length ? "Klicka på en komponent för snabbstatus" : ""}</span>
        </div>

        {komponenter.length ? (
          <>
            <ul aria-label="Komponenter i parken" className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
              {komponenter.map((k) => {
                const l = komponentLage(k, ur);
                const Ikon = IKON_FOR_TYP[k.typ] || Box;
                const vald = k.id === valdKomp;
                return (
                  <li key={k.id} className="min-w-0">
                    <button
                      type="button"
                      aria-expanded={vald}
                      aria-controls="bess-komp-detalj"
                      onClick={() => setValdKomp(vald ? null : k.id)}
                      className={`${RUTA} relative flex w-full flex-col gap-1 overflow-hidden bg-surface p-3 ${vald ? "border-one-bla shadow-md ring-2 ring-one-bla/25" : "border-hairline hover:border-hairline-stark"}`}
                    >
                      <span aria-hidden="true" className={`absolute right-0 top-0 h-3 w-3 rounded-bl-lg ${l.ton === "varning" ? "bg-orange" : "bg-hairline-stark"}`} />
                      <span className="flex items-center gap-2 pr-3">
                        <Ikon size={16} aria-hidden="true" className="shrink-0 text-text-bla" />
                        <span className="truncate text-[12.5px] font-bold text-ink">{k.namn || MALLAR[k.typ]?.namn}</span>
                      </span>
                      <span className="flex items-center justify-between gap-2 text-[11.5px] text-ink-soft">
                        <span className="truncate">{TYPNAMN[k.typ] || MALLAR[k.typ]?.namn}</span>
                        <span className={`shrink-0 font-semibold ${l.ton === "varning" ? "text-warn-ink" : "text-ink-soft"}`}>{l.ton === "varning" ? "Ärende" : "Inga ärenden"}</span>
                      </span>
                      {k.soc !== undefined && k.soc !== null && k.soc !== "" ? (
                        <>
                          <Meter value={Number(k.soc)} size="sm" />
                          <span className="text-[11px] tabular-nums text-ink-soft">SoC {fmtTal(k.soc, 0)} %</span>
                        </>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div id="bess-komp-detalj" aria-live="polite">
              {komp && kompLage ? (
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3 rounded-lg border-0 border-l-4 border-solid border-one-bla bg-[var(--sidebar-3)] p-3 text-[12.5px] text-white">
                  <div className="min-w-0 flex-1">
                    <b className="text-himmel">{komp.namn}:</b> {kompLage.statusText}. {kompLage.text}.
                    {komp.mwh ? ` ${fmtTal(komp.mwh, 1)} MWh` : ""}
                    {komp.mw ? ` · ${fmtTal(komp.mw, 1)} MW` : ""}
                    {komp.mva ? ` · ${fmtTal(komp.mva, 1)} MVA` : ""}
                    {komp.soc !== undefined && komp.soc !== null && komp.soc !== "" ? ` · SoC ${fmtTal(komp.soc, 0)} %` : ""}
                    {komp.spec ? <span className="mt-1 block text-white/85">{komp.spec}</span> : null}
                    {kompLage.oppnaArenden.length ? (
                      <ul className="m-0 mt-1 list-disc pl-5 text-white/90">
                        {kompLage.oppnaArenden.slice(0, 3).map((u) => (
                          <li key={u.id}>
                            {u.nr} {u.benamning}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" className="btn mini" onClick={() => onVisaI3D(komp.id)}>
                      Visa i 3D
                    </button>
                    <button type="button" className="btn sec mini !border-white/60 !text-white hover:!bg-white/10" onClick={() => setValdKomp(null)}>
                      Stäng
                    </button>
                  </span>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-hairline-stark bg-sunken p-4 text-[13px] text-ink-soft">
            <span>Inga komponenter är placerade på siten än. Containrar, skids och trafo som placeras i Siten i 3D visas här med status och laddstatus.</span>
            <button type="button" className="btn sec mini" onClick={onOppnaSiten}>
              Öppna Siten i 3D
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
