/* Kontraktsprofil — det projektledaren behöver ur ett kontrakt, med källa.

   Profilen läses in som en JSON-fil och sparas i portföljens delade lagring
   (bakom inloggning). Själva avtalet ligger kvar i projektets dokumentmapp och
   avtalsvärden läggs aldrig i källkoden.

   En profil gäller ett projekt. Varje villkor bär en paragrafhänvisning så att
   det går att slå upp i originalet. Sidan visar "Kontrollerat mot kontrakt"
   bara när en profil finns; annars visar den standardmallen. */

export const PROFILSCHEMA = "kontraktsprofil-v1";

/** Frister som andra vyer slår upp med sitt id. */
export const FRIST = {
  hinder: "hinder",
  atgardaFel: "atgarda-fel",
  granskning: "granskning",
  faktura: "faktura",
  dagbok: "dagbok",
};

const text = (v) => (typeof v === "string" ? v.trim() : "");
const tal = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const lista = (v) => (Array.isArray(v) ? v : []);

/** Kontrollerar en inläst profil. Returnerar {fel:[…], varningar:[…]}. */
export function granskaProfil(p, projekt = []) {
  const fel = [];
  const varningar = [];
  if (!p || typeof p !== "object" || Array.isArray(p)) return { fel: ["Filen är inte en kontraktsprofil."], varningar };
  if (p.schema !== PROFILSCHEMA) fel.push(`Okänt format. Filen ska ha schema "${PROFILSCHEMA}".`);
  const proj = projekt.find((x) => x.id === p.projektId);
  if (!text(p.projektId)) fel.push("Projekt saknas i filen.");
  else if (!proj) fel.push(`Projektet ${p.projektId} finns inte i portföljen.`);
  if (!text(p.kalla?.dokument)) fel.push("Källdokument saknas. Ange vilket avtal profilen bygger på.");
  if (!text(p.kalla?.datum)) varningar.push("Avtalsdatum saknas.");
  const andel = lista(p.milstolpar).reduce((s, m) => s + (tal(m.andel) ?? 0), 0);
  if (lista(p.milstolpar).length && andel !== 100) fel.push(`Betalplanens andelar blir ${andel} %, inte 100 %.`);
  for (const f of lista(p.frister)) if (!text(f.id) || !text(f.rubrik) || tal(f.varde) === null) fel.push(`En frist saknar id, rubrik eller värde (${f.rubrik || f.id || "okänd"}).`);
  const utanKalla = [...lista(p.frister), ...lista(p.viten), ...lista(p.sakerheter)].filter((r) => !text(r.ref)).length;
  if (utanKalla) varningar.push(`${utanKalla} villkor saknar paragrafhänvisning.`);
  if (proj && tal(p.kontraktssumma) !== null && tal(proj.kontraktsvarde) !== null && p.kontraktssumma !== proj.kontraktsvarde)
    varningar.push(`Kontraktssumman i filen (${p.kontraktssumma.toLocaleString("sv-SE")} kr) skiljer sig från portföljens (${proj.kontraktsvarde.toLocaleString("sv-SE")} kr). Portföljens värde ändras inte här.`);
  return { fel, varningar };
}

/** Rensar profilen till kända fält, så att inget oväntat sparas. */
export function rensaProfil(p, inlast = {}) {
  const rad = (r, falt) => Object.fromEntries(falt.map((k) => [k, r?.[k] ?? null]));
  return {
    id: `kp-${p.projektId}`,
    schema: PROFILSCHEMA,
    projektId: p.projektId,
    kalla: rad(p.kalla, ["dokument", "datum", "plats", "granskadAv", "granskadDatum"]),
    kontraktssumma: tal(p.kontraktssumma),
    avtalsform: text(p.avtalsform),
    betalning: rad(p.betalning, ["villkorDagar", "forskott", "index", "ref"]),
    milstolpar: lista(p.milstolpar).map((m) => rad(m, ["kod", "namn", "andel", "krav", "ref"])),
    frister: lista(p.frister).map((f) => rad(f, ["id", "rubrik", "varde", "enhet", "vad", "foljd", "ref", "intern"])),
    viten: lista(p.viten).map((v) => rad(v, ["id", "rubrik", "procentPerVecka", "beloppPerTillfalle", "takProcent", "takBelopp", "nar", "ref"])),
    sakerheter: lista(p.sakerheter).map((s) => rad(s, ["rubrik", "procent", "giltig", "ref"])),
    garanti: rad(p.garanti, ["arbetenAr", "materialAr", "ref"]),
    priser: lista(p.priser).map((r) => rad(r, ["roll", "pris", "enhet"])),
    prisvillkor: lista(p.prisvillkor).map(text).filter(Boolean),
    kontrollera: lista(p.kontrollera).map(text).filter(Boolean),
    inlast: { av: inlast.av || "", datum: inlast.datum || "" },
  };
}

/** Projektets profil, eller null. */
export const kontraktsprofil = (state, pid) => (state?.kontrakt || []).find((k) => k.projektId === pid) || null;

/** En frist ur profilen, eller null. */
export const frist = (profil, id) => profil?.frister?.find((f) => f.id === id) || null;

/** Ett vite ur profilen, eller null. */
export const vite = (profil, id) => profil?.viten?.find((v) => v.id === id) || null;

/** Vite per vecka i kronor, när procentsats och kontraktssumma finns. */
export function vitePerVecka(v, summa) {
  if (tal(v?.procentPerVecka) === null || tal(summa) === null) return null;
  return Math.round((v.procentPerVecka / 100) * summa);
}

/** Taket i kronor: fast belopp eller procent av kontraktssumman. */
export function viteTak(v, summa) {
  if (tal(v?.takBelopp) !== null) return v.takBelopp;
  if (tal(v?.takProcent) === null || tal(summa) === null) return null;
  return Math.round((v.takProcent / 100) * summa);
}

/** Kort text för en frist: "10 bankdagar". */
const ENTAL = { bankdagar: "bankdag", dagar: "dag", veckor: "vecka", "månader": "månad", timmar: "timme", arbetsdagar: "arbetsdag" };
export const fristText = (f) => (f ? `${String(f.varde).replace(".", ",")} ${(f.varde === 1 && ENTAL[f.enhet]) || f.enhet || ""}`.trim() : "");

/** Tom mall att fylla i, för nya projekt. */
export function tomProfil(projektId = "") {
  return {
    schema: PROFILSCHEMA,
    projektId,
    kalla: { dokument: "", datum: "", plats: "", granskadAv: "", granskadDatum: "" },
    kontraktssumma: null,
    avtalsform: "",
    betalning: { villkorDagar: null, forskott: false, index: "", ref: "" },
    milstolpar: [],
    frister: [
      { id: FRIST.hinder, rubrik: "Underrätta om hinder", varde: null, enhet: "bankdagar", vad: "", foljd: "", ref: "" },
      { id: FRIST.atgardaFel, rubrik: "Åtgärda fel", varde: null, enhet: "veckor", vad: "", foljd: "", ref: "" },
    ],
    viten: [],
    sakerheter: [],
    garanti: { arbetenAr: null, materialAr: null, ref: "" },
    priser: [],
    prisvillkor: [],
    kontrollera: [],
  };
}
