import { usePortfolj, useUi } from "../../state/hooks.js";
import { nyttProjekt, projektstartFel } from "../../lib/projektstart.js";

export function NyttProjekt() {
  const { state, dispatch } = usePortfolj();
  const { fraga, visaToast, setValtProjekt, visa } = useUi();
  const skapa = async () => {
    const v = await fraga({ titel: "Skapa nytt projekt", lead: "Ett tomt projekt med projektmetodens mallar. Inga gamla resultat, belopp, datum eller ärenden kopieras. Mallkraven behöver anpassas till ditt kontrakt.", ok: "Skapa projekt", validera: (varden) => projektstartFel(state, varden), falt: [
      { namn: "namn", etikett: "Projektnamn", placeholder: "Till exempel Kalmar batteripark", obligatoriskt: true, maxLength: 120 },
      { namn: "nr", etikett: "Projektnummer (om du har det)", maxLength: 40 },
      { namn: "ort", etikett: "Ort", maxLength: 120 }, { namn: "bestallare", etikett: "Beställare", maxLength: 160 },
      { namn: "startdatum", etikett: "Startdatum (om det är bestämt)", typ: "date" },
      { namn: "fardigstallande", etikett: "Färdigdatum (om det är bestämt)", typ: "date" },
    ] });
    if (!v) return;
    const fel = projektstartFel(state, v);
    if (fel) { visaToast(fel, "warn"); return; }
    const rad = nyttProjekt(v, `projekt-${crypto.randomUUID()}`);
    dispatch({ type: "SKAPA_PROJEKT", rad });
    setValtProjekt(rad.id); visa("metod");
    visaToast("Projektet är skapat. Kontrollera kontrakt, betalplan, priser och kontrollkrav före användning.");
  };
  return <button type="button" className="btn" onClick={skapa}>Nytt projekt</button>;
}
