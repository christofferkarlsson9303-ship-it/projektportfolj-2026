/* Mötesbeslut och åtgärder.

   Ett beslut i byggmötesprotokollet kan länkas till en åtgärd i punktregistret
   (`punktId`). Åtgärden är då sanningen om status: nästa möte läser den i
   stället för att få en egen kopia att hålla uppdaterad. Utan länk gäller
   mötespunktens egen status som förut. */

import { nyttId } from "./id.js";
import { arGiltigtDatum } from "./datum.js";

/** Den länkade åtgärden, eller null om länk saknas eller åtgärden är borttagen. */
export function lankadAtgard(pt, punkter) {
  if (!pt?.punktId) return null;
  return (punkter || []).find((x) => x.id === pt.punktId) || null;
}

/** "oppen" eller "avslutad" för en mötespunkt. En länkad åtgärd styr. */
export function motespunktStatus(pt, punkter) {
  const a = lankadAtgard(pt, punkter);
  if (a) return a.status === "klarmarkerad" ? "avslutad" : "oppen";
  return pt.status === "avslutad" ? "avslutad" : "oppen";
}

/** Ny åtgärd ur en mötespunkt. Ansvarig lämnas tom — rollen i protokollet
 *  ("PL", "UE") är inte en person. Fristen är nästa möte om det är ett datum. */
export function nyAtgardFranMotespunkt(mote, pt) {
  return {
    id: nyttId("p"),
    projektId: mote.projektId,
    titel: String(pt.text || "").trim(),
    agare: "",
    forfaller: arGiltigtDatum(mote.nasta) ? mote.nasta : "",
    status: "oppen",
    kalla: `Byggmöte ${mote.nr} §${pt.para}`,
    moteId: mote.id,
    motespunktId: pt.id,
  };
}
