/* Riskmodellen. Varje risk hör till en projektfas (1–8) och en kategori.
   Samma form används i portföljens riskregister (state.risker) och i raderna
   i Projektstart-guiden, så att en risk kan följa med från guiden till
   registret utan omräkning. */

import type { FasNr } from "./projektfaser.ts";

export type RiskKategori = "teknik" | "mark" | "leverans" | "kontrakt" | "hseq" | "kma" | "ekonomi" | "tid" | "annat";

/** [id, etikett]. De fem första är registrets ursprungliga och får aldrig döpas om. */
export const RISKKATEGORIER: readonly (readonly [RiskKategori, string])[] = [
  ["teknik", "Teknik / BESS (POI, PCS, EMS)"],
  ["mark", "Entreprenad / mark"],
  ["leverans", "Leverans / long-lead"],
  ["kontrakt", "Kontrakt / ekonomi"],
  ["hseq", "HSEQ / arbetsmiljö"],
  ["kma", "KMA (kvalitet, miljö, arbetsmiljö)"],
  ["ekonomi", "Ekonomi"],
  ["tid", "Tid / tidplan"],
  ["annat", "Övrigt"],
];

/** Korta namn för tabeller och diagram. */
export const RISKKATEGORI_KORT: Readonly<Record<RiskKategori, string>> = {
  teknik: "Teknik", mark: "Mark", leverans: "Leverans", kontrakt: "Kontrakt", hseq: "HSEQ",
  kma: "KMA", ekonomi: "Ekonomi", tid: "Tid", annat: "Övrigt",
};

export type RiskStatus = "oppen" | "overvakad" | "stangd" | "utlost";
export type Skala = 1 | 2 | 3 | 4 | 5;

export interface Risk {
  id: string;
  projektId: string;
  /** Projektfasen risken hör till. */
  fas: FasNr;
  kategori?: RiskKategori;
  titel: string;
  sannolikhet: Skala;
  konsekvens: Skala;
  /** Åtgärdsplanen: vad som görs för att minska eller hantera risken. */
  atgard: string;
  agare: string;
  status: RiskStatus;
}

export const RISKKATEGORI_ID: ReadonlySet<string> = new Set(RISKKATEGORIER.map(([id]) => id));

export const arRiskKategori = (x: unknown): x is RiskKategori => typeof x === "string" && RISKKATEGORI_ID.has(x);
