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

const IKONER_TILLAGDA = {
  // Bock i ruta: dagens arbetslista.
  idag: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/><path d="M8 2v4M16 2v4"/><path d="M8.5 14.5l2.5 2.5 4.5-5"/>',
};

/** Hela vylistan, med de tillagda vyerna först. */
export const VYER = [...TILLAGDA, ...VYER_ORIGINAL];

export const NAVIKONER = { ...NAVIKON, ...IKONER_TILLAGDA };

/** Uppslagstabell id → {namn, lead}. */
export const VYMETA = Object.fromEntries(
  VYER.filter((v) => v[0] !== "_sek").map(([id, namn, lead]) => [id, { namn, lead }])
);

/** Giltiga vy-id, för adressfältet. */
export const GILTIGA_VYER = new Set(Object.keys(VYMETA));
