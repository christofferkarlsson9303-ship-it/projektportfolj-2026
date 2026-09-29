/* Projektdirektiv och uppstartsavstämning mot ett projekt. Rena funktioner.

   Datan om vad direktivet och avstämningen ska innehålla ligger i
   data/projektstart.js. Per projekt finns en rad i state.projektstart
   (sås i efterInlasning, id "ps-<projekt>"). Direktivets fält ligger
   platt på raden — ett fält per rubrik — så att två personer som skriver
   i olika rubriker samtidigt båda får behålla sin text vid sammanslagning.

   - bakgrund, syfte, mal, …   direktivets textfält (DIREKTIV_FALT)
   - prioKostnad/prioKvalitet/prioTid   projekttriangeln i procent
   - andrad, andradTid   senaste ändring i direktivet (dag och tidsstämpel)
   - ibNamn, ibDatum, ibTid   intern beställares signatur
   - plNamn, plDatum, plTid   projektledarens signatur

   Tidsstämplarna skiljer en ändring från en signatur samma dag. En signatur
   med datum inskrivet för hand (t.ex. undertecknat på papper) saknar
   tidsstämpel och jämförs då på dag.
   - uppstart      { "us.4": { klar, not } }  avstämningens frågor
   - uppstartDatum    när avstämningen hölls
   - uppstartOk       datum då intern beställare gav klartecken till startmöte

   En signatur gäller det direktiv som fanns när den sattes. Ändras
   direktivet efteråt räknas signaturen som inaktuell och direktivet måste
   signeras om — samma princip som APD-planens revision. */

import { DIREKTIV_FALT, TRIANGEL, UPPSTART_FRAGOR } from "../data/projektstart.js";

const giltigt = (iso) => typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
const ifyllt = (v) => typeof v === "string" && v.trim() !== "";

/** Tom rad för ett projekt — samma form som efterInlasning sår. */
export function nyProjektstartRad(pid) {
  const rad = { id: `ps-${pid}`, projektId: pid };
  for (const f of DIREKTIV_FALT) rad[f.id] = "";
  for (const t of TRIANGEL) rad[t.id] = null;
  return {
    ...rad,
    andrad: "",
    andradTid: "",
    ibNamn: "",
    ibDatum: "",
    ibTid: "",
    plNamn: "",
    plDatum: "",
    plTid: "",
    uppstart: {},
    uppstartDatum: "",
    uppstartOk: "",
  };
}

export function projektstartRad(state, pid) {
  return (state.projektstart || []).find((r) => r.projektId === pid) || null;
}

/** Fält som räknas som en ändring av direktivet (och gör signaturer inaktuella). */
export const DIREKTIV_NYCKLAR = new Set([...DIREKTIV_FALT.map((f) => f.id), ...TRIANGEL.map((t) => t.id)]);

/** Heltal 0–100, eller null för tomt/ogiltigt. */
export function tolkaProcent(v) {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** En signatur är giltig när den har datum och inte är äldre än senaste
 *  ändring. Med tidsstämpel på båda jämförs tiden, annars dagen. */
export function signatur(rad, prefix) {
  const namn = rad?.[`${prefix}Namn`] || "";
  const datum = rad?.[`${prefix}Datum`];
  const tid = rad?.[`${prefix}Tid`];
  if (!giltigt(datum)) return { status: "saknas", namn, datum: null };
  const aldre = tid && rad.andradTid ? rad.andradTid > tid : giltigt(rad.andrad) && rad.andrad > datum;
  return { status: aldre ? "inaktuell" : "giltig", namn, datum };
}

/** Projekttriangelns läge: värden, summa och den högst prioriterade parametern. */
export function triangelLage(rad) {
  const varden = TRIANGEL.map((t) => ({ ...t, varde: tolkaProcent(rad?.[t.id]) }));
  const ifyllda = varden.filter((v) => v.varde !== null);
  const summa = ifyllda.reduce((s, v) => s + v.varde, 0);
  const komplett = ifyllda.length === TRIANGEL.length;
  const ok = komplett && summa === 100;
  const hogst = ok ? [...varden].sort((a, b) => b.varde - a.varde)[0] : null;
  // Delad förstaplats är ingen prioritering.
  const entydig = ok && varden.filter((v) => v.varde === hogst.varde).length === 1;
  return { varden, summa, komplett, ok, hogst: entydig ? hogst : null };
}

/** Allt vyn behöver om direktivet. */
export function direktivLage(state, pid) {
  const rad = projektstartRad(state, pid) || nyProjektstartRad(pid);
  const krav = DIREKTIV_FALT.filter((f) => f.krav);
  const saknas = krav.filter((f) => !ifyllt(rad[f.id]));
  const triangel = triangelLage(rad);
  const ib = signatur(rad, "ib");
  const pl = signatur(rad, "pl");
  const komplett = saknas.length === 0 && triangel.ok;
  return {
    rad,
    ifyllda: DIREKTIV_FALT.filter((f) => ifyllt(rad[f.id])).length,
    totalt: DIREKTIV_FALT.length,
    kravIfyllda: krav.length - saknas.length,
    kravTotalt: krav.length,
    saknas,
    triangel,
    komplett,
    ib,
    pl,
    /** Hållpunkt 1.22: komplett direktiv med två giltiga signaturer. */
    signerat: komplett && ib.status === "giltig" && pl.status === "giltig",
  };
}

/** Allt vyn behöver om uppstartsavstämningen. */
export function uppstartLage(state, pid) {
  const rad = projektstartRad(state, pid) || nyProjektstartRad(pid);
  const svar = rad.uppstart || {};
  const fragor = UPPSTART_FRAGOR.map((f) => ({
    ...f,
    klar: !!svar[f.id]?.klar,
    not: svar[f.id]?.not || "",
  }));
  const klara = fragor.filter((f) => f.klar).length;
  const godkand = giltigt(rad.uppstartOk);
  return {
    rad,
    fragor,
    klara,
    totalt: fragor.length,
    alla: klara === fragor.length,
    hallen: giltigt(rad.uppstartDatum),
    godkand,
    /** Hållpunkt 1.23: intern beställare har gett klartecken till startmöte. */
    redo: godkand,
  };
}
