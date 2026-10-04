/* ÄTA-kalkylen — rader på ett befintligt ÄTA-ärende (docs/prototyp-36037.md).

   Per rad:
     summa = antal × á-pris × (1 + övertid % / 100) × (1 + påslag % / 100)

   - Arbete och maskin: övertid 0, 50 eller 100 %. Påslag 0.
   - Fordon (km): inget tillägg.
   - Material och UE: antal är faktisk kostnad i kronor, á-pris 1, påslag
     10 % — ABT 06 kap. 6 § 9, samma regel som fakturaunderlaget.
   - En rad som är tid ur tidrapporten bär tidrapportens tidslag (faktor
     1 / 1,5 / 2 / 3) i stället för ett eget övertidsfält.

   Raderna ligger på ÄTA-posten i `kalkyl.rader`, i samma `kalkyl`-objekt som
   originalverktyget använde. En post som fortfarande har originalets kalkyl
   (arbete/maskin/kostnad/km) läses om till rader, så att inget går förlorat. */

import { byggCsvFranKolumner } from "./export.js";
import { idag } from "./datum.js";
import { ARVODE_PROCENT, aktivitet, person } from "./planering.js";
import { KM_PRIS, KOSTNADSTYP, OVERTID } from "../data/konstanter.js";

export const MOMS_PROCENT = 25;
export const OVERTID_VAL = [0, 50, 100];

const tal = (v) => Number(v) || 0;

/** Kategorier där övertid och påslag inte gäller. */
export const utanOvertid = (kategori) => kategori === "fordon" || kategori === "material";

/** Faktorn för tid: tidslaget när raden kommer ur tidrapporten, annars övertidsprocenten. */
export const radFaktor = (r) => (r.faktor ? tal(r.faktor) : 1 + tal(r.ot) / 100);

/** Radens summa i kronor, oavrundad. */
export function radSumma(r) {
  return tal(r.antal) * tal(r.apris) * radFaktor(r) * (1 + tal(r.paslag) / 100);
}

/** Netto, moms och att betala, i hela kronor. */
export function kalkylSummor(rader) {
  const netto = Math.round((rader || []).reduce((s, r) => s + radSumma(r), 0));
  const moms = Math.round((netto * MOMS_PROCENT) / 100);
  return { netto, moms, attBetala: netto + moms };
}

/** Tidslagets text ur tidrapporten, t.ex. "Övertid 50 %". */
export const tidslagText = (faktor) =>
  (OVERTID.find(([f]) => f === Number(faktor)) || [0, "Normaltid"])[1].split(" (")[0];

let lopnummer = 0;
const nyttId = () => `kr${Date.now().toString(36)}${(lopnummer++).toString(36)}`;

/** En ny rad med resursens pris och kategorins regler. */
export function nyKalkylRad(resurs, { datum = idag(), beskrivning = "" } = {}) {
  const kategori = resurs?.kategori || "arbete";
  return {
    id: nyttId(),
    datum,
    beskrivning,
    resurs: resurs?.namn || "",
    kategori,
    enhet: resurs?.enhet || (kategori === "material" ? "kr" : kategori === "fordon" ? "km" : "tim"),
    antal: 0,
    apris: resurs ? resurs.apris : kategori === "material" ? 1 : 0,
    ot: 0,
    paslag: resurs ? resurs.paslag : kategori === "material" ? ARVODE_PROCENT : 0,
  };
}

/** Byter resurs på en rad: pris, enhet och regler följer den nya resursen. */
export function medResurs(rad, resurs) {
  return {
    ...rad,
    resurs: resurs.namn,
    kategori: resurs.kategori,
    enhet: resurs.enhet,
    apris: resurs.apris,
    paslag: resurs.paslag,
    ot: utanOvertid(resurs.kategori) ? 0 : rad.ot || 0,
  };
}

/* ---------- Originalets kalkyl → rader ---------- */

const harGammalKalkyl = (k) =>
  !!k && (Array.isArray(k.arbete) || Array.isArray(k.maskin) || Array.isArray(k.kostnad) || tal(k.km) > 0);

/** Övertidsfaktor i originalet → procent. Storhelg (3) har ingen procent och behåller faktorn. */
const otTillProcent = (f) => ({ 1: 0, 1.5: 50, 2: 100 })[tal(f) || 1];

/** Originalverktygets kalkyl ({arbete, maskin, kostnad, km, arvode}) som rader, med samma belopp. */
export function franGammalKalkyl(k) {
  const datum = k.uppdaterad || "";
  const arvode = k.arvode ?? 12;
  const rader = [];
  (k.arbete || []).forEach((r, i) => {
    const procent = otTillProcent(r.ot);
    rader.push({
      id: `gammal-arbete-${i}`, datum, beskrivning: "", resurs: r.roll || "Arbete", kategori: "arbete", enhet: "tim",
      antal: tal(r.timmar), apris: tal(r.apris), ot: procent ?? 0, ...(procent === undefined ? { faktor: tal(r.ot) } : {}), paslag: 0,
    });
  });
  (k.maskin || []).forEach((r, i) => {
    rader.push({
      id: `gammal-maskin-${i}`, datum, beskrivning: r.text || "", resurs: r.text || "Maskin", kategori: "maskin", enhet: "tim",
      antal: tal(r.timmar), apris: tal(r.apris), ot: 0, paslag: arvode,
    });
  });
  (k.kostnad || []).forEach((r, i) => {
    rader.push({
      id: `gammal-kostnad-${i}`, datum, beskrivning: r.text || "",
      resurs: (KOSTNADSTYP.find(([v]) => v === r.typ) || [null, "Material"])[1], kategori: "material", enhet: "kr",
      antal: tal(r.belopp), apris: 1, ot: 0, paslag: arvode,
    });
  });
  if (tal(k.km) > 0) {
    rader.push({
      id: "gammal-km", datum, beskrivning: "", resurs: "Servicebil / Personbil", kategori: "fordon", enhet: "km",
      antal: tal(k.km), apris: KM_PRIS, ot: 0, paslag: 0,
    });
  }
  return rader;
}

/** Kalkylraderna på en ÄTA-post. */
export function kalkylRader(u) {
  const k = u?.kalkyl;
  if (Array.isArray(k?.rader)) return k.rader;
  if (harGammalKalkyl(k)) return franGammalKalkyl(k);
  return [];
}

/* ---------- Tid ur tidrapporten ---------- */

/** Tidrader märkta med ärendets nummer som ännu inte ligger i kalkylen. */
export function tidrapportRader(state, u) {
  const finns = new Set(kalkylRader(u).map((r) => r.tidradId).filter(Boolean));
  return (state.tidrader || [])
    .filter((t) => t.ataRef && t.ataRef === u.nr && t.projektId === u.projektId && !finns.has(t.id))
    .map((t) => {
      const m = person(state, t.personId);
      return {
        id: `kt-${t.id}`,
        tidradId: t.id,
        datum: t.datum || "",
        beskrivning: t.notering || aktivitet(state, t.aktivitetId)?.namn || "",
        resurs: m ? m.namn : "Okänd medarbetare",
        kategori: "arbete",
        enhet: "tim",
        antal: tal(t.timmar),
        apris: m ? tal(m.apris) : 0,
        ot: 0,
        faktor: Number(t.ot) || 1,
        paslag: 0,
      };
    });
}

/* ---------- CSV ---------- */

const decimal = (n) => String(Math.round(tal(n) * 100) / 100).replace(".", ",");

/** CSV för Excel: semikolon och UTF-8 BOM, samma kolumner som avin. */
export function kalkylCsv(rader) {
  return byggCsvFranKolumner(
    [
      { rubrik: "Datum", exportVarde: (r) => r.datum || "" },
      { rubrik: "Beskrivning", exportVarde: (r) => r.beskrivning || "" },
      { rubrik: "Resurs", exportVarde: (r) => r.resurs || "" },
      { rubrik: "Antal", exportVarde: (r) => decimal(r.antal) },
      { rubrik: "ÖT %", exportVarde: (r) => decimal((radFaktor(r) - 1) * 100) },
      { rubrik: "Påslag %", exportVarde: (r) => decimal(r.paslag) },
      { rubrik: "Summa", exportVarde: (r) => decimal(radSumma(r)) },
    ],
    rader
  );
}
