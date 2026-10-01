import { FALTMALLAR, FALTMALL_REVISION, KALLSTATUS } from "../data/faltmaterial.js";
import { idag } from "./datum.js";

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

/** Fryst dokumentmodell: inget här ändrar projektets eller EPC:s status. */
export function byggFaltmaterial({ projekt, mallIds, referenser = {}, ansvar = {}, metadata = {}, uppgifter = [] }) {
  const idSet = new Set(mallIds);
  const moment = FALTMALLAR.filter((m) => idSet.has(m.id)).map((m) => ({
    ...m,
    referens: (referenser[m.id] || "").trim(),
    utforare: (ansvar[m.id] || metadata.utforare || "").trim(),
    punkter: m.punkter.map((p) => ({ ...p, epc: [...p.epc] })),
  }));
  return {
    projekt: { id: projekt.id, nr: projekt.nr, namn: projekt.namn, bestallare: projekt.bestallare },
    revision: FALTMALL_REVISION, kalla: KALLSTATUS,
    datum: metadata.datum || idag(), skapadAv: metadata.skapadAv || "",
    dokumentNr: metadata.dokumentNr || `EK-${projekt.nr || projekt.id}-${metadata.datum || idag()}`,
    enhet: metadata.enhet || "", utforare: metadata.utforare || "", ritning: metadata.ritning || "",
    fran: metadata.fran || "", till: metadata.till || "",
    moment, uppgifter: uppgifter.map((p) => ({ ...p })),
    antal: moment.reduce((s, m) => s + m.punkter.length, 0),
    komplett: moment.length === FALTMALLAR.length,
  };
}

export function faltFilnamn(d, typ, extension) {
  const rent = (s) => String(s).replace(/[^\p{L}\p{N}_-]+/gu, "_");
  return `${rent(typ)}_${rent(d.projekt.nr || d.projekt.id)}_${rent(d.datum)}.${extension}`;
}
