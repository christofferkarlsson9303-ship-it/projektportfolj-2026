/* Registrera händelse.

   En händelse börjar som en punkt i punktregistret: vad som hänt eller behöver
   göras, ansvarig, nästa datum och ev. underlag. Behöver den mer kan den
   kompletteras med en länkad post — ÄTA, hinder eller risk. Posterna är
   separata register med egen betydelse; sambandet bevaras som länkar åt båda
   hållen (`lankar` på punkten, `punktId` på den länkade posten) i stället för
   att texten kopieras tyst. */

import { nyAtaPost } from "./nyaPoster.js";
import { ORSAKER } from "../data/konstanter.js";
import { nyttId } from "./id.js";
import { idag } from "./datum.js";

/* Hinder och störning är inga egna poster: de är orsaker till en ÄTA (ORSAKER i konstanter.js). */
export const KOPPLINGSTYPER = {
  ata: { etikett: "ÄTA", lista: "ur" },
  risk: { etikett: "Risk", lista: "risker" },
};

/** Punkten som en händelse blir. Ansvarig och datum lämnas som de är — inget gissas. */
export function nyHandelse(pid, falt) {
  return {
    id: nyttId("p"),
    projektId: pid,
    titel: String(falt.titel || "").trim(),
    agare: String(falt.agare || "").trim(),
    forfaller: "",
    uppfoljning: falt.uppfoljning || "",
    underlag: String(falt.underlag || "").trim(),
    status: "oppen",
    kalla: "Registrerad händelse",
    lankar: [],
  };
}

/** Posten som kompletterar händelsen, med grunduppgifterna förifyllda, och länken
 *  att lägga på punkten. Returnerar null för okänd typ. */
export function nyKoppladPost(typ, state, punkt, val = {}) {
  const t = KOPPLINGSTYPER[typ];
  if (!t) return null;
  let rad;
  if (t.lista === "ur") {
    /* Orsaken föreslår om omständigheten behandlas som ÄTA eller hinder. Utan orsak: ÄTA. */
    const orsak = ORSAKER.find((o) => o[0] === val.orsak);
    rad = nyAtaPost(state, punkt.projektId, {
      benamning: punkt.titel,
      klass: orsak && (orsak[2] === "ata" || orsak[2] === "hinder") ? orsak[2] : "ata",
      orsak: orsak ? orsak[0] : "",
      handelseDatum: idag(),
      kalla: punkt.kalla,
      punktId: punkt.id,
    });
  } else {
    rad = {
      id: nyttId("r"),
      projektId: punkt.projektId,
      titel: punkt.titel,
      sannolikhet: 3,
      konsekvens: 3,
      atgard: "",
      agare: punkt.agare,
      status: "oppen",
      punktId: punkt.id,
    };
  }
  return { lista: t.lista, rad, lank: { id: rad.id, lista: t.lista, typ, etikett: rad.nr || t.etikett } };
}
