/* ABT 06-frister för påminnelser — samma regler som Idag-vyn
   (src/lib/agenda.js: fristrader), men utan beroenden så att modulen går att
   köra i en Edge Function (Deno, UTC) lika väl som i appen.

   Datum utan klockslag ("2026-09-28") är midnatt svensk tid, precis som i
   webbläsaren. I en Edge Function går klockan i UTC, så tidszonen räknas ut
   explicit. Ett test (supabase/tests/frister.test.js) jämför modulen mot
   fristrader så att de inte glider isär. */

export const TIDSZON = "Europe/Stockholm";

/** Förskjutning mot UTC i minuter för en tidpunkt i given zon. */
function forskjutning(ms, zon) {
  const del = new Intl.DateTimeFormat("en-US", {
    timeZone: zon,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(new Date(ms))
    .reduce((a, p) => ((a[p.type] = p.value), a), {});
  const somUtc = Date.UTC(+del.year, +del.month - 1, +del.day, +del.hour, +del.minute, +del.second);
  return Math.round((somUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** Tidpunkt i ms för ett datum eller en tidsstämpel. Datum utan klockslag
 *  tolkas som lokal midnatt i zonen. */
export function tidpunkt(varde, zon = TIDSZON) {
  if (!varde) return null;
  const s = String(varde);
  if (s.length <= 10) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const gissning = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    let ms = gissning - forskjutning(gissning, zon) * 60000;
    ms = gissning - forskjutning(ms, zon) * 60000; // rätt över sommartidsskifte
    return ms;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** Hela timmar sedan en tidpunkt, avrundat som i appen. */
export function timmarSedan(varde, nuMs, zon = TIDSZON) {
  const t = tidpunkt(varde, zon);
  return t === null ? null : Math.round((nuMs - t) / 3600000);
}

const STANGD = new Set(["stangd", "utgar"]);
const INCIDENTNAMN = { tillbud: "Tillbud", olycka: "Olycka", miljo: "Miljöincident" };

function niva(h) {
  if (h === null) return "oklar";
  if (h > 24) return "forfallen";
  return h >= 12 ? "akut" : "snart";
}

/**
 * Löpande frister: ÄTA-underrättelse inom 24 h (ABT 06 kap. 2 § 7, kap. 5 § 4)
 * och incidentrapport inom 24 h.
 * @param {{ur?: object[], hseqIncidenter?: object[]}} state
 * @returns {{nyckel:string, id:string, typ:string, niva:string, pid:string|null,
 *            titel:string, timmar:number|null, kvar:number|null, text:string}[]}
 */
export function fristlage(state, nuMs = Date.now(), zon = TIDSZON) {
  const ut = [];

  for (const u of state.ur || []) {
    if (STANGD.has(u.status) || u.klass === "utgar") continue;
    if (u.underrattelseDatum) continue;
    const h = u.handelseDatum ? timmarSedan(u.handelseDatum, nuMs, zon) : null;
    const n = niva(h);
    ut.push({
      nyckel: `ur:${u.id}`,
      id: u.id,
      typ: "ÄTA-underrättelse",
      niva: n,
      pid: u.projektId ?? null,
      titel: `${u.nr || ""} ${u.benamning || ""}`.trim(),
      timmar: h,
      kvar: h === null ? null : 24 - h,
      text:
        n === "oklar"
          ? "Händelsedatum saknas — fristen kan inte räknas"
          : n === "forfallen"
            ? `Underrättelse saknas — ${Math.floor(h / 24)} dygn sedan händelsen`
            : `Underrättelse ska skickas inom ${24 - h} h`,
    });
  }

  for (const i of state.hseqIncidenter || []) {
    if (i.rapporterad) continue;
    const h = timmarSedan(i.datum, nuMs, zon);
    // Som i appen: en incident utan datum räknas som akut — den ska rapporteras.
    const n = h !== null && h > 24 ? "forfallen" : "akut";
    ut.push({
      nyckel: `inc:${i.id}`,
      id: i.id,
      typ: "Incidentrapport",
      niva: n,
      pid: i.projektId ?? null,
      titel: `${INCIDENTNAMN[i.typ] || "Incident"} ${i.datum || ""}`.trim(),
      timmar: h,
      kvar: h === null ? null : 24 - h,
      text:
        h === null
          ? "Datum saknas — rapportera incidenten"
          : n === "forfallen"
            ? `Rapport saknas — ${Math.floor(h / 24)} dygn sedan händelsen`
            : `Rapport ska skickas inom ${Math.max(0, 24 - h)} h`,
    });
  }

  return ut;
}

/** Nivåer som ger påminnelse. "snart" (mer än 12 h kvar) och "oklar" gör det inte. */
export const PAMINN_NIVAER = new Set(["akut", "forfallen"]);

/** Påminnelser att skicka: akuta och förfallna frister. */
export function paminnelser(state, nuMs = Date.now(), zon = TIDSZON) {
  return fristlage(state, nuMs, zon).filter((f) => PAMINN_NIVAER.has(f.niva));
}

/** Ämne och text för ett utskick. Förfallet först, sedan minst tid kvar. */
export function meddelande(lista, projekt = [], appUrl = "") {
  const namn = new Map(projekt.map((p) => [p.id, p.namn || p.id]));
  const sorterad = [...lista].sort(
    (a, b) => (a.niva === "forfallen" ? 0 : 1) - (b.niva === "forfallen" ? 0 : 1) || (a.kvar ?? 0) - (b.kvar ?? 0)
  );
  const forfallna = sorterad.filter((f) => f.niva === "forfallen").length;
  const amne = forfallna
    ? `ABT 06: ${forfallna} frist${forfallna > 1 ? "er" : ""} passerad${forfallna > 1 ? "e" : ""}`
    : `ABT 06: ${sorterad.length} frist${sorterad.length > 1 ? "er" : ""} går ut inom 12 h`;
  const rader = sorterad.map(
    (f) =>
      `${f.niva === "forfallen" ? "PASSERAD" : "AKUT"} · ${f.typ} · ${namn.get(f.pid) || f.pid || "—"} · ${f.titel}\n  ${f.text}`
  );
  const text = [
    amne,
    "",
    ...rader,
    "",
    "Missad underrättelse kan kosta rätten till ersättning (ABT 06 kap. 2 § 7).",
    appUrl ? `Öppna Idag: ${appUrl}` : "",
  ]
    .filter((r, i, a) => r !== "" || a[i - 1] !== "")
    .join("\n")
    .trim();
  return { amne, text };
}
