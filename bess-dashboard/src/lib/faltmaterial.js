import { FALTMALLAR, FALTMALL_REVISION, KALLSTATUS } from "../data/faltmaterial.js";
import { PROJEKTMALLAR, PROJEKTKONTROLL_REVISION, PROJEKTKONTROLL_INLEDNING } from "../data/projektkontroll.js";
import { kontrollId, kontrollSummering } from "./projektkontroll.js";
import { idag } from "./datum.js";
import { HARDVARUPROFILER, profilIdFor } from "../data/hardvaruprofiler.js";
import { filtreraPaProfil, oppnaBeslut } from "./tillampning.js";

/** @param {any} state @param {string} pid @param {{utforare?: string, fran?: string, till?: string, ids?: string[]}} [filter] */
export function arbetsrader(state, pid, { utforare = "", fran = "", till = "", ids } = {}) {
  const valda = ids ? new Set(ids) : null;
  return (state.punkter || []).filter((p) =>
    (p.projektId === pid || p.projektId === "bada") && p.status !== "klarmarkerad" &&
    (!valda || valda.has(p.id)) &&
    (!utforare || (p.utforare || p.agare || "").toLocaleLowerCase("sv") === utforare.toLocaleLowerCase("sv")) &&
    (!p.forfaller || ((!fran || p.forfaller >= fran) && (!till || p.forfaller <= till)))
  ).map((p) => ({
    id: p.id, titel: p.titel, instruktion: p.instruktion || p.titel,
    utforare: p.utforare || p.agare || "", datum: p.forfaller || "", referens: p.ritningsreferens || "",
  }));
}

/**
 * Metadata till fältmaterialet. Alla fält är valfria.
 * @typedef {{enhet?: string, utforare?: string, visaResultat?: boolean,
 *   kontrollplan?: string, datum?: string, skapadAv?: string, dokumentNr?: string, ritning?: string,
 *   fran?: string, till?: string}} FaltMetadata
 */

/** Fryst dokumentmodell: inget här ändrar projektets eller EPC:s status.
 * @param {{projekt: any, mallIds: string[], referenser?: Object<string,string>, ansvar?: Object<string,string>,
 *   metadata?: FaltMetadata, uppgifter?: any[], mallpaket?: string, kontroller?: any[], profil?: string}} indata */
export function byggFaltmaterial({ projekt, mallIds, referenser = {}, ansvar = {}, metadata = {}, uppgifter = [], mallpaket = "teknisk", kontroller = [] }) {
  const idSet = new Set(mallIds);
  /** @type {any[]} */
  const mallar = mallpaket === "projekt" ? PROJEKTMALLAR : FALTMALLAR;
  const revision = mallpaket === "projekt" ? PROJEKTKONTROLL_REVISION : FALTMALL_REVISION;
  const omfattning = metadata.enhet?.trim() || "Hela anläggningen";
  const index = new Map(kontroller.map((r) => [r.id, r]));
  /* Bara punkter som gäller projektets hårdvaruprofil (F09). */
  const profil = profilIdFor(projekt);
  const { moment: valda, undantagna } = filtreraPaProfil(mallar.filter((m) => idSet.has(m.id)), profil);
  const hv = HARDVARUPROFILER[profil];
  const utrustning = (m) => (profil !== "catl-pe" && /CATL|Power Electronics/.test(m.utrustning || "") ? `${hv.container.benamning} / ${hv.skid.benamning}` : m.utrustning);
  const moment = valda.filter((m) => m.punkter.length).map((m) => ({
    ...m,
    profil,
    utrustning: utrustning(m),
    referens: (referenser[m.id] || "").trim(),
    utforare: (ansvar[m.id] || metadata.utforare || "").trim(),
    punkter: m.punkter.map((p) => ({ ...p, epc: [...p.epc], kontroll: index.has(kontrollId(projekt.id, omfattning, p.id)) ? { ...index.get(kontrollId(projekt.id, omfattning, p.id)) } : null })),
  }));
  return {
    projekt: { id: projekt.id, nr: projekt.nr, namn: projekt.namn, bestallare: projekt.bestallare },
    revision, kalla: KALLSTATUS,
    visaResultat: mallpaket === "projekt" && metadata.visaResultat,
    kontrollplan: metadata.kontrollplan || "", omfattning,
    sammanstallning: kontrollSummering(moment, revision),
    mallpaket, momentTotal: mallar.length, inledning: mallpaket === "projekt" ? PROJEKTKONTROLL_INLEDNING : "",
    datum: metadata.datum || idag(), skapadAv: metadata.skapadAv || "",
    dokumentNr: metadata.dokumentNr || `EK-${projekt.nr || projekt.id}-${metadata.datum || idag()}${mallpaket === "projekt" ? `-R3-${omfattning.replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40)}` : ""}`,
    enhet: metadata.enhet || "", utforare: metadata.utforare || "", ritning: metadata.ritning || "",
    fran: metadata.fran || "", till: metadata.till || "",
    moment, uppgifter: uppgifter.map((p) => ({ ...p })),
    antal: moment.reduce((s, m) => s + m.punkter.length, 0),
    profil, undantagna, oppnaBeslut: oppnaBeslut(undantagna, moment, profil),
    komplett: moment.length === mallar.length,
  };
}

export function faltFilnamn(d, typ, extension) {
  const rent = (s) => String(s).replace(/[^\p{L}\p{N}_-]+/gu, "_");
  return `${rent(typ)}_${rent(d.projekt.nr || d.projekt.id)}_${rent(d.datum)}.${extension}`;
}
