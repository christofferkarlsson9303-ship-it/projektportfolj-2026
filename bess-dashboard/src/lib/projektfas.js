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

/** Antal faser i följd, från fas 1, som är godkända. */
export function godkandaFaser(u) {
  let n = 0;
  while (n < FAS_ANTAL && fasKrav(u, n + 1).klar) n += 1;
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

/** Hur många faser rapporten för ledningen omfattar: de godkända faserna, eller för ett
 *  projekt som redan är igång faserna före golvet. Fas 1 till och med det här talet ingår. */
export function rapportFas(u) {
  const golv = arFasNr(u.fasGolv) ? u.fasGolv : 1;
  return Math.max(godkandaFaser(u), golv - 1);
}

/** Det som spärrar PDF-export för inlämning. Rapporten omfattar godkända faser, så den
 *  spärras bara när ingen fas är godkänd än. Listan är det som återstår i fas 1: obligatoriska
 *  fält och tabeller, och de kritiska kontrollpunkterna samlade per sida. Tom lista betyder
 *  att PDF:en får exporteras. */
export function pdfSparr(u) {
  if (rapportFas(u) >= 1) return [];
  const k = fasKrav(u, 1);
  const perSida = new Map();
  for (const p of k.punkter) perSida.set(p.stegId, { titel: p.stegTitel, antal: (perSida.get(p.stegId)?.antal ?? 0) + 1 });
  return [
    ...k.falt,
    ...k.tabeller,
    ...[...perSida].map(([stegId, s]) => ({ stegId, id: `kp-${stegId}`, etikett: `${s.titel}: ${s.antal} ${s.antal === 1 ? "kritisk kontrollpunkt" : "kritiska kontrollpunkter"}` })),
  ];
}

export const fasTitel = (nr) => (nr === null || nr === undefined ? "Klart" : faseInfo(nr).kort);
