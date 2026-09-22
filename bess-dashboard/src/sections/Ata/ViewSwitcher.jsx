import { Vyvaljare } from "../../components/ui/Vyvaljare.jsx";
import { VYER } from "./vyval.js";

/* Vyväljare för ÄTA-vyn. Bygger på den befintliga segmenterade kontrollen i
   stället för en egen knappsats — den är redan en radiogroup med piltangenter
   och rätt tabbordning, vilket lösa knappar inte är. */
export function ViewSwitcher({ vy, onValj }) {
  return <Vyvaljare alternativ={VYER} varde={vy} onValj={onValj} etikett="Visningsläge för ÄTA" />;
}
