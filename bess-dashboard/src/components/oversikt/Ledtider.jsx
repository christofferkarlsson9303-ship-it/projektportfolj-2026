import { useMemo, useState } from "react";
import { Check, Hourglass } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { PTag } from "../ui/PTag.jsx";
import { LedtidStatus } from "../epc/Delar.jsx";
import { datumKort, dagarText, idag } from "../../lib/datum.js";
import { ledtiderPortfolj, VARNING_DAGAR } from "../../lib/epc.js";
import { Lank, Ruta } from "./Ruta.jsx";

/* Ligg steget före — ledtidskrävande moment räknade bakåt från projektets
   datum. Röd när sista startdatum passerat, gul inom två veckor. Listan visar
   det som är aktuellt nu (försenat, starta nu och det som ska startas inom
   två månader); resten finns i checklistans ledtidstabell. */

const FRAMFORHALLNING = 60;
const I_LISTAN = 4;

/** Ledtiden i den form checklistan skriver den: veckor, eller månader för 61 dagar. */
const langd = (d) => (d === 61 ? "2 mån" : d % 7 === 0 ? `${d / 7} v` : `${d} d`);

const aktuell = (l) =>
  l.status === "sen" || l.status === "snart" || (l.status === "i-tid" && l.dagarKvar <= FRAMFORHALLNING);

export function Ledtider({ i }) {
  const { state, dispatch } = usePortfolj();
  const { valtProjekt, oppnaPost, visa } = useUi();
  const [omfang, setOmfang] = useState("alla");
  const [visaAlla, setVisaAlla] = useState(false);
  const nu = idag();

  const alla = useMemo(() => ledtiderPortfolj(state, nu), [state, nu]);
  const iOmfang = omfang === "alla" ? alla : alla.filter((l) => l.projektId === valtProjekt);
  const lista = iOmfang.filter(aktuell);
  const visade = visaAlla ? lista : lista.slice(0, I_LISTAN);
  const sena = iOmfang.filter((l) => l.status === "sen").length;
  const snart = iOmfang.filter((l) => l.status === "snart").length;
  const valt = state.projekt.find((p) => p.id === valtProjekt);

  return (
    <Ruta
      id="ov-ledtider"
      i={i}
      ikon={Hourglass}
      ikonTon={sena ? "bad" : snart ? "warn" : ""}
      titel="Ligg steget före – ledtider"
      under={
        alla.length
          ? `${sena} försenade · ${snart} att starta inom ${VARNING_DAGAR} dagar — räknat bakåt från leverans, schakt, idrifttagning och slutbesiktning`
          : "Inga projekt med startdatum och färdigställande ännu"
      }
      klass="md:col-span-2"
      atgard={
        <Lank onClick={() => visa("epc")} etikett="Öppna ledtidstabellen i checklistan">
          Alla ledtider
        </Lank>
      }
    >
      {alla.length ? (
        <div className="ov-flikar" role="group" aria-label="Visa ledtider för">
          <button type="button" aria-pressed={omfang === "alla"} onClick={() => setOmfang("alla")}>
            Alla projekt
          </button>
          <button type="button" aria-pressed={omfang === "valt"} onClick={() => setOmfang("valt")}>
            {valt ? (valt.nr ? valt.nr + " " : "") + (valt.ort || valt.namn) : "Valt projekt"}
          </button>
        </div>
      ) : null}

      {visade.length ? (
        <ul className="ov-ledlista">
          {visade.map((l) => (
            <li key={`${l.projektId}-${l.id}`} className={l.status}>
              <div className="ov-led-huvud">
                <LedtidStatus status={l.status} />
                <PTag pid={l.projektId} />
                <span className="ov-led-agare">{l.agare}</span>
              </div>
              <div className="ov-led-text">
                <b>{l.arende}</b>
                <span>
                  {l.riktning === "fore" ? "Starta senast" : "Klart senast"} <b>{datumKort(l.senast)}</b> (
                  {dagarText(l.dagarKvar)}) · {langd(l.dagar)} {l.riktning === "fore" ? "före" : "efter"} {l.ank.namn}{" "}
                  {datumKort(l.ank.datum)}
                  {l.ank.kalla === "fasplan" ? " enligt fasplanen" : ""}
                </span>
              </div>
              <div className="ov-led-atgard">
                <button
                  type="button"
                  className="btn sec mini"
                  onClick={() => oppnaPost("epc", `kp-${l.punkt}`)}
                >
                  {l.punkt}
                  <span className="sr-only">: öppna kontrollpunkten i checklistan</span>
                </button>
                <button
                  type="button"
                  className="btn mini ov-led-klar"
                  onClick={() => dispatch({ type: "EPC_VAXLA", pid: l.projektId, punkt: l.punkt, klar: true })}
                >
                  <Check size={13} aria-hidden="true" />
                  Klar
                  <span className="sr-only">: {l.arende}</span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : alla.length ? (
        <div className="ov-tom">Inget ledtidskrävande att starta de kommande {FRAMFORHALLNING} dagarna.</div>
      ) : (
        <p className="lead m-0">Ange startdatum och färdigställande per projekt i checklistan eller i Gantt-schemat.</p>
      )}

      {lista.length > I_LISTAN ? (
        <div>
          <button type="button" className="btn sec mini" onClick={() => setVisaAlla((v) => !v)} aria-expanded={visaAlla}>
            {visaAlla ? "Visa färre" : `Visa alla ${lista.length}`}
          </button>
        </div>
      ) : null}
    </Ruta>
  );
}
