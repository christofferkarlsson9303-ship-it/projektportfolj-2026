/* Kontrollpunkter i EPC-checklistan som har sitt underlag i en annan vy.

   Punkten visar en länk dit, så att den som står i checklistan hittar
   listan eller formuläret som ligger bakom. Nyckeln är punktens id i
   bessChecklistData.ts; `vy` och `id` skickas till oppnaPost. */

import { APD_EPC } from "./apd.js";
import { PROJEKTSTART_EPC } from "./projektstart.js";

export const PUNKT_UNDERLAG = {
  [PROJEKTSTART_EPC.overlamning]: { vy: "projektstart", id: "ps-direktiv", text: "Projektdirektivet" },
  [PROJEKTSTART_EPC.direktiv]: { vy: "projektstart", id: "ps-direktiv", text: "Projektdirektivet" },
  [PROJEKTSTART_EPC.uppstart]: { vy: "projektstart", id: "ps-uppstart", text: "Uppstartsavstämningen" },
  [APD_EPC.etablering]: { vy: "hseq", id: "hseq-apd", text: "APD-plan i HSEQ" },
  [APD_EPC.plan]: { vy: "hseq", id: "hseq-apd", text: "APD-plan i HSEQ" },
  [APD_EPC.tavla]: { vy: "hseq", id: "hseq-apd", text: "Arbetsplatstavlan i HSEQ" },
};
