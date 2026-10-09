/* Riskens nivåer. Det här är den enda definitionen i appen: riskvärdet
   (sannolikhet × konsekvens, 1–25) delas i låg, medel och hög. Registret,
   riskmatrisen, märkena, larmen och Projektstart räknar alla härifrån.

     låg   1–6    grön
     medel 7–14   gul
     hög   15–25  röd

   ONE Nordics extra regel behålls: ett extremvärde (5) på en axel är aldrig
   grönt, så S5 × K1 och S1 × K5 är gula även om produkten bara är 5. */

export const RISKGRANSER = { medel: 7, hog: 15 };

/** Nivåerna från högsta till lägsta, med spannet som text. */
export const RISKNIVAER = [
  { id: "hog", min: RISKGRANSER.hog, spann: "15–25", farg: "rod" },
  { id: "medel", min: RISKGRANSER.medel, spann: "7–14", farg: "gul" },
  { id: "lag", min: 1, spann: "1–6", farg: "gron" },
];

const SKALA = (x) => Math.max(1, Math.min(5, Number(x) || 1));

/** Nivån för ett riskvärde: "lag", "medel" eller "hog". */
export const riskNivaFranVarde = (v) => (RISKNIVAER.find((n) => (Number(v) || 0) >= n.min) ?? RISKNIVAER.at(-1)).id;

/** Matrisens färg för en kombination av sannolikhet och konsekvens: "gron", "gul" eller "rod". */
export function riskMatrisFarg(s, k) {
  const sa = SKALA(s);
  const ko = SKALA(k);
  const niva = RISKNIVAER.find((n) => n.id === riskNivaFranVarde(sa * ko));
  return niva.id === "lag" && (sa === 5 || ko === 5) ? "gul" : niva.farg;
}
