/* Kontrollplanens omfattningar per moment (granskning #73).

   Före #73 härleddes de förväntade omfattningarna bara ur registrerade rader: en enhet
   som aldrig fått någon kontroll räknades inte alls. Nu kan projektet lista enheterna
   per moment (projekt.kontrollplan = { "11": ["SKID 1", "SKID 2", …] }). Förväntat är
   planens enheter plus allt som registrerats – en registrerad enhet utanför planen
   faller aldrig bort. */

export const HELA = "Hela anläggningen";

const norm = (s) => String(s ?? "").trim();

/** Text från ett inmatningsfält – en enhet per rad eller kommaseparerat – till en lista. */
export function tolkaOmfattningar(text) {
  const ut = [];
  for (const del of String(text ?? "").split(/[\n,;]+/)) {
    const v = norm(del);
    if (v && !ut.some((x) => x.toLocaleLowerCase("sv") === v.toLocaleLowerCase("sv"))) ut.push(v);
  }
  return ut;
}

/** Planens enheter för ett moment, eller [] när planen inte anger några. */
export function planeradeOmfattningar(projekt, moment) {
  const lista = projekt?.kontrollplan?.[String(moment)];
  return Array.isArray(lista) ? tolkaOmfattningar(lista.join("\n")) : [];
}

/** Förväntade omfattningar: planens först, sedan registrerade som inte finns i planen. */
export function forvantadeOmfattningar(plan, registrerade) {
  const ut = [...plan];
  for (const r of registrerade) {
    const v = norm(r) || HELA;
    if (!ut.some((x) => x.toLocaleLowerCase("sv") === v.toLocaleLowerCase("sv"))) ut.push(v);
  }
  return ut;
}

/** "4 av 6 omfattningar" */
export const tackningText = ({ klara, totalt }) =>
  totalt ? `${klara} av ${totalt} omfattning${totalt === 1 ? "" : "ar"}` : "Ingen omfattning registrerad";
