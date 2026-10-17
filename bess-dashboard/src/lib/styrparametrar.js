/* Styrparametrarna i projektdirektivet (ONE-P 6.1, punkt 4): hur kostnad, kvalitet och tid
   prioriteras, i procent. De tre ska vara tal mellan 0 och 100 och summera till 100. */

export const STYRPARAMETRAR = [
  ["prioritetKostnad", "Kostnad"],
  ["prioritetKvalitet", "Kvalitet"],
  ["prioritetTid", "Tid"],
];

const tal = (x) => {
  const t = String(x ?? "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** Läget för fördelningen. `summa` räknas på ifyllda tal; `giltig` kräver alla tre, 0–100 och summa 100. */
export function styrparametrar(v = {}) {
  const varden = STYRPARAMETRAR.map(([id]) => tal(v[id]));
  const ifyllda = varden.filter((n) => n !== null).length;
  const summa = Math.round(varden.reduce((a, n) => a + (Number.isFinite(n) ? n : 0), 0) * 100) / 100;
  const giltig = ifyllda === 3 && varden.every((n) => Number.isFinite(n) && n >= 0 && n <= 100) && Math.abs(summa - 100) < 0.01;
  return { varden, ifyllda, summa, giltig };
}

const procent = (n) => String(n).replace(".", ",");

/** "Kostnad 60 %, kvalitet 10 %, tid 30 % (summa 100 %)." eller tom sträng om inget är ifyllt. */
export function styrparametrarText(v = {}) {
  const s = styrparametrar(v);
  if (!s.ifyllda) return "";
  const delar = STYRPARAMETRAR.map(([, namn], i) => `${i ? namn.toLowerCase() : namn} ${s.varden[i] === null || Number.isNaN(s.varden[i]) ? "ej angivet" : `${procent(s.varden[i])} %`}`);
  return `${delar.join(", ")} (summa ${procent(s.summa)} %).${s.giltig ? "" : " Fördelningen ska summera till 100 %."}`;
}
