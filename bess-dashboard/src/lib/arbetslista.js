import { MONTOR } from "../data/montortext.js";

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

   Moment med montörtext (data/montortext.js) visar i stället bara montörens
   steg, i arbetsordning och med korta meningar. Projektledarens rader
   (kvittenser, samordning) kommer inte med; de står kvar i egenkontrollen.

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

/** Montörtexten för ett mallmoment, eller null. Bara projektchecklistans
 *  moment ("projekt-12") kan ha montörtext. */
export function montorMoment(m) {
  const id = String(m?.id || "");
  if (!id.startsWith("projekt-") || m?.profil !== "catl-pe") return null;
  return MONTOR[Number(id.slice("projekt-".length))] || null;
}

/** Rubriken för ett moment: "Moment 12 – Koppla in batterier och växelriktare". */
export function momentRubrik(m) {
  const mt = montorMoment(m);
  if (mt) return `Moment ${m.nr} – ${mt.rubrik}`;
  return String(m?.titel || "").trim();
}

/** "Börja när" och "Var" för momentet. Montörtexten går före mallens text. */
export function momentBorja(m) {
  return montorMoment(m)?.borja || m?.flode || "";
}
export function momentVar(m) {
  return montorMoment(m)?.var || m?.utrustning || "";
}

/**
 * Stegen på arbetslistan: { p, titel, gor, tank, vem, matt, stopp }.
 * Med montörtext: bara montörens steg i arbetsordning. Utan: alla rader med
 * instruktionen delad i meningar, som förut.
 */
export function arbetsSteg(m) {
  const mt = montorMoment(m);
  const punkter = m?.punkter || [];
  if (!mt) return punkter.map((p) => ({ p, titel: stegTitel(p), gor: meningar(p.instruktion), tank: p.verifiering || "", vem: vem(p, m), matt: "", stopp: arStopp(p) }));
  const per = new Map(punkter.map((p) => [p.id, p]));
  return mt.steg.filter((s) => per.has(s.id)).map((s) => ({
    p: per.get(s.id), titel: s.titel, gor: s.gor, tank: "", vem: "", matt: s.matt || "", stopp: s.stopp ?? arStopp(per.get(s.id)),
  }));
}

/** Sidfotens spårbarhet: dokumentnummer, mallrevision och källa. */
export function sidfot(d) {
  /* Montörens lista: källtexten (AC2C, workshopantaganden) hör till projektledaren. */
  const montor = d?.moment?.length && !d.uppgifter?.length && d.moment.every((m) => montorMoment(m));
  return [d?.dokumentNr, d?.revision ? `Mallrevision ${d.revision}` : "", montor ? "" : d?.kalla].filter(Boolean).join(" · ");
}
