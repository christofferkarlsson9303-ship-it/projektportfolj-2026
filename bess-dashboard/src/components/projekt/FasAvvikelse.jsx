import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout } from "../ds/index.js";
import { arFasNr, faseInfo, statusEtikett } from "../../data/projektfaser.ts";
import { fasAvvikelse } from "../../lib/fasmappning.js";

/* Att flytta ett projekts fas, och att visa när tidplanen säger en annan fas än projektkortet.

   Alla vyer flyttar fasen på samma sätt: en fråga först, sedan SATT_PROJEKTFAS (som loggar och
   låter statusen följa fasen) och en bekräftelse. Projektkortets fasmätare, tidplanen och
   milstolparna använder samma hook, så texterna och loggen blir desamma. */

export function useFlyttaFas() {
  const { dispatch } = usePortfolj();
  const { bekrafta, visaToast } = useUi();
  return async (p, nr, { orsak = "" } = {}) => {
    if (!p || !arFasNr(nr)) return false;
    const nuFas = arFasNr(p.fas) ? p.fas : 1;
    if (nr === nuFas) return false;
    const till = faseInfo(nr);
    const vunnet = nuFas === 1 && nr === 2;
    const hopp = nr > nuFas + 1 ? ` Du hoppar över fas ${nuFas + 1}${nr > nuFas + 2 ? "–" + (nr - 1) : ""}.` : "";
    const ja = await bekrafta(
      vunnet
        ? `${p.namn}: anbudet är vunnet och projektet går vidare till fas 2, ${till.kort}. Statusen blir ${statusEtikett(till.status)}.`
        : `${orsak ? orsak + " " : ""}${p.namn} flyttas från fas ${nuFas} (${faseInfo(nuFas).kort}) till fas ${nr} (${till.kort}). Statusen blir ${statusEtikett(till.status)}.${hopp}`,
      { titel: vunnet ? "Anbudet vunnet?" : "Ändra projektets fas", ok: vunnet ? "Ja, gå till fas 2" : "Ändra fas" }
    );
    if (!ja) return false;
    dispatch({ type: "SATT_PROJEKTFAS", id: p.id, fas: nr });
    visaToast(`${p.namn} ligger nu i fas ${nr}, ${till.kort}.`);
    return true;
  };
}

/** Varning när checklistans grindar (tidplanen) pekar på en annan fas än projektets.
 *  `faslage` är lib/epc.js faslage för projektet. Visar ingenting när de stämmer. */
export function FasAvvikelse({ p, faslage, kompakt = false }) {
  const flytta = useFlyttaFas();
  const a = fasAvvikelse(p, faslage);
  if (!a) return null;
  const knapp = (
    <button type="button" className="btn sec mini" onClick={() => flytta(p, a.tidplan, { orsak: "Tidplanens grindar pekar på en annan fas." })}>
      Flytta till fas {a.tidplan}
    </button>
  );
  if (kompakt) {
    return (
      <p className="m-0 flex flex-wrap items-center gap-2 text-[12px] text-ink-soft">
        <span>
          Tidplanen pekar på fas {a.tidplan} ({faseInfo(a.tidplan).kort}).
        </span>
        {knapp}
      </p>
    );
  }
  return (
    <Callout ton="warn">
      <b>
        Tidplanen pekar på fas {a.tidplan} ({faseInfo(a.tidplan).kort}), projektet ligger i fas {a.kort} ({faseInfo(a.kort).kort}).
      </b>{" "}
      Fasen räknas ur första moment vars grind inte är passerad. Flytta projektet om tidplanen stämmer, annars
      kontrollera grindarna i Bygga batteripark. <span className="ml-1 inline-block">{knapp}</span>
    </Callout>
  );
}
