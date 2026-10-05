/* Tolkning av byggmötesprotokoll — det som sägs på mötet blir punkter i appen.

   Byggd efter beställarens protokollmall (Ingrid Capacity): ett löpande
   protokoll där varje rubrik samlar alla möten under markörer som "SM"
   (startmöte) och "BM 1" … "BM 10". Ansvarigs initialer står i en egen
   kolumn till höger. Tolkningen plockar ut det som hör till ETT möte —
   det med högst nummer, eller det som filnamnet anger.

   Ut kommer:
   - mötets huvud: nummer, datum, plats, närvarande och nästa möte
   - en punkt per stycke under varje rubrik, med appens paragraf (§1–§7)
   - åtgärder: meningar där någon ska göra något, med ansvarig och datum

   Det här är en tolkning av fri text, inte en sanning. Allt visas som
   förslag i Data och backup, och användaren väljer vad som sparas.

   Rader med inloggningsuppgifter (användarnamn, lösenord) tas bort innan
   något annat görs. De ska aldrig hamna i portföljen. */

/** En mening per post. Förkortningar ("t.ex.", "kap.", "ca.", "enl.") och
 *  decimaltal delar inte. */
export function meningar(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  const skyddat = t.replace(/(?<![\p{L}])(t\.ex|bl\.a|kap|ca|resp|s\.k|m\.fl|osv|inkl|exkl|enl|nr|ev|bef|ö\.k)\./giu, (m) => m.replace(/\./g, "\uE000"));
  return skyddat
    .split(/(?<=[.!?])\s+(?=[A-ZÅÄÖ0-9"„(-])/u)
    .map((x) => x.replace(/\uE000/g, ".").trim())
    .filter(Boolean);
}

/* ---------- Mallens rubriker ---------- */

/** Rubrikerna i beställarens mall, med appens paragraf. Ordningen följer mallen. */
export const MALLRUBRIKER = [
  ["1", "Startmöte", "1"],
  ["2", "Organisation & Administration", "1"],
  ["3", "Tider", "3"],
  ["4", "Pågående och planerade arbeten", "3"],
  ["4.1", "Arbetsstyrka", "3"],
  ["5", "Myndigheter & Samordningsfrågor", "1"],
  ["5.1", "Kommun, Länsstyrelse, Arbetsmiljöverket", "1"],
  ["5.2", "Bygglov", "1"],
  ["5.3", "Nätägare", "1"],
  ["5.4", "Sidoentreprenörer", "1"],
  ["5.5", "Underentreprenörer", "1"],
  ["6", "Kvalitet och Miljö", "6"],
  ["6.1", "Avvikelsehantering", "6"],
  ["7", "Arbetsmiljö", "6"],
  ["7.1", "Olyckor och Tillbud", "6"],
  ["7.2", "Skyddsronder", "6"],
  ["8", "Kommunikation", "1"],
  ["9", "Kontrakt och Avtal", "2"],
  ["10", "Ekonomi", "2"],
  ["10.1", "Upparbetat", "2"],
  ["10.2", "Prognos", "2"],
  ["10.3", "ÄTA-arbeten", "4"],
  ["11", "Projektering", "3"],
  ["12", "Produktion & Tekniska frågor", "3"],
  ["13", "Hinder & Störningar", "5"],
  ["14", "Besiktningar", "3"],
  ["15", "Övriga frågor", "7"],
  ["16", "Kommande möten", "7"],
];

/** Paragraf för ett rubriknummer som inte finns i mallen: närmaste huvudrubrik, annars §7. */
function paragrafFor(nr) {
  const exakt = MALLRUBRIKER.find(([n]) => n === nr);
  if (exakt) return exakt[2];
  const huvud = MALLRUBRIKER.find(([n]) => n === String(nr).split(".")[0]);
  return huvud ? huvud[2] : "7";
}

/* ---------- Ordlistor ---------- */

const KANSLIGT = /lösenord|användarnamn|password|inloggningsuppgift|username/i;

const BRUS = [
  /^Docusign Envelope ID:.*$/gim,
  /^Protokoll Startmöte Projekt:.*$/gim,
  /^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/gm,
  /^[\s_\\]{5,}$/gm,
  /^\s*Sida \d+ av \d+\s*$/gim,
];

/** Ordgränser som räknar å, ä och ö som bokstäver — \b gör inte det, så
 *  "återkommer" och "åtgärdar" skulle annars aldrig matcha. */
const F = "(?<![\\p{L}\\p{N}])";
const E = "(?![\\p{L}\\p{N}])";
const ordRe = (alt, flaggor = "iu") => new RegExp(`${F}(?:${alt})${E}`, flaggor);
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Verb och uttryck där någon ska göra något. */
const ATGARD = ordRe(
  "tillkallar|beställer|bokar in|kommer på|görs|utförs|dras|sätts upp|byts|höjer|gräver|stämmer av|stämma av|kontaktar|kontakter|upprättar|upprättas|laddar upp|tar fram|tas fram|återkommer|återkopplar|kompletterar|ombesörjer|samordnar|för dialog|fortsätter|har kontakten|håller kontakt|åtgärdar|åtgärdas|levererar|skickar|monterar|bokar|bokas|kallar|granskar|uppdaterar|ser över|går igenom|sammanställer|jagar|utreder|undersöka|säkerställer|behöver|måste|ska|skall|kommer att"
);

/** Ett påstående om hur något borde vara är ingen åtgärd ("skall detta vara testat"). */
const PASTAENDE = ordRe("(?:ska|skall)\\s+(?:detta\\s+|det\\s+|dessa\\s+)?vara");

/** Det som redan är gjort är inte en åtgärd ("Byggstaketet är nu åtgärdat"). */
const KLART = ordRe("(?:har|hade|är|var|blev)\\s+(?:nu\\s+)?(?:utförd|utförda|klar|klara|åtgärdat|åtgärdad|åtgädat|levererade|bytt|uppladdade|draget|avstämt)");

const BESLUT = ordRe("beslut|beslutades|beslutat|godtages|godtas|godkänns|stängdes|överenskom\\p{L}*");

/** Organisationer som kan stå som ansvarig utan att vara en person. */
const ORGANISATIONER = [
  "One Nordic",
  "Ingrid",
  "Ingrid Capacity",
  "Elleholms",
  "A-Bygg",
  "Harjo",
  "Harju",
  "Spark",
  "Bravida",
  "Techinova",
  "CATL",
  "Securitas",
  "VEAB",
  "Jinert",
  "Structor",
  "Vinnergi",
];

/** Ord som ingår i organisationer och roller, inte i personnamn. */
const ORGORD = new Set(["One", "Nordic", "Ingrid", "Capacity", "AB", "Vinnergi"]);
const ROLLORD = /^(Projektledare|Byggledare|Ombud|Platschef|Arbetsledare|Konstruktör|Elkonstruktör|Besiktningsman|Beställare|Entreprenör|HMS|HSE|KA|Kontrollansvarig|Projektör|Montör|Ledande)$/;

/** Ord som får stå före "BM 3" utan att det är en mötesmarkör ("till BM 2"). */
const REFERENSORD = new Set(["till", "från", "inför", "under", "efter", "sedan", "i", "på", "vid", "se"]);

/* ---------- Hjälpare ---------- */

const ISO = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;

/** Måndagen i ISO-vecka v för år. */
export function veckansMandag(ar, v) {
  const jan4 = new Date(Date.UTC(ar, 0, 4));
  const dag = jan4.getUTCDay() || 7;
  const m = new Date(jan4);
  m.setUTCDate(jan4.getUTCDate() - dag + 1 + (v - 1) * 7);
  return m.toISOString().slice(0, 10);
}

function initialerAv(namn) {
  return namn
    .split(/\s+/)
    .filter(Boolean)
    .map((d) => d[0])
    .join("")
    .toUpperCase();
}

/** Tar bort brus och känsliga rader. Returnerar text och antal borttagna känsliga rader. */
export function stada(text) {
  let t = String(text || "").replace(/\r/g, "").replace(/\\([-_.])/g, "$1");
  for (const re of BRUS) t = t.replace(re, "");
  // "Ingrid Capacity AB" står som sidhuvud, ibland följt av initialer — behåll initialerna.
  t = t.replace(/Ingrid Capacity AB\s*/g, "");
  let dolda = 0;
  const rader = t.split("\n").filter((r) => {
    if (KANSLIGT.test(r)) {
      dolda++;
      return false;
    }
    return true;
  });
  return { text: rader.join("\n").replace(/\n{3,}/g, "\n\n"), dolda };
}

/* ---------- Huvudet ---------- */

/** Närvarande: "Alex Young Projektledare IC KN Henrik Gyllenklo Byggledare IC SA …". */
export function tolkaDeltagare(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return [];
  const namn = /([A-ZÅÄÖ][a-zåäöéü]+(?:-[A-ZÅÄÖ][a-zåäöéü]+)? [A-ZÅÄÖ][a-zåäöéü]+(?:-[A-ZÅÄÖ][a-zåäöéü]+)?)/g;
  const traffar = [...t.matchAll(namn)];
  // Ett namn är bara ett namn om det följs av roll/organisation, inte om det är "One Nordic".
  const personer = traffar.filter((m) => {
    const [a, b] = m[1].split(" ");
    return !ORGORD.has(a) && !ORGORD.has(b) && !ROLLORD.test(a);
  });
  return personer.map((m, i) => {
    const slut = i + 1 < personer.length ? personer[i + 1].index : t.length;
    const rest = t.slice(m.index + m[1].length, slut).trim();
    const listade = rest.match(/(?<![\p{L}])[A-ZÅÄÖ]{2,3}$/u);
    const org = /One Nordic/i.test(rest) ? "One Nordic" : /\bIC\b|Ingrid/i.test(rest) ? "Ingrid Capacity" : "";
    const roll = rest.replace(/(?<![\p{L}])[A-ZÅÄÖ]{2,3}$/u, "").replace(/One Nordic|Ingrid Capacity|\bIC\b/g, "").trim();
    return {
      namn: m[1],
      fornamn: m[1].split(" ")[0],
      roll,
      org,
      var: org === "One Nordic",
      initialer: [...new Set([initialerAv(m[1]), listade ? listade[0] : ""].filter(Boolean))],
    };
  });
}

function huvud(text, filnamn) {
  const fran = (re) => (text.match(re) || [])[1]?.trim() || "";
  const nrFil = (String(filnamn || "").match(/(?:BM|Byggm[öo]te)[\s_-]*(\d{1,3})/i) || [])[1];
  const nrRubrik = fran(/Byggm[öo]te\s+(\d{1,3})\b/i);
  const deltagareText = fran(/Närvarande:\s*([\s\S]*?)(?:Distribution|Protokolluppbyggnad|\n\s*\d{1,2}\s+[A-ZÅÄÖ])/i);
  return {
    nrFil: nrFil ? Number(nrFil) : null,
    nrRubrik: nrRubrik ? Number(nrRubrik) : null,
    datum: fran(/Datum:\s*(\d{4}-\d{2}-\d{2})/i),
    tid: fran(/Tid:\s*([0-9.:–-]+\s*[–-]\s*[0-9.:]+)/i),
    plats: fran(/Plats:\s*([^\n]+)/i),
    deltagareText: deltagareText.replace(/\s+/g, " ").trim(),
  };
}

/* ---------- Rubriker och mötesblock ---------- */

/** Hittar mallens rubriker i texten. Returnerar [{nr, rubrik, start, slut}] i ordning. */
export function hittaRubriker(text) {
  const borjan = Math.max(0, text.search(/Protokolluppbyggnad|Kvarvarande punkter/i));
  const traff = [];
  let fran = borjan;
  for (const [nr, rubrik] of MALLRUBRIKER) {
    const ord = rubrik.split(/\s+/).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+");
    const re = new RegExp(`(?:^|\\n|\\s)${nr.replace(".", "\\.")}\\s+${ord}`, "i");
    const del = text.slice(fran);
    const m = del.match(re);
    if (!m) continue;
    const start = fran + m.index + m[0].indexOf(nr);
    traff.push({ nr, rubrik, start, innehall: start + m[0].trimStart().length });
    fran = start + 1;
  }
  return traff.map((r, i) => ({ ...r, slut: i + 1 < traff.length ? traff[i + 1].start : text.length }));
}

/** Delar en rubriks text i block per möte: [{mote: 0 för SM, n för BM n, text}].
 *  Text före första markören har mote: null — den står kvar från mallen. */
export function moteBlock(text) {
  const re = /(^|[\s.:,;)])(SM|BM\s?(\d{1,3}))(?=\s+[A-ZÅÄÖ0-9"„”\-–(])/g;
  const markorer = [];
  for (const m of text.matchAll(re)) {
    const fore = text.slice(0, m.index + m[1].length).trimEnd();
    const forraOrd = (fore.match(/([A-Za-zÅÄÖåäö]+)$/) || [])[1]?.toLowerCase();
    if (forraOrd && REFERENSORD.has(forraOrd)) continue;
    markorer.push({ start: m.index + m[1].length, langd: m[2].length, mote: m[2] === "SM" ? 0 : Number(m[3]) });
  }
  const ut = [];
  const forst = markorer.length ? markorer[0].start : text.length;
  if (text.slice(0, forst).trim()) ut.push({ mote: null, text: text.slice(0, forst).trim() });
  markorer.forEach((mk, i) => {
    const slut = i + 1 < markorer.length ? markorer[i + 1].start : text.length;
    ut.push({ mote: mk.mote, text: text.slice(mk.start + mk.langd, slut).trim() });
  });
  return ut;
}

/* ---------- Ansvarig och datum ---------- */

function ansvarigI(mening, deltagare, personer, { sist = false } = {}) {
  const kand = [];
  for (const d of deltagare) {
    for (const n of [d.namn, d.fornamn]) {
      const i = mening.search(ordRe(esc(n), "u"));
      if (i >= 0) kand.push({ i, namn: d.namn, var: d.var });
    }
  }
  for (const p of personer) {
    const fornamn = p.namn.split(" ")[0];
    for (const n of [p.namn, fornamn]) {
      const i = mening.search(ordRe(esc(n), "u"));
      if (i >= 0) kand.push({ i, namn: p.namn, var: !!p.var });
    }
  }
  for (const o of ORGANISATIONER) {
    const i = mening.search(ordRe(esc(o), "u"));
    if (i >= 0) kand.push({ i, namn: o, var: o === "One Nordic" });
  }
  // Mallens "E" (entreprenör) och "B" (beställare) först i meningen.
  if (/^E\s/.test(mening)) kand.push({ i: 0, namn: "One Nordic", var: true });
  if (/^B\s/.test(mening)) kand.push({ i: 0, namn: "Ingrid Capacity", var: false });
  if (!kand.length) return null;
  // Den som står först i meningen är oftast den som gör något ("Christoffer stämmer av med A-Bygg").
  // Med sist: den som nämns sist — det är den ett "De" i nästa mening syftar på.
  kand.sort((a, b) => (sist ? b.i - a.i : a.i - b.i) || b.namn.length - a.namn.length);
  return kand[0];
}

function datumI(mening, moteDatum) {
  for (const m of mening.matchAll(ISO)) if (!moteDatum || m[0] >= moteDatum) return { datum: m[0], kalla: "datum" };
  const v = mening.match(/\b(?:v\.?|vecka)\s?(\d{1,2})\b/i);
  if (v && moteDatum) {
    // "Senast v.41" betyder veckans slut — fredagen.
    const fredag = (ar) => {
      const d = new Date(veckansMandag(ar, Number(v[1])) + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 4);
      return d.toISOString().slice(0, 10);
    };
    const ar = Number(moteDatum.slice(0, 4));
    const d = fredag(ar);
    return { datum: d >= moteDatum ? d : fredag(ar + 1), kalla: "vecka" };
  }
  return null;
}

/** Initialer som står fritt i ett block ("CK", "CK, AY") — kolumnen för ansvarig. */
function blockInitialer(text, kanda) {
  const ut = [];
  for (const m of text.matchAll(/(?:^|\s)([A-ZÅÄÖ]{2})(?=[\s,.]|$)/g)) if (kanda.has(m[1])) ut.push(m[1]);
  return [...new Set(ut)];
}

function utanInitialer(text, kanda) {
  return text
    .replace(/(^|\s)([A-ZÅÄÖ]{2})(?:,\s*([A-ZÅÄÖ]{2}))*(?=\s|$|\.)/g, (hel, fore, a) => (kanda.has(a) ? fore : hel))
    .replace(/[ \t]+/g, " ")
    .replace(/ \./g, ".")
    .trim();
}

/* ---------- Tolkningen ---------- */

/**
 * @param {string} text  protokollets text
 * @param {object} o
 *   filnamn   för mötesnummer
 *   moteNr    tvinga ett mötesnummer
 *   personer  [{namn, var}] — appens medarbetare och kontakter, för att känna igen namn
 */
export function tolkaProtokoll(text, { filnamn = "", moteNr = null, personer = [] } = {}) {
  const { text: ren, dolda } = stada(text);
  const h = huvud(ren, filnamn);
  const deltagare = tolkaDeltagare(h.deltagareText);
  const kanda = new Set(deltagare.flatMap((d) => d.initialer));
  const rubriker = hittaRubriker(ren);
  const varningar = [];
  if (rubriker.length < 4) varningar.push("Protokollet följer inte beställarens mall — bara huvudet kunde läsas. Lägg in punkterna för hand.");

  const block = rubriker.map((r) => ({ ...r, block: moteBlock(ren.slice(r.innehall, r.slut)) }));
  const hogsta = Math.max(0, ...block.flatMap((r) => r.block.map((b) => b.mote ?? 0)));
  const nr = moteNr ?? h.nrFil ?? h.nrRubrik ?? (hogsta || null);
  if (nr && hogsta && nr < hogsta) varningar.push(`Protokollet innehåller BM ${hogsta}, men filen anger BM ${nr}. Punkterna tas från BM ${nr}.`);

  const allaPersoner = personer.filter((p) => p && p.namn && p.namn.includes(" "));
  const vemFor = (initialer) => deltagare.find((d) => d.initialer.includes(initialer));

  const punkter = [];
  let nasta = "";
  let lopnr = 0;
  for (const r of block) {
    const b = r.block.find((x) => x.mote === nr);
    if (!b) continue;
    const initialer = blockInitialer(b.text, kanda);
    const stycken = utanInitialer(b.text, kanda)
      .split(/\n\s*\n/)
      .map((s) => s.replace(/(\p{L})-\s*\n\s*(?=\p{L})/gu, "$1-").replace(/(\p{L})-\s+(?=\p{Lu}\p{Ll})/gu, "$1-").replace(/\s*\n\s*/g, " ").trim())
      .filter((s) => s.length > 2);

    if (r.nr === "16") {
      const m = b.text.match(/N[äa]sta (?:bygg)?m[öo]te\s*[:_]?\s*(\d{4}-\d{2}-\d{2})/i);
      if (m) nasta = m[1];
      continue;
    }

    for (const stycke of stycken) {
      const satser = meningar(stycke.replace(/(^|\s)-(?=[A-ZÅÄÖ])/g, "$1. ").replace(/^\.\s*/, ""));
      const atgarder = [];
      let typ = "info";
      for (const [si, s] of satser.entries()) {
        const arFraga = /\?\s*$/.test(s);
        const arAtgard = ATGARD.test(s) && !KLART.test(s) && !PASTAENDE.test(s);
        if (BESLUT.test(s) && typ === "info") typ = "beslut";
        if (!arAtgard && !arFraga) continue;
        const pronomen = /^(De|Dom|Han|Hon|Dessa|Denne)\s/.test(s) && si > 0 ? ansvarigI(satser[si - 1], deltagare, allaPersoner, { sist: true }) : null;
        const vem = ansvarigI(s, deltagare, allaPersoner) || pronomen || (initialer.length === 1 && vemFor(initialer[0]) ? { namn: vemFor(initialer[0]).namn, var: vemFor(initialer[0]).var } : null);
        const nar = datumI(s, h.datum);
        atgarder.push({
          id: `atg-${nr}-${r.nr}-${++lopnr}`,
          text: s.replace(/\.$/, ""),
          ansvarig: vem?.namn || "",
          var: vem ? vem.var : null,
          forfaller: nar?.datum || "",
          forfallerKalla: nar?.kalla || "",
          fraga: arFraga,
        });
      }
      // En åtgärd utan namn ("Ny plåt tas fram") ärver den som nämns i samma stycke.
      const styckesAnsvarig = atgarder.find((a) => a.ansvarig);
      for (const a of atgarder) if (!a.ansvarig && styckesAnsvarig) Object.assign(a, { ansvarig: styckesAnsvarig.ansvarig, var: styckesAnsvarig.var });
      if (atgarder.length) typ = "atgard";
      punkter.push({
        id: `pkt-${nr}-${r.nr}-${punkter.length + 1}`,
        avsnitt: r.nr,
        rubrik: r.rubrik,
        para: paragrafFor(r.nr),
        text: stycke,
        typ,
        ansvarig: atgarder[0]?.ansvarig || (initialer[0] ? vemFor(initialer[0])?.namn || "" : ""),
        atgarder,
      });
    }
  }

  // Åtgärder utan datum gäller till nästa möte.
  for (const p of punkter) for (const a of p.atgarder) if (!a.forfaller && nasta) Object.assign(a, { forfaller: nasta, forfallerKalla: "nasta" });

  // Mallen skrivs om för varje möte och datumet blir ibland kvar från förra året.
  if (h.datum && nasta) {
    const dagar = (Date.parse(nasta) - Date.parse(h.datum)) / 864e5;
    if (dagar < 0 || dagar > 60)
      varningar.push(`Mötesdatumet ${h.datum} ser fel ut — nästa möte är ${nasta}. Kontrollera datumet innan du tillämpar.`);
  }
  if (nr && !punkter.length && rubriker.length >= 4) varningar.push(`Inga punkter för BM ${nr} hittades i protokollet.`);

  return {
    // Samma form som appens mötesnummer (moteNrUrFilnamn): "BM-10".
    moteNr: nr ? "BM-" + String(nr).padStart(2, "0") : "",
    datum: h.datum,
    tid: h.tid,
    plats: h.plats,
    nasta,
    deltagare,
    deltagareText: deltagare.map((d) => `${d.namn}${d.roll ? ", " + d.roll : ""}${d.org ? ", " + d.org : ""}`).join("\n"),
    punkter,
    atgarder: punkter.flatMap((p) => p.atgarder.map((a) => ({ ...a, avsnitt: p.avsnitt, rubrik: p.rubrik, stycke: p.text }))),
    dolda,
    varningar,
  };
}
