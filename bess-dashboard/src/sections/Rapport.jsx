import { Printer } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Bestallarrapport } from "../components/ui/Bestallarrapport.jsx";
import { Callout, Card, DataList, Overline, StatTile, StatusBadge } from "../components/ds/index.js";
import { ataSummering, slutdokIndex } from "../lib/berakningar.js";
import { berakFlaggor } from "../lib/flaggor.js";
import { dagarTill } from "../lib/datum.js";
import { fmtProcent, fmtSEK } from "../lib/format.js";
import { bestallarrapportData, statusrad } from "../lib/bestallarrapport.js";
import { FASSTATUS } from "../lib/fasmappning.js";

/* Beställarrapporten på designsystemet. Vyn är en förhandsgranskning av
   vad rapporten tar med — nyckeltal, ÄTA-läget och det som kräver beslut —
   och skriver ut den som PDF. Själva dokumentet ligger i
   Bestallarrapport.jsx och renderas i utskriftsytan, inte här. */

export function Rapport() {
  const { state } = usePortfolj();
  const { valtProjekt: pid, skrivUt } = useUi();

  const projekt = state.projekt.find((p) => p.id === pid) || null;
  const horTill = (r) => !pid || r.projektId === pid;
  const projektNamn = projekt ? (projekt.nr ? projekt.nr + " " : "") + projekt.namn : "Hela portföljen";

  const milstolpar = state.milstolpar.filter(horTill);
  const kvar = milstolpar.filter((m) => m.status !== "klar");
  const forsenade = kvar.filter((m) => m.datum && dagarTill(m.datum) < 0);
  const oppnaPunkter = state.punkter.filter((p) => horTill(p) && p.status === "oppen");
  const risker = state.risker.filter((r) => horTill(r) && r.status !== "stangd");
  const ata = pid ? ataSummering(state, pid) : null;
  const slutdok = pid ? slutdokIndex(state, pid) : null;
  const hoga = berakFlaggor(state).filter((f) => f.niva === "hog" && (!pid || f.projektId === pid));
  const d = pid ? bestallarrapportData(state, pid) : null;
  const msTon = { fakturerad: "ok", pagaende: "info", kvar: "neutral" };

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <Card
          id="rapport-rubrik"
          title={`Beställarrapport — ${projektNamn}`}
          subtitle="Rapporten speglar läget just nu och tar med det som är försenat eller kräver beslut."
          action={
            <button
              type="button"
              className="btn inline-flex items-center gap-2"
              onClick={() => skrivUt(<Bestallarrapport state={state} pid={pid} />)}
            >
              <Printer size={16} aria-hidden="true" />
              Skriv ut som PDF
            </button>
          }
        >
          <Callout ton="info">
            Granska innehållet här innan rapporten går till beställaren. Internkalkyler, á-priser och
            tidrapporter kommer inte med — bara det beställaren ska se.
          </Callout>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          <StatTile label="Milstolpar kvar" value={kvar.length} hint={`av ${milstolpar.length} i planen`} />
          <StatTile
            label="Varav försenade"
            value={forsenade.length}
            ton={forsenade.length ? "bad" : ""}
            hint={forsenade.length ? "har passerat sitt datum" : "inga försenade"}
          />
          <StatTile label="Öppna punkter" value={oppnaPunkter.length} hint="som ligger på någon" />
          <StatTile label="Öppna risker" value={risker.length} hint="i riskregistret" />
          <StatTile
            label="Slutdokumentation"
            value={slutdok ? fmtProcent(slutdok.proc) : "—"}
            hint={slutdok ? "av dokumentkraven klara" : "välj ett projekt"}
          />
        </div>

        {d ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
            <Card
              id="rapport-faser"
              title="Faser i rapporten"
              subtitle={`Bara påbörjade och klara faser kommer med.${d.aterstar.length ? ` Fas ${d.aterstar[0]}–${d.antalFaser} återstår.` : ""}`}
            >
              <DataList
                items={[
                  ...d.faser.map((f) => ({
                    label: `Fas ${f.nr}`,
                    value: f.titel,
                    badge: <StatusBadge ton={FASSTATUS[f.status].ton} label={f.text} />,
                  })),
                ]}
              />
              <Overline className="mt-4">Betalningsmilstolpar</Overline>
              <DataList
                items={d.milstolpar.map((m) => ({
                  label: `${m.kod} · ${m.andel} %`,
                  value: m.namn,
                  detail: `Fas ${m.fas} · ${m.fasKort}${m.datum ? ` · ${m.datum}` : ""}`,
                  badge: <StatusBadge ton={msTon[m.status]} label={m.text} />,
                }))}
              />
            </Card>

            <Card id="rapport-anlaggning" title="Anläggning och prognos" subtitle="Ur projektkortet, siten och tidplanen.">
              <DataList
                items={[
                  { label: "Effekt / energi", value: d.anlaggning.mw ? `${d.anlaggning.mw} MW / ${d.anlaggning.mwh ?? "—"} MWh` : "Ej angiven" },
                  { label: "MV-skid", value: statusrad(d.anlaggning.skid, "MV-skid") },
                  { label: "Battericontainrar", value: statusrad(d.anlaggning.container, "containrar") },
                  {
                    label: "Nätanslutning",
                    value: d.anlaggning.natagare || "Nätägare ej angiven",
                    detail: d.anlaggning.natmoment.map((m) => `${m.kort}: ${m.text.toLowerCase()}`).join(" · "),
                  },
                  d.tid
                    ? {
                        label: "Beräknad slutbesiktning",
                        value: d.tid.slutPrognos || "—",
                        detail: d.tid.kontrakt ? `kontraktet ${d.tid.kontrakt}` : "färdigdatum saknas",
                        badge:
                          d.tid.forsening > 0 ? (
                            <StatusBadge ton="bad" label={`${d.tid.forsening} dagar sent`} />
                          ) : d.tid.forsening === null ? null : (
                            <StatusBadge ton="ok" label="I tid" />
                          ),
                      }
                    : { label: "Beräknad slutbesiktning", value: "—", detail: "start- eller färdigdatum saknas" },
                ]}
              />
            </Card>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card id="rapport-ata" title="ÄTA i rapporten" subtitle="Summering av ÄTA och belopp.">
            {ata ? (
              <DataList
                items={[
                  { label: "ÄTA", value: `${ata.antal} st`, detail: `${ata.oppna} öppna` },
                  { label: "Godkänt", value: fmtSEK(ata.godkant) },
                  {
                    label: "Ej fakturerat",
                    value: fmtSEK(ata.ejFakt),
                    badge: ata.ejFakt ? <StatusBadge ton="warn" label="Att fakturera" /> : null,
                  },
                  projekt?.kontraktsvarde
                    ? { label: "Kontraktsvärde", value: fmtSEK(projekt.kontraktsvarde) }
                    : null,
                ].filter(Boolean)}
              />
            ) : (
              <p className="m-0 text-[13px] text-ink-soft">
                Välj ett projekt i projektväljaren för att se ÄTA-läget i rapporten.
              </p>
            )}
          </Card>

          <Card
            id="rapport-beslut"
            title="Kräver beslut eller åtgärd"
            subtitle="Det som är flaggat som högt kommer med i rapporten."
            badge={
              hoga.length ? (
                <StatusBadge ton="bad" label={`${hoga.length} flaggor`} />
              ) : (
                <StatusBadge ton="ok" label="Inget högt" />
              )
            }
          >
            {hoga.length ? (
              <div className="flex flex-col gap-2">
                <Overline>Kommer med ({Math.min(hoga.length, 12)} av {hoga.length})</Overline>
                <ul aria-label="Flaggor i rapporten" className="m-0 list-none p-0">
                  {hoga.slice(0, 12).map((f, i) => (
                    <li
                      key={i}
                      className="border-0 border-t border-solid border-hairline py-2 text-[13px] leading-snug text-ink first:border-t-0 first:pt-0"
                    >
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="m-0 text-[13px] text-ink-soft">Inget är flaggat som högt just nu — rapporten blir kort.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
