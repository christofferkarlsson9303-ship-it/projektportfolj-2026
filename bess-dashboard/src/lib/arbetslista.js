/* Arbetslista – BESS i klartext.

   Målet: en tioåring ska förstå vad som ska göras. Därför visar
   arbetslistan bara det montören behöver på platsen:

   - stegets nummer och namn
   - vad man gör, en mening per rad, i ordning
   - vem som gör det
   - "Tänk på" när underlaget har en säkerhets- eller kontrollnotis
   - en ruta för klart, datum och namn

   STOPP-steg ritas annorlunda: man väntar tills arbetsledaren skrivit under.

   Projektledarens egna fält (EPC-koppling, mallrevision, källstatus, tomma
   fält för ritning och serienummer) står inte i stegen. Dokumentnummer,
   mallrevision och källa står i sidfoten, så spårbarheten finns kvar.
   Egenkontrollen är oförändrad och har kvar alla fält.

   Samma funktioner används av utskriften (PrintableTodoList) och PDF:en
   (EgenkontrollPdf), så papperet ser likadant ut oavsett väg. */

/** Reglerna överst på första sidan. Korta meningar, inga facktermer. */
export const SA_HAR_GOR_DU = [
  "Gör stegen i ordning, uppifrån och ned.",
  "Kryssa i rutan när steget är klart. Skriv datum och ditt namn.",
  "STOPP betyder vänta. Gå inte vidare förrän arbetsledaren har skrivit under.",
  "Är du osäker? Fråga arbetsledaren innan du gör något.",
  "Stå aldrig under en hängande last.",
  "Elarbete, lyft och arbete på höjd: bara med rätt utbildning och tillstånd.",
];

export const VID_FARA = "Olycka eller fara: ring 112. Ring sedan arbetsledaren.";

/** Är steget en stoppunkt? Titeln börjar med "STOPP". */
export function arStopp(p) {
  return /^STOPP\b/i.test(String(p?.titel || "").trim());
}

/** Titeln utan "STOPP –", eftersom STOPP-märket står för sig. */
export function stegTitel(p) {
  const t = String(p?.titel || "").replace(/^STOPP\s*[–-]\s*/i, "").trim();
  return t.charAt(0).toLocaleUpperCase("sv") + t.slice(1);
}

/** Delar en instruktion i meningar, en per rad. Förkortningar som "t.ex."
 *  och "kap." delar inte. Tom text ger en tom lista. */
export function meningar(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  const skyddat = t.replace(/\b(t\.ex|bl\.a|kap|ca|resp|s\.k|m\.fl|osv|inkl|exkl|enl|nr)\./gi, (m) => m.replace(/\./g, "\uE000"));
  return skyddat
    .split(/(?<=[.!?])\s+(?=[A-ZÅÄÖ0-9"„(])/u)
    .map((s) => s.replace(/\uE000/g, ".").trim())
    .filter(Boolean);
}

/** Vem gör steget. Faller tillbaka på momentets utförare. */
export function vem(p, moment) {
  return String(p?.roll || moment?.utforare || "").trim();
}

/** Rubriken för ett moment: "Lag B – DC-kablar och anslutningar". */
export function momentRubrik(m) {
  return String(m?.titel || "").trim();
}

/** Sidfotens spårbarhet: dokumentnummer, mallrevision och källa. */
export function sidfot(d) {
  return [d?.dokumentNr, d?.revision ? `Mallrevision ${d.revision}` : "", d?.kalla].filter(Boolean).join(" · ");
}
