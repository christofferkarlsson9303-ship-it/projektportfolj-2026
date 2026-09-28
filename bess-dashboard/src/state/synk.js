/* Rena hjälpfunktioner för synken mot delad lagring. Ligger utanför
   PortfolioProvider så att de går att testa utan React och Supabase. */

/** Samma nyckel som reducern använder för att känna igen en loggpost. */
export const loggNyckel = (p) => `${p.ts}|${p.text}`;

/**
 * Loggposter som ska skickas upp: skapade här, nyare än gränsen och inte
 * redan kända från servern.
 *
 * Tidigare räckte det att posten var nyare än gränsen. Men poster som andra
 * skrivit kommer in via realtid och hamnar i samma lista — de skickades då
 * upp igen, och databasen satte den här användarens adress som avsändare.
 * Varje post dubblerades en gång per ansluten användare, i fel namn.
 *
 * @param {Array<{ts:string,text:string}>} logg lokala loggen, nyast först
 * @param {string} granse ts för senaste posten som nått tabellen
 * @param {Set<string>} kanda nycklar för poster som redan finns i tabellen
 */
export function nyaLoggposter(logg, granse, kanda) {
  return (logg || []).filter((p) => p.ts > granse && !kanda.has(loggNyckel(p)));
}

/**
 * Sorterar ett fel från en skrivning.
 * - "nekad": behörighetsreglerna sa nej (adapterns kod, eller Postgres 42501
 *   när RLS stoppar en INSERT)
 * - "konflikt": någon annan har sparat sedan vi läste
 * - "annat": nätverk, tidsgräns, serverfel — ändringen ska INTE rullas tillbaka
 */
export function feltyp(e) {
  const kod = e && e.code;
  if (kod === "nekad" || kod === "42501") return "nekad";
  if (kod === "konflikt") return "konflikt";
  return "annat";
}

/** Text till statusraden efter en sammanslagning. */
export function sammanslagningsText(konflikter) {
  if (!konflikter.length) return "Någon annan sparade samtidigt — ändringarna är sammanslagna";
  return `Någon annan sparade samtidigt — sammanslaget. ${konflikter.length} fält ändrades av er båda; din version gäller, kontrollera`;
}
