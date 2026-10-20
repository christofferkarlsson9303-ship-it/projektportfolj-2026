/* Ekonomin i beslutsunderlaget för anbud (fas 1).

   Projektledaren skriver beloppen som text i guiden, så som de står i kalkylen:
   "12 500 000", "12,5 Mkr", "450 tkr" eller "12.5 MSEK". Här tolkas de till kronor,
   och täckningsbidraget räknas fram. Ett belopp som inte går att tolka blir null,
   aldrig noll, så att PDF:en skriver "Ej angivet" i stället för en felaktig siffra. */

const ENHET = [
  [/^(m(kr|sek)?|miljoner?)$/, 1e6],
  [/^(t(kr|sek)?|tusen)$/, 1e3],
  [/^(kr|sek|:-)?$/, 1],
];

/** Kronor ur fritext, eller null. */
export function tolkaBelopp(text) {
  if (text === null || text === undefined) return null;
  const s = String(text).trim().toLowerCase().replace(/ /g, " ");
  if (!s) return null;
  const m = s.match(/^(-|−)?\s*([\d\s.,]+?)\s*([a-zåäö:-]*)\.?$/);
  if (!m) return null;
  let siffror = m[2].replace(/\s/g, "");
  /* Komma är decimaltecken. En punkt är decimal bara med 1–2 siffror efter (12.5),
     annars tusentalsavgränsare (12.500.000). */
  if (siffror.includes(",")) siffror = siffror.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}(\.|$)/.test(siffror)) siffror = siffror.replace(/\./g, "");
  if (!/^\d+(\.\d+)?$/.test(siffror)) return null;
  const faktor = ENHET.find(([re]) => re.test(m[3]))?.[1];
  if (!faktor) return null;
  const tal = Number(siffror) * faktor * (m[1] ? -1 : 1);
  return Number.isFinite(tal) ? Math.round(tal) : null;
}

const SKALA = (x) => Math.max(1, Math.min(5, Number(x) || 3));
export const riskVarde = (r) => SKALA(r.sannolikhet) * SKALA(r.konsekvens);

/** Riskerna med titel, sorterade efter S × K, med tolkat reserverat belopp. */
export function rangordnadeRisker(rader = []) {
  return rader
    .filter((r) => r.titel?.trim())
    .map((r) => ({ titel: r.titel.trim(), varde: riskVarde(r), belopp: tolkaBelopp(r.belopp), agare: (r.agare || "").trim(), atgard: (r.atgard || "").trim() }))
    .sort((a, b) => b.varde - a.varde);
}

/** Nyckeltalen för ledningen. TB räknas bara när både anbudssumma och kostnad finns. */
export function anbudsEkonomi(v = {}, riskrader = []) {
  const summa = tolkaBelopp(v.anbudssumma);
  const kostnad = tolkaBelopp(v.kalkylkostnad);
  const tb = summa !== null && kostnad !== null ? summa - kostnad : null;
  const risker = rangordnadeRisker(riskrader);
  const prissatta = risker.filter((r) => r.belopp !== null);
  return {
    summa,
    kostnad,
    tb,
    tbProcent: tb !== null && summa ? (tb / summa) * 100 : null,
    riskreserv: tolkaBelopp(v.riskreserv),
    riskSumma: prissatta.length ? prissatta.reduce((a, r) => a + r.belopp, 0) : null,
    prissattaRisker: prissatta.length,
    antalRisker: risker.length,
    kassaLagst: tolkaBelopp(v.kassaflodeLagst),
    kalkylRev: (v.kalkylRev || "").trim(),
  };
}
