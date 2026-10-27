import { PROJEKTMALLAR } from "./projektkontroll.js";
import { FALTMALLAR } from "./faltmaterial.js";

/* Fältmaterialets kontrollrader får checklistans nummer (beslut 2026-10-27).

   Varje kontrollrad hör till den punkt i Bygga batteripark som den bevisar
   eller detaljerar. Den visas som punktens nummer plus en bokstav: 12.20a,
   12.20b. Bokstäverna delas ut i den ordning raderna står i
   projektchecklistan, så samma rad har samma nummer i alla utskrifter.

   Det interna id:t (P12.01, M2.05, B.02 …) är oförändrat. Registrerade
   resultat (state.faltkontroller) och kopplingen till EPC-punkter (`epc`,
   EGENKONTROLL_STYRKER) läser id:t, så inget behöver flyttas.

   Numret säger bara var raden hör hemma. Det bockar inte av checklistpunkten;
   det gör fortfarande bara `epc`-kopplingen när kontrollen är verifierad.

   Rader märkta "svag" har ingen bra motsvarighet i checklistan och ligger
   under närmaste punkt i samma moment. */
export const KONTROLL_FORALDER = {
  "P0.01": "0.4", "P0.02": "0.5", "P0.03": "0.15", "P0.04": "0.13",
  "P1.01": "1.7", "P1.02": "1.4", "P1.03": "1.4", "P1.04": "1.5",
  "P2.01": "2.1", "P2.02": "2.2", "P2.03": "2.3", "P2.04": "2.1",
  "P3.01": "3.14", "P3.02": "3.2", "P3.03": "3.5", "P3.04": "3.9", "P3.05": "3.11",
  "P4.01": "4.1", "P4.02": "4.1", "P4.03": "4.13", "P4.04": "4.1",
  "P5.01": "5.2", "P5.02": "5.15", "P5.03": "5.17", "P5.04": "5.1",
  "P6.01": "6.6", "P6.02": "6.9", "P6.03": "6.10", "P6.04": "6.8",
  "P7.01": "7.2", "P7.02": "7.3", "P7.03": "7.6", "P7.04": "7.7",
  "P8.01": "8.6", "P8.02": "8.5", "C.03": "8.2", "C.04": "8.2", "C.05": "8.2", "P8.03": "8.4", "P8.04": "8.4",
  "P9.01": "9.1", "P9.02": "9.2", "P9.03": "9.3", "P9.04": "9.9",
  "P10.01": "10.3", "P10.02": "10.6", "P10.03": "10.9", "P10.04": "10.11",
  "P11.01": "11.7", "A.03": "11.4", "A.04": "11.6", "P11.02": "11.8",
  "M1.01": "11.7", "M1.02": "11.8", "M1.03": "11.13", "M1.04": "11.13", "M1.05": "11.7", "M1.06": "11.7", "M1.07": "11.13",
  "P12.01": "12.3", "B.02": "12.19", "B.03": "12.2",
  "M2.01": "11.5", "M2.02": "11.5", "M2.03": "12.16", "M2.04": "13.6", "M2.05": "12.10", "M2.06": "12.12", "M2.07": "12.2",
  "M2.08": "12.2", "M2.09": "12.3", "M2.10": "13.6", "M2.11": "13.6", "M2.12": "13.6", "M2.13": "12.2", "M2.14": "12.8",
  "M3.01": "12.5", "M3.02": "12.5", "M3.03": "12.5", "M3.04": "12.5", "M3.05": "13.8", "M3.06": "13.8", "M3.07": "8.5",
  "M3.08": "8.5", "M3.09": "12.6", "M3.10": "12.4", "M3.11": "13.18", "M3.12": "13.18", "P12.02": "13.14",
  "P13.01": "13.17", "M4.01": "13.1", "M4.02": "13.16", "M4.03": "13.9", "M4.04": "13.9", "M4.05": "13.9", "M4.06": "13.9",
  "M4.07": "13.8", "M4.08": "13.8", "M4.09": "13.8", "M4.10": "13.8", "M4.11": "13.6", "M4.12": "13.19",
  "M4.13": "13.9", "M4.14": "13.9", "M4.15": "13.9", "M4.16": "13.9",
  "P13.03": "13.9", "P13.04": "13.6", "P13.05": "13.9", "P13.06": "13.9", "P13.07": "13.9", "P13.08": "13.5",
  "P13.09": "13.9", "P13.10": "13.20", "P13.11": "13.20", "P13.12": "13.9", "P13.02": "13.9",
  "P14.01": "14.2", "P14.02": "14.3", "P14.03": "14.6", "P14.04": "14.5",
  "P15.01": "15.1", "P15.02": "15.4", "P15.03": "15.4", "P15.04": "15.12",
};

/** Rader utan bra motsvarighet i checklistan (ligger under närmaste punkt). */
export const SVAG_KOPPLING = new Set(["C.03", "C.04", "C.05", "M1.03", "M1.05", "M1.06", "M1.07"]);

const BOKSTAVER = "abcdefghijklmnopqrstuvwxyz";

/** Kontrollradens id → visat nummer ("M2.05" → "12.10a"). */
export const KONTROLL_NR = (() => {
  const ut = new Map();
  const per = new Map();
  const rader = [...PROJEKTMALLAR.flatMap((m) => m.punkter), ...FALTMALLAR.flatMap((m) => m.punkter)];
  for (const p of rader) {
    if (ut.has(p.id)) continue;
    const forald = KONTROLL_FORALDER[p.id];
    if (!forald) continue;
    const i = per.get(forald) || 0;
    per.set(forald, i + 1);
    ut.set(p.id, `${forald}${BOKSTAVER[i]}`);
  }
  return ut;
})();

/** Visat nummer för en kontrollrad. Okända id visas som de är. */
export const kontrollNr = (id) => KONTROLL_NR.get(id) || id;

/** Rubrik för ett mallmoment. Projektchecklistans moment har checklistans
 *  nummer 0–15; de tekniska mallarna (1–4) är egna mallar, inte moment. */
export const mallEtikett = (m) => `${String(m?.id || "").startsWith("projekt-") ? "Moment" : "Mall"} ${m?.nr}`;
