/* De åtta faserna i ONE-P-flödet. Projektet startar i fas 1, och nästa fas
   låses upp först när allt obligatoriskt i den förra är godkänt (se
   lib/projektfas.js). Fasen styr också projektets status i portföljen.

   Datan är TypeScript så att tsc kontrollerar att varje fas pekar på riktiga
   guidesidor och att varje status finns i PROJEKTSTATUS. */

export type FasNr = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
  { nr: 1, kort: "Anbud", titel: "Anbud, kontrakt och uppstart", status: "PLANERING_OCH_UPPSTART", sammanfattning: "Projektkort, avropsbeslut, direktiv, intressenter, kontrakt och organisation." },
  { nr: 2, kort: "Planering", titel: "Projekterings- och planeringsfasen", status: "PLANERING_OCH_UPPSTART", sammanfattning: "Risker, tidplan, godkänd lösning, tillstånd och nätägare." },
  { nr: 3, kort: "Etablering", titel: "Etableringsfasen", status: "PRODUKTION", sammanfattning: "APD, arbetsplatstavla, HSEQ och fysisk etablering." },
  { nr: 4, kort: "Mark och betong", titel: "Mark och betong (cBoP)", status: "PRODUKTION", sammanfattning: "Markarbeten, fundament och kabelkanalisation." },
  { nr: 5, kort: "Montage", titel: "Leveranser, lyft och montage (eBoP)", status: "PRODUKTION", sammanfattning: "Leveranser, lyft, montage och elektrisk installation." },
  { nr: 6, kort: "Provning", titel: "Provning och driftsättning", status: "PRODUKTION", sammanfattning: "Anläggningsprov, elsäkerhet och driftsättning." },
  { nr: 7, kort: "Slutbesiktning", titel: "Slutbesiktning och överlämning", status: "SLUTBESIKTNING", sammanfattning: "Slutbesiktning, punchlista och slutdokumentation." },
  { nr: 8, kort: "Avslut och garanti", titel: "Ekonomiskt avslut, lärdomar och garanti", status: "AVSLUTAT_OCH_GARANTI", sammanfattning: "Slutreglering, internt avslut, erfarenheter och garantitid." },
];

export const FAS_ANTAL = FASER.length;

export const arFasNr = (x: unknown): x is FasNr => typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= FAS_ANTAL;

/** Fasen ett projekt räknas ligga i när bara statusen är känd. Gamla statusar finns med så att
 *  lagrade projekt kan migreras. Produktion omfattar flera faser och ger den mittersta som reserv. */
const FAS_FRAN_STATUS: Readonly<Record<string, FasNr>> = {
  Anbud: 1, Uppstart: 2, Planering: 2, Produktion: 4, Slutbesiktning: 7, Avslutat: 8,
  PLANERING_OCH_UPPSTART: 1, PRODUKTION: 4, SLUTBESIKTNING: 7, AVSLUTAT_OCH_GARANTI: 8, ANBUD_EJ_VUNNET: 1,
};

export function fasFranStatus(status: unknown): FasNr {
  return FAS_FRAN_STATUS[String(status)] ?? 1;
}

/** Första fasen som hör till en status. */
export const forstaFasForStatus = (status: Projektstatus): FasNr => (FASER.find((f) => f.status === status)?.nr ?? 1) as FasNr;

export const faseInfo = (nr: unknown): Fas => FASER[(arFasNr(nr) ? nr : 1) - 1];

/** Faserna före åttafasmodellen var sex. Lagrade projekt, risker och utkast kan ha dem; `fasModell: 8`
 *  på posten markerar att den redan är omräknad, så att omräkningen aldrig körs två gånger. */
export const FAS_MODELL = 8;
const GAMLA_FASER: Readonly<Record<number, FasNr>> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 7, 6: 8 };
/** Gammal risk-fas till ny. Genomförandefasen (4) delades i Mark och betong (4) och Montage (5):
 *  kategori Mark stannar i 4, övriga risker flyttas till 5. */
export function riskFasFranGammal(fas: unknown, kategori?: unknown): FasNr | null {
  if (fas === 4) return kategori === "mark" ? 4 : 5;
  return faseFranGammal(fas);
}
export const faseFranGammal = (nr: unknown): FasNr | null => (typeof nr === "number" && nr in GAMLA_FASER ? GAMLA_FASER[nr] : null);
