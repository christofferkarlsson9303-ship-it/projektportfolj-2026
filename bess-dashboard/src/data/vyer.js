/* Vylistan som gränssnittet faktiskt använder.

   VYER i konstanter.js är extraherad ur standalone-filen och hålls oförändrad —
   den speglar originalet. Vyer som tillkommit i React-versionen läggs till här
   i stället, så att extraktionen kan köras om utan att tappa dem. */

import { NAVIKON, VYER as VYER_ORIGINAL } from "./konstanter.js";

const TILLAGDA = [
  [
    "idag",
    "Idag",
    "Allt som kräver din åtgärd — frister som löper, förfallet och det närmaste i tiden.",
  ],
];

/* Tillagda vyer som ska ligga på en bestämd plats i listan i stället för
   först: [efter vy-id, vy]. */
const INSKJUTNA = [
  [
    "oversikt",
    [
      "epc",
      "Bygga batteripark",
      "16 faser med grind från anbud till garantitid — steg för steg, och var varje projekt står just nu.",
    ],
  ],
  [
    "tidplan",
    [
      "handlingsplan",
      "Handlingsplan",
      "Från projektets mål via drivkraft och strategi till åtgärder med resurser, status och datum.",
    ],
  ],
];

const IKONER_TILLAGDA = {
  // Bock i ruta: dagens arbetslista.
  idag: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M8.5 14.5l2.5 2.5 4.5-5"/>',
  // Anslagstavla med lista: checklistan.
  epc: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2.5h6v3H9z"/><path d="M8.5 11l1.5 1.5 2.5-2.5M14 11.5h2M8.5 16.5l1.5 1.5 2.5-2.5M14 17h2"/>',
  // Måltavla: mål → åtgärder.
  handlingsplan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
};

function medInskjutna(lista) {
  const ut = [...lista];
  for (const [efter, vy] of INSKJUTNA) {
    const i = ut.findIndex((v) => v[0] === efter);
    ut.splice(i < 0 ? ut.length : i + 1, 0, vy);
  }
  return ut;
}

/** Hela vylistan, med de tillagda vyerna först och de inskjutna på sin plats. */
export const VYER = medInskjutna([...TILLAGDA, ...VYER_ORIGINAL]);

export const NAVIKONER = { ...NAVIKON, ...IKONER_TILLAGDA };

/** Uppslagstabell id → {namn, lead}. */
export const VYMETA = Object.fromEntries(
  VYER.filter((v) => v[0] !== "_sek").map(([id, namn, lead]) => [id, { namn, lead }])
);

/** Giltiga vy-id, för adressfältet. */
export const GILTIGA_VYER = new Set(Object.keys(VYMETA));
