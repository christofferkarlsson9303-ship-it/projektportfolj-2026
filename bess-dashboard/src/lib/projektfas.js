import { STEG } from "../data/projektstartSteg.js";
import { FAS_ANTAL, FASER, arFasNr, faseInfo } from "../data/projektfaser.ts";
import { arAvbockad, stegPunkter } from "./stegpunkter.js";

/* Fas- och låslogik för Projektstart. Allt här är rena funktioner över utkastet.

   Projektet startar i fas 1. En fas är godkänd när allt obligatoriskt i den är
   klart: obligatoriska fält, tabeller som kräver en ifylld rad och alla kritiska
   kontrollpunkter. Först då låses nästa fas upp och projektets status följer med.
   `fasGolv` är den lägsta fasen ett utkast kan ha. Det används för projekt som
   redan är igång och vars tidigare faser aldrig fylldes i här. */

export const stegIFas = (nr) => STEG.filter((s) => s.fas === nr);

/** Avropsbeslutet "Tacka nej" gör anbudet till ett förlorat anbud: bara fas 1 gäller, med en orsak. */
export const arEjVunnetUtkast = (u) => u.v?.beslut === "Tacka nej";

/** Fält som bara visas vid ett visst värde i ett annat fält (`visaNar`) räknas bara då. */
export const faltSynligt = (f, u) => !f.visaNar || u.v?.[f.visaNar.id] === f.visaNar.varde;

const ifylld = (v, f) => {
  const t = typeof v === "string" ? v.trim() : "";
  return f.kravVarde ? t === f.kravVarde : t !== "";
};

/** Vad som återstår i en fas. `falt` och `tabeller` är obligatoriska inmatningar,
 *  `punkter` är kritiska kontrollpunkter som inte är bockade. */
export function fasKrav(u, nr) {
  if (arEjVunnetUtkast(u)) return ejVunnetKrav(u, nr);
  const falt = [];
  const tabeller = [];
  let totalt = 0;
  for (const s of stegIFas(nr)) {
    for (const f of s.falt || []) {
      if (!f.obligatoriskt || !faltSynligt(f, u)) continue;
      totalt += 1;
      if (!ifylld(u.v?.[f.id], f)) falt.push({ stegId: s.id, stegTitel: s.titel, id: f.id, etikett: f.etikett });
    }
    if (s.tabell?.obligatorisk) {
      totalt += 1;
      const rader = u.rader?.[s.tabell.id] || [];
      if (!rader.some((r) => s.tabell.obligatorisk.every((k) => (r[k] || "").trim()))) {
        tabeller.push({ stegId: s.id, stegTitel: s.titel, id: s.tabell.id, etikett: `${s.tabell.titel}: minst en ifylld rad` });
      }
    }
  }
  const kritiska = stegIFas(nr).flatMap((s) => stegPunkter(s).filter((p) => p.kritisk).map((p) => ({ ...p, stegId: s.id, stegTitel: s.titel })));
  const punkter = kritiska.filter((p) => !arAvbockad(u, p));
  totalt += kritiska.length;
  const oppna = falt.length + tabeller.length + punkter.length;
  return { nr, falt, tabeller, punkter, totalt, klara: totalt - oppna, faltKlart: !falt.length && !tabeller.length, klar: oppna === 0 };
}

/** Ett förlorat anbud kräver bara ett projektnamn och en orsak. Fas 2–8 finns inte för det. */
function ejVunnetKrav(u, nr) {
  const falt = [];
  if (nr === 1) {
    for (const s of stegIFas(1)) {
      for (const f of s.falt || []) {
        if ((f.id === "namn" || f.id === "orsakEjVunnet") && !ifylld(u.v?.[f.id], f)) falt.push({ stegId: s.id, stegTitel: s.titel, id: f.id, etikett: f.etikett });
      }
    }
  }
  const totalt = nr === 1 ? 2 : 0;
  return { nr, falt, tabeller: [], punkter: [], totalt, klara: totalt - falt.length, faltKlart: !falt.length, klar: nr === 1 && !falt.length };
}

/** Obligatoriska punkter på en enskild guidesida: hur många som finns och hur många som är klara. */
export function stegKrav(u, steg) {
  let totalt = 0;
  let oppna = 0;
  for (const f of steg.falt || []) {
    if (!f.obligatoriskt || !faltSynligt(f, u)) continue;
    totalt += 1;
    if (!ifylld(u.v?.[f.id], f)) oppna += 1;
  }
  if (steg.tabell?.obligatorisk) {
    totalt += 1;
    const rader = u.rader?.[steg.tabell.id] || [];
    if (!rader.some((r) => steg.tabell.obligatorisk.every((k) => (r[k] || "").trim()))) oppna += 1;
  }
  const kritiska = stegPunkter(steg).filter((p) => p.kritisk);
  totalt += kritiska.length;
  oppna += kritiska.filter((p) => !arAvbockad(u, p)).length;
  return { totalt, klara: totalt - oppna };
}

/** Antal faser i följd, från fas 1, som är godkända. */
export function godkandaFaser(u) {
  let n = 0;
  while (n < FAS_ANTAL && fasKrav(u, n + 1).klar && (n > 0 || arEjVunnetUtkast(u) || u.fasGolv >= 2 || u.v?.anbudsutfall === "Vunnet anbud")) n += 1;
  return n;
}

/** Projektets aktuella fas: den första som inte är godkänd, aldrig lägre än golvet. */
export function aktuellFas(u) {
  if (arEjVunnetUtkast(u)) return 1;
  const golv = arFasNr(u.fasGolv) ? u.fasGolv : 1;
  return Math.min(FAS_ANTAL, Math.max(golv, godkandaFaser(u) + 1));
}

/** Alla faser är godkända, projektet är genom hela flödet. */
export const alltGodkant = (u) => godkandaFaser(u) === FAS_ANTAL;

/** En guidesida i en fas som inte är upplåst. Sista sidan hör till ingen fas och är alltid öppen. */
export const stegLast = (u, steg) => steg.fas !== null && steg.fas > aktuellFas(u);

/** Läget per fas: "klar", "upplast" (passerad men inte helt godkänd), "aktuell" eller "last". */
export function fasLage(u) {
  const nu = aktuellFas(u);
  const klarAllt = alltGodkant(u);
  return FASER.map((f) => {
    const k = fasKrav(u, f.nr);
    const status = f.nr > nu ? "last" : f.nr === nu && !(klarAllt && f.nr === FAS_ANTAL) ? "aktuell" : k.klar ? "klar" : "upplast";
    return { nr: f.nr, kort: f.kort, titel: f.titel, status, klara: k.klara, totalt: k.totalt };
  });
}

/** Hur många faser rapporten för ledningen omfattar: alla upplåsta faser, alltså fas 1 till och med
 *  projektets aktuella fas (för ett projekt som redan är igång också faserna före golvet).
 *  Rapporten visar det som står i guiden just nu, även om aktuell fas inte är godkänd än. */
export function rapportFas(u) {
  return aktuellFas(u);
}

/** Det som återstår för att godkänna aktuell fas: obligatoriska fält och tabeller, och de kritiska
 *  kontrollpunkterna samlade per sida. Spärrar ingenting — PDF:en får alltid laddas ned — men visas
 *  i guiden och gör att PDF:en märks som utkast. Tom lista betyder att aktuell fas är godkänd. */
export function pdfKvar(u) {
  const k = fasKrav(u, aktuellFas(u));
  const perSida = new Map();
  for (const p of k.punkter) perSida.set(p.stegId, { titel: p.stegTitel, antal: (perSida.get(p.stegId)?.antal ?? 0) + 1 });
  return [
    ...k.falt,
    ...k.tabeller,
    ...[...perSida].map(([stegId, s]) => ({ stegId, id: `kp-${stegId}`, etikett: `${s.titel}: ${s.antal} ${s.antal === 1 ? "kritisk kontrollpunkt" : "kritiska kontrollpunkter"}` })),
  ];
}

/** PDF:en är ett utkast så länge aktuell fas inte är godkänd. */
export const pdfArUtkast = (u) => pdfKvar(u).length > 0;

export const fasTitel = (nr) => (nr === null || nr === undefined ? "Klart" : faseInfo(nr).kort);

