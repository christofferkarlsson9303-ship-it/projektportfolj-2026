import { usePortfolj } from "../../state/hooks.js";
import { DatumFalt } from "../ui/Falt.jsx";
import { FasStatus, LedtidStatus } from "./Delar.jsx";
import { FASER } from "../../data/bessChecklistData.ts";
import { datumKort, dagarText } from "../../lib/datum.js";
import { FAS_STATUS, lagesbild, ledtidslage, planAnkare } from "../../lib/epc.js";

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

/** Nu-läget för valt projekt: det som pågår, det som kommer och startdatumen. */
export function NuLage({ pid, onVisaFas }) {
  const { state, uppd } = usePortfolj();
  const p = state.projekt.find((x) => x.id === pid);
  const l = lagesbild(state, pid);
  const a = planAnkare(state, pid);
  const ledtider = l.harPlan ? ledtidslage(state, pid).filter((x) => x.status === "sen" || x.status === "snart") : [];

  return (
    <div className="epc-nu">
      <div className="epc-nu-kol">
        <h4>Pågår nu</h4>
        {l.aktuella.length ? (
          <ul className="epc-nu-lista">
            {l.aktuella.map((f) => (
              <li key={f.fas.nr}>
                <button type="button" className="epc-textknapp" onClick={() => onVisaFas(f.fas.nr)}>
                  Fas {f.fas.nr} · {f.fas.titel}
                </button>
                <span>
                  <FasStatus status={f.status} /> {datumKort(f.start)} – {datumKort(f.slut)}
                  {f.hp ? ` · ${f.hp} hållpunkter` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="epc-plantext">{l.harPlan ? "Ingen fas pågår enligt planen." : "Ange datum nedan."}</p>
        )}
      </div>

      <div className="epc-nu-kol">
        <h4>Näst på tur</h4>
        <ul className="epc-nu-lista">
          {l.nastaGrind ? (
            <li>
              <span>
                <b>{l.nastaGrind.fas.grind.kod}</b> {l.nastaGrind.fas.grind.text}
              </span>
            </li>
          ) : null}
          {l.nastaBetalning ? (
            <li>
              <span>
                <b>{l.nastaBetalning.kod}</b> {l.nastaBetalning.namn} · {l.nastaBetalning.andel} % —{" "}
                {l.nastaBetalning.utloses.toLowerCase()}
                {l.nastaBetalning.datum ? ` (plan ${datumKort(l.nastaBetalning.datum)})` : ""}
              </span>
            </li>
          ) : null}
          <li>
            <span>
              {l.grindarPasserade} av 16 grindar och {l.hpPasserade} av {l.hp} hållpunkter passerade
            </span>
          </li>
        </ul>
      </div>

      <div className="epc-nu-kol">
        <h4>Ledtider att starta</h4>
        {ledtider.length ? (
          <ul className="epc-nu-lista">
            {ledtider.slice(0, 4).map((x) => (
              <li key={x.id}>
                <span>
                  <LedtidStatus status={x.status} /> {x.arende}
                </span>
                <span className="epc-plantext">
                  Senast {datumKort(x.senast)} ({dagarText(x.dagarKvar)})
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="epc-plantext">{l.harPlan ? "Inget försenat eller akut just nu." : "—"}</p>
        )}
      </div>

      <div className="epc-projektplan">
        <div className="epc-falt">
          <label htmlFor={`epc-start-${pid}`}>
            Startdatum (NTP)
            {p.startdatumAntagande ? <span className="ant">ANTAGANDE</span> : null}
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
    </div>
  );
}
