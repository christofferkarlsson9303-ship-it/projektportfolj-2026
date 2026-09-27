import { usePortfolj } from "../../state/hooks.js";
import { DatumFalt } from "../ui/Falt.jsx";
import { FasStatus } from "./Delar.jsx";
import { Card } from "../ds/Card.jsx";
import { DataList } from "../ds/DataList.jsx";
import { LeadTimeList } from "../ds/LeadTimeList.jsx";
import { StatusBadge } from "../ds/StatusBadge.jsx";
import { LEDTID_TILL_STATUS } from "../../lib/status.js";
import { FASER } from "../../data/bessChecklistData.ts";
import { datumKort, dagarText } from "../../lib/datum.js";
import { FAS_STATUS, LEDTID_STATUS, lagesbild, ledtidslage, planAnkare } from "../../lib/epc.js";

/* Lägesbilden: var varje projekt står i de 16 faserna, och för valt projekt
   vad som pågår, vilken grind och betalning som står näst på tur och vilka
   ledtider som ska startas. Spåret med 16 rutor är samma statusfärger som
   Gantt-schemat; texten bredvid säger samma sak i ord. */

const kortNamn = (p) => (p.nr ? p.nr + " " : "") + (p.ort || p.namn);

function Fasspar({ faser }) {
  return (
    <span className="epc-spar16" aria-hidden="true">
      {faser.map((f) => (
        <i key={f.fas.nr} className={f.status} title={`${f.fas.nr} ${f.fas.kort}: ${FAS_STATUS[f.status][1]}`} />
      ))}
    </span>
  );
}

/** En rad per projekt. Raden är en knapp som väljer projektet för guiden nedan. */
export function Portfoljlage({ valt, onValj }) {
  const { state } = usePortfolj();

  return (
    <div className="epc-lage" role="group" aria-label="Välj projekt">
      <div className="epc-lage-rubriker" aria-hidden="true">
        <span>Projekt</span>
        <span className="epc-lage-fasrubrik">
          {FASER.map((f) => (
            <span key={f.nr}>{f.nr}</span>
          ))}
        </span>
        <span>Nu</span>
        <span>Nästa betalning</span>
        <span>Slutbesiktning</span>
      </div>
      {state.projekt.map((p) => {
        const l = lagesbild(state, p.id);
        const nu = l.sena[0] || l.aktuella[l.aktuella.length - 1];
        return (
          <button
            key={p.id}
            type="button"
            className="epc-lage-rad"
            aria-pressed={valt === p.id}
            onClick={() => onValj(p.id)}
          >
            <span className="epc-lage-namn">
              {kortNamn(p)}
              <span className="sr-only">, {l.grindarPasserade} av 16 grindar passerade</span>
            </span>
            <Fasspar faser={l.faser} />
            <span className="epc-lage-nu">
              <span className="epc-lage-etikett">Nu: </span>
              {!l.harPlan ? (
                <span className="epc-lage-tom">Datum saknas</span>
              ) : nu ? (
                <>
                  Fas {nu.fas.nr} {nu.fas.kort}
                  {l.sena.length ? <span className="epc-lage-sen"> · försenad</span> : null}
                </>
              ) : l.nastaGrind ? (
                `Nästa: fas ${l.nastaGrind.fas.nr} ${l.nastaGrind.fas.kort}`
              ) : (
                "Alla grindar passerade"
              )}
            </span>
            <span className="epc-lage-ms">
              <span className="epc-lage-etikett">Nästa betalning: </span>
              {l.nastaBetalning
                ? `${l.nastaBetalning.kod} · ${l.nastaBetalning.andel} %${
                    l.nastaBetalning.datum ? " · " + datumKort(l.nastaBetalning.datum) : ""
                  }`
                : "—"}
            </span>
            <span className="epc-lage-sb">
              <span className="epc-lage-etikett">Slutbesiktning: </span>
              {l.dagarTillSlutbesiktning === null ? "—" : dagarText(l.dagarTillSlutbesiktning)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Läget nu för valt projekt, i tre kort: det som pågår, det som står näst
 *  på tur och ledtiderna som ska startas — och projektets datum under. */
export function NuLage({ pid, onVisaFas }) {
  const { state, uppd } = usePortfolj();
  const p = state.projekt.find((x) => x.id === pid);
  const l = lagesbild(state, pid);
  const a = planAnkare(state, pid);
  const ledtider = l.harPlan ? ledtidslage(state, pid).filter((x) => x.status === "sen" || x.status === "snart") : [];
  const nb = l.nastaBetalning;
  const ng = l.nastaGrind;
  const tom = (text) => <p className="m-0 text-sm text-ink-soft">{text}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          id={`epc-nu-pagar-${pid}`}
          title="Pågår nu"
          badge={l.sena.length ? <StatusBadge status="forsenad" label={`${l.sena.length} försenad`} /> : null}
        >
          {l.aktuella.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {l.aktuella.map((f) => (
                <li key={f.fas.nr} className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <FasStatus status={f.status} />
                    <span className="text-xs font-semibold text-ink-soft tabular-nums">
                      {datumKort(f.start)} – {datumKort(f.slut)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="epc-textknapp text-left text-sm"
                    onClick={() => onVisaFas(f.fas.nr)}
                  >
                    Fas {f.fas.nr} · {f.fas.titel}
                  </button>
                  <span className="text-xs text-ink-soft tabular-nums">
                    {f.klara} av {f.punkter - f.ejAktuella} klara{f.hp ? ` · HP ${f.hpKlara}/${f.hp}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            tom(l.harPlan ? "Ingen fas pågår enligt planen." : "Ange projektets datum nedan.")
          )}
        </Card>

        <Card id={`epc-nu-nasta-${pid}`} title="Näst på tur">
          <DataList
            items={[
              ng
                ? { label: "Nästa grind", value: ng.fas.grind.kod, detail: ng.fas.grind.text }
                : { label: "Nästa grind", value: "Alla passerade" },
              nb
                ? {
                    label: "Nästa betalning",
                    value: `${nb.kod} · ${nb.andel} %`,
                    detail: `${nb.namn} — ${nb.utloses.toLowerCase()}${nb.datum ? ` · plan ${datumKort(nb.datum)}` : ""}`,
                  }
                : { label: "Nästa betalning", value: "—" },
              {
                label: "Slutbesiktning",
                value: p.fardigstallande ? datumKort(p.fardigstallande) : "Datum saknas",
                detail: l.dagarTillSlutbesiktning === null ? null : dagarText(l.dagarTillSlutbesiktning),
              },
            ]}
          />
        </Card>

        <Card
          id={`epc-nu-ledtider-${pid}`}
          title="Ledtider att starta"
          badge={ledtider.length ? <StatusBadge status="forsenad" label={`${ledtider.length} att hantera`} /> : null}
        >
          <LeadTimeList
            label={`Ledtider att starta i ${p.namn}`}
            items={ledtider.slice(0, 4).map((x) => ({
              id: x.id,
              status: LEDTID_TILL_STATUS[x.status],
              statusLabel: LEDTID_STATUS[x.status][1],
              title: x.arende,
              dueDate: datumKort(x.senast),
              delayText: dagarText(x.dagarKvar),
            }))}
            empty={tom(l.harPlan ? "Inget försenat eller akut just nu." : "—")}
          />
        </Card>
      </div>

      <Card id={`epc-projektdatum-${pid}`} title="Projektets datum" subtitle="Styr fasplanen, Gantt-schemat och ledtiderna.">
        <div className="epc-projektplan">
          <div className="epc-falt">
            <label htmlFor={`epc-start-${pid}`}>
              Startdatum (NTP)
              {p.startdatumAntagande ? <StatusBadge status="starta_nu" label="Antagande" className="normal-case tracking-normal" /> : null}
            </label>
            <DatumFalt
              id={`epc-start-${pid}`}
              varde={p.startdatum || ""}
              etikett={`Startdatum för ${p.namn}`}
              onCommit={(v) => {
                uppd("projekt", pid, "startdatum", v);
                uppd("projekt", pid, "startdatumAntagande", false);
              }}
            />
          </div>
          <div className="epc-falt">
            <label htmlFor={`epc-slut-${pid}`}>Färdigställande / slutbesiktning</label>
            <DatumFalt
              id={`epc-slut-${pid}`}
              varde={p.fardigstallande || ""}
              etikett={`Färdigställande för ${p.namn}`}
              onCommit={(v) => uppd("projekt", pid, "fardigstallande", v)}
            />
          </div>
          <p className="epc-plantext">
            {a ? (
              <>
                Faserna räknas från start, {a.mittKalla === "leverans" ? "BESS-leveransen" : "en antagen leverans"}{" "}
                {datumKort(a.mitt)} och slutbesiktningen. Varje fas kan få egna datum i guiden.
                {a.startAntagande ? " Startdatumet är antaget ur kontraktets milstolpar (feb–sep 2026) — ange det rätta." : ""}
              </>
            ) : (
              "Ange startdatum och färdigställande så räknas faserna, Gantt-schemat och ledtiderna fram."
            )}
          </p>
        </div>
      </Card>
    </div>
  );
}
