/* Svar på en anbudsfråga: val (en av frågans cirklar), säkerhet 0–100 % (linjen)
   och en valfri kommentar. Allt ryms i en sträng i utkastets `v`, läsbar i PDF:en:

     "Pressade · säkerhet 70 % — Elnätets datum ej bekräftat"

   En sträng som inte börjar med ett av frågans val är ett äldre fritextsvar och
   tolkas som kommentar. Valens text får inte innehålla " · " eller " — ". */

const SAK = " · säkerhet ";

/** @param {{ val?: string, sakerhet?: number|null, text?: string }} svar */
export function byggSvar({ val = "", sakerhet = null, text = "" }) {
  const t = (text || "").trim();
  if (!val) return t;
  const huvud = Number.isFinite(sakerhet) ? `${val}${SAK}${Math.round(sakerhet)} %` : val;
  return t ? `${huvud} — ${t}` : huvud;
}

/** @param {string} str @param {string[]} valbara */
export function lasSvar(str, valbara) {
  const s = typeof str === "string" ? str : "";
  const val = [...valbara].sort((a, b) => b.length - a.length).find((v) => s === v || s.startsWith(`${v} · `) || s.startsWith(`${v} — `));
  if (!val) return { val: "", sakerhet: null, text: s };
  let rest = s.slice(val.length);
  let sakerhet = null;
  const m = rest.match(/^ · säkerhet (\d{1,3}) %/);
  if (m) {
    sakerhet = Math.min(100, Number(m[1]));
    rest = rest.slice(m[0].length);
  }
  return { val, sakerhet, text: rest.startsWith(" — ") ? rest.slice(3) : rest.trim() };
}
