/* Anbudsmodeller — fristående 3D-modeller som tagits fram i anbudsskedet, innan projektet har
   enheter i siteObjekt. Filen läggs in orörd under src/sections/Site/anbud/ och visas i en
   sandlåda (iframe) på siten för det projekt den hör till. Ren logik utan three och utan Vite,
   så att matchningen kan testas.

   Modellen är ett underlag, inte projektets data: inget här skrivs till portfolj/state, och
   modellen följer inte när enheter flyttas i siten. */

export const ANBUDSMODELLER = [
  {
    id: "vaggeryd-100mw",
    namn: "Vaggeryd 100 MW, batterilager",
    plats: "Båramo 1:17, Vaggeryd",
    datum: "2026-10-19",
    fil: "vaggeryd-100mw-3d-2026-10-19.html",
    underlag: "BESS-positioner från situationsplan A-01-1-001/002 (2026-09-16, skala 1:500). BR och MVS efter Sungrows datablad. Masthöjder, åskskyddsmaster och väganslutning är antagna.",
    varianter: "2h · 200 MWh och 4h · 400 MWh",
    monster: /vaggeryd|båramo|baramo/i,
  },
];

/** Anbudsmodellen för ett projekt, eller null. Matchar på namn, ort och plats. */
export function anbudsmodellFor(p) {
  if (!p) return null;
  const text = [p.namn, p.ort, p.plats].filter(Boolean).join(" ");
  if (!text) return null;
  return ANBUDSMODELLER.find((m) => m.monster.test(text)) || null;
}
