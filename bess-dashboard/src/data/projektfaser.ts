/* De sex faserna i ONE-P-flödet. Projektet startar i fas 1, och nästa fas
   låses upp först när allt obligatoriskt i den förra är godkänt (se
   lib/projektfas.js). Fasen styr också projektets status i portföljen.

   Datan är TypeScript så att tsc kontrollerar att varje fas pekar på riktiga
   guidesidor och att varje status finns i PROJEKTSTATUS. */

export type FasNr = 1 | 2 | 3 | 4 | 5 | 6;

/** Projektets övergripande status i portföljen. Fyra aktiva statusar och arkivstatusen för förlorade anbud. */
export type Projektstatus = "PLANERING_OCH_UPPSTART" | "PRODUKTION" | "SLUTBESIKTNING" | "AVSLUTAT_OCH_GARANTI" | "ANBUD_EJ_VUNNET";

export const AKTIVA_STATUSAR: readonly Projektstatus[] = ["PLANERING_OCH_UPPSTART", "PRODUKTION", "SLUTBESIKTNING", "AVSLUTAT_OCH_GARANTI"];

export const PROJEKTSTATUS_ETIKETT: Readonly<Record<Projektstatus, string>> = {
  PLANERING_OCH_UPPSTART: "Planering och uppstart",
  PRODUKTION: "Produktion",
  SLUTBESIKTNING: "Slutbesiktning",
  AVSLUTAT_OCH_GARANTI: "Avslutat och garanti",
  ANBUD_EJ_VUNNET: "Ej vunnet",
};

export const arProjektstatus = (x: unknown): x is Projektstatus => typeof x === "string" && x in PROJEKTSTATUS_ETIKETT;

/** Statusarna som fanns innan de fyra nya. Lagrade projekt kan fortfarande ha dem. */
const GAMLA_STATUSAR: Readonly<Record<string, Projektstatus>> = {
  Anbud: "PLANERING_OCH_UPPSTART",
  Uppstart: "PLANERING_OCH_UPPSTART",
  Planering: "PLANERING_OCH_UPPSTART",
  Produktion: "PRODUKTION",
  Slutbesiktning: "SLUTBESIKTNING",
  Avslutat: "AVSLUTAT_OCH_GARANTI",
};

/** Ger en giltig status ur ett lagrat värde, nytt eller gammalt. Okänt värde blir Planering och uppstart. */
export function normaliseraStatus(x: unknown): Projektstatus {
  if (arProjektstatus(x)) return x;
  return GAMLA_STATUSAR[String(x)] ?? "PLANERING_OCH_UPPSTART";
}

export const statusEtikett = (x: unknown): string => PROJEKTSTATUS_ETIKETT[normaliseraStatus(x)];

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
  { nr: 1, kort: "Anbud", titel: "Anbudsfasen (Anbud och försäljning)", status: "PLANERING_OCH_UPPSTART", sammanfattning: "Avropsbeslut, projektkort och projektdirektiv." },
  { nr: 2, kort: "Planering", titel: "Projekterings- och planeringsfasen (Förberedelse)", status: "PLANERING_OCH_UPPSTART", sammanfattning: "Organisation, kontrakt, risker, tidplan, godkänd lösning och tillstånd." },
  { nr: 3, kort: "Etablering", titel: "Etableringsfasen", status: "PRODUKTION", sammanfattning: "APD, arbetsplatstavla, HSEQ och fysisk etablering." },
  { nr: 4, kort: "Genomförande", titel: "Genomförandefasen (Produktion)", status: "PRODUKTION", sammanfattning: "Mark, betong, leveranser, montage, provning och driftsättning." },
  { nr: 5, kort: "Avslut", titel: "Avslutnings- och överlämningsfasen", status: "SLUTBESIKTNING", sammanfattning: "Slutbesiktning, punchlista, slutdokumentation och slutreglering." },
  { nr: 6, kort: "Garanti", titel: "Eftermarknad och garanti (Garantitid)", status: "AVSLUTAT_OCH_GARANTI", sammanfattning: "Garantiärenden, serviceavtal och garantibesiktning." },
];

export const FAS_ANTAL = FASER.length;

export const arFasNr = (x: unknown): x is FasNr => typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= FAS_ANTAL;

/** Fasen ett projekt räknas ligga i när bara statusen är känd. Gamla statusar finns med så att
 *  lagrade projekt kan migreras. Produktion omfattar flera faser och ger den mittersta som reserv. */
const FAS_FRAN_STATUS: Readonly<Record<string, FasNr>> = {
  Anbud: 1, Uppstart: 2, Planering: 2, Produktion: 4, Slutbesiktning: 5, Avslutat: 6,
  PLANERING_OCH_UPPSTART: 1, PRODUKTION: 4, SLUTBESIKTNING: 5, AVSLUTAT_OCH_GARANTI: 6, ANBUD_EJ_VUNNET: 1,
};

export function fasFranStatus(status: unknown): FasNr {
  return FAS_FRAN_STATUS[String(status)] ?? 1;
}

/** Första fasen som hör till en status. */
export const forstaFasForStatus = (status: Projektstatus): FasNr => (FASER.find((f) => f.status === status)?.nr ?? 1) as FasNr;

export const faseInfo = (nr: unknown): Fas => FASER[(arFasNr(nr) ? nr : 1) - 1];
