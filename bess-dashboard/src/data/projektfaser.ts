/* De sex faserna i ONE-P-flödet. Projektet startar i fas 1, och nästa fas
   låses upp först när allt obligatoriskt i den förra är godkänt (se
   lib/projektfas.js). Fasen styr också projektets status i portföljen.

   Datan är TypeScript så att tsc kontrollerar att varje fas pekar på riktiga
   guidesidor och att varje status finns i PROJEKTSTATUS. */

export type FasNr = 1 | 2 | 3 | 4 | 5 | 6;

/** Statusarna i portföljen, samma som PROJEKTSTATUS i konstanter.js. */
export type Projektstatus = "Anbud" | "Planering" | "Produktion" | "Slutbesiktning" | "Avslutat";

export interface Fas {
  readonly nr: FasNr;
  /** Kort namn, används i rubriker och navigering. */
  readonly kort: string;
  /** Hela namnet enligt metoden. */
  readonly titel: string;
  /** Statusen projektet får i portföljen när fasen är den aktuella. */
  readonly status: Projektstatus;
  readonly sammanfattning: string;
}

export const FASER: readonly Fas[] = [
  { nr: 1, kort: "Anbud", titel: "Anbudsfasen (Anbud och försäljning)", status: "Anbud", sammanfattning: "Avropsbeslut, projektkort och projektdirektiv." },
  { nr: 2, kort: "Planering", titel: "Projekterings- och planeringsfasen (Förberedelse)", status: "Planering", sammanfattning: "Organisation, kontrakt, risker, tidplan, godkänd lösning och tillstånd." },
  { nr: 3, kort: "Etablering", titel: "Etableringsfasen", status: "Produktion", sammanfattning: "APD, arbetsplatstavla, HSEQ och fysisk etablering." },
  { nr: 4, kort: "Genomförande", titel: "Genomförandefasen (Produktion)", status: "Produktion", sammanfattning: "Mark, betong, leveranser, montage, provning och driftsättning." },
  { nr: 5, kort: "Avslut", titel: "Avslutnings- och överlämningsfasen", status: "Slutbesiktning", sammanfattning: "Slutbesiktning, punchlista, slutdokumentation och slutreglering." },
  { nr: 6, kort: "Garanti", titel: "Eftermarknad och garanti (Garantitid)", status: "Avslutat", sammanfattning: "Garantiärenden, serviceavtal och garantibesiktning." },
];

export const FAS_ANTAL = FASER.length;

export const arFasNr = (x: unknown): x is FasNr => typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= FAS_ANTAL;

/** Fasen ett projekt med känd status räknas som när inget annat är sparat. */
const FAS_FRAN_STATUS: Record<Projektstatus, FasNr> = { Anbud: 1, Planering: 2, Produktion: 4, Slutbesiktning: 5, Avslutat: 6 };

export function fasFranStatus(status: unknown): FasNr {
  return FAS_FRAN_STATUS[status as Projektstatus] ?? 1;
}

export const faseInfo = (nr: unknown): Fas => FASER[(arFasNr(nr) ? nr : 1) - 1];
