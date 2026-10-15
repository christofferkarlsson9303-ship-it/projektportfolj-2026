import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { createElement } from "react";

// Logotypen är en Vite-asset i appen. I Node pekar vi den till filen på disk.
vi.mock("../../assets/one-nordic-logo.png", () => ({ default: path.resolve("src/assets/one-nordic-logo.png") }));

const { renderToBuffer } = await import("@react-pdf/renderer");
const { ProjektstartPdf } = await import("./ProjektstartPdf.jsx");
const { projektstartDokument, tomtUtkast, nyTabellrad, stegPunkter } = await import("../../lib/projektstart.js");
const { STEG } = await import("../../data/projektstartSteg.js");

/* Ett fullt ifyllt utkast med långa texter i alla fält. Sidbrytningar hamnar då
   på många olika ställen, vilket fångade att den fasta sidfoten fick en orimlig
   höjd på vissa sidor och fällde hela PDF:en. */
function fulltUtkast(langd) {
  const u = tomtUtkast();
  const text = (n) => Array.from({ length: n }, (_, i) => `Mening ${i + 1} med lite innehåll om leveranser, kassaflöde och gränssnitt.`).join(" ");
  for (const s of STEG) for (const f of s.falt || []) if (f.typ === "textarea") u.v[f.id] = `${text(langd)}\n\n${text(2)}`;
  else if (f.typ === "text") u.v[f.id] = text(1);
  Object.assign(u.v, { namn: "Testpark 100MW", nr: "-", startdatum: "2027-02-01", fardigdatum: "2029-11-30" });
  // Fas 8 så att hela dokumentet renderas, med alla åtta faserna.
  u.fasGolv = 8;
  for (const s of STEG) if (s.tabell) u.rader[s.tabell.id] = Array.from({ length: 7 }, () => nyTabellrad(s.tabell, Object.fromEntries(s.tabell.kolumner.map((k) => [k.id, k.typ === "date" ? "2028-01-01" : k.typ === "select" ? (Array.isArray(k.alternativ[1]) ? k.alternativ[1][0] : k.alternativ[0]) : text(2)]))));
  for (const s of STEG) for (const p of stegPunkter(s).filter((_, i) => i % 3 === 0)) (u.kryss[p.bucket] ||= {})[p.id] = true;
  u.besokta = STEG.map((s) => s.id);
  return u;
}

describe("ProjektstartPdf", () => {
  it.each([1, 3, 6, 10])("renderar ett fullt utkast med långa texter (%i meningar per fält)", async (n) => {
    const u = fulltUtkast(n);
    const historik = [{ datum: "2026-10-06", av: "CK", fas: 6, skede: "Avslutat", nulage: "Första", klara: 10, totalt: 206, kritiskaOppna: 80 }];
    const d = projektstartDokument(u, { datum: "2026-10-06", skapadAv: "CK", historik, sparad: "2026-10-06" });
    const buf = await renderToBuffer(createElement(ProjektstartPdf, { dokument: d }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);

  it("renderar en tidig fas med bara de första sidorna, med fas och status i huvudet", async () => {
    const u = tomtUtkast();
    Object.assign(u.v, { namn: "Tidig park", bestallare: "Kund" });
    const d = projektstartDokument(u, { datum: "2026-10-09", skapadAv: "CK" });
    expect(d.projektstart.fas).toMatchObject({ nr: 1, omfattar: 1, antal: 8, status: "Planering och uppstart" });
    expect(d.projektstart.sektioner.every((x) => x.fasNr === 1)).toBe(true);
    const buf = await renderToBuffer(createElement(ProjektstartPdf, { dokument: d }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);
});


it("bevarar valt affärsskede oberoende av metodfas och renderar ledningsrapporten", async () => {
  const u = tomtUtkast();
  u.fasGolv = 2;
  Object.assign(u.v, { namn: "Svea Solar Fjällskär 50MW", bestallare: "Svea Solar", plats: "Nyköping, Fastighet Fjällskär 3:7", rapporteringsskede: "Inför anbudsinlämning", startdatum: "2027-01-15", nulage: "ONE Nordic räknar på en BoP-totalentreprenad för ett batterilager om 50 MW / 200 MWh. FFU har skickats till underleverantörer. Anbudsingång senast 21 oktober 2026. Tilldelning väntas i december 2026.", beslutLedning: "Godkännande av slutligt anbud till beställaren.", beslutSenast: "2026-10-30", nastaStegLedning: "Sammanställ UE-anbud och slutför kalkylen. Ansvarig: projektledaren." });
  const d = projektstartDokument(u, { datum: "2026-10-15", skapadAv: "Christoffer Karlsson" });
  expect(d.projektstart.lage).toMatchObject({ skede: "Inför anbudsinlämning", beslutSenast: "2026-10-30" });
  expect(d.projektstart.fas.nr).toBe(2);
  const { lasUtkast } = await import("../../lib/projektstart.js");
  expect(lasUtkast(JSON.stringify(u)).v.rapporteringsskede).toBe("Inför anbudsinlämning");
  const buf = await renderToBuffer(createElement(ProjektstartPdf, { dokument: d }));
  const { writeFileSync } = await import("node:fs");
  if (process.env.PDF_PREVIEW) writeFileSync(process.env.PDF_PREVIEW, buf);
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
}, 60_000);

it("visar anbudsskedet för ett nytt underlag", () => {
  const d = projektstartDokument(tomtUtkast(), { datum: "2026-10-15" });
  expect(d.projektstart.lage.skede).toBe("Inför anbudsinlämning");
});

it("renderar projektdirektivet för anbudsgenomgång utan uppstartsbilagor", async () => {
  const u = tomtUtkast();
  Object.assign(u.v, { namn: "Svea Solar Fjällskär 50MW", bestallare: "Svea Solar", plats: "Nyköping, Fastighet Fjällskär 3:7", rapporteringsskede: "Inför anbudsinlämning", bakgrund: "BoP-totalentreprenad för ett batterilager om 50 MW / 200 MWh.", syfte: "Ta fram anbud för intern ledningsgenomgång.", mal: "Bedöma omfattning, risker och resurser innan anbud lämnas.", ingar: "BoP enligt förfrågningsunderlaget.", ingarEj: "Avgränsningar behöver bekräftas i anbudsgenomgången.", anbudRiskbild: "Leveransfönster och geotekniska förutsättningar behöver bekräftas.", anbudTidplan: "Frågestopp 16 oktober. Anbud från underleverantörer senast 21 oktober. Tilldelning väntas i december 2026.", anbudHseq: "Arbetsmiljöansvar och BAS-U-organisation planeras inför uppstart.", anbudOrganisation: "Projektorganisation och överlämning fastställs efter tilldelning.", nulage: "Förfrågningsunderlag FFU 01–07 har skickats till underleverantörer.", beslutLedning: "Godkännande av slutligt anbud.", roll_pl: "Christoffer Karlsson" });
  const d = projektstartDokument(u, { datum: "2026-10-15", skapadAv: "Christoffer Karlsson" });
  expect(d.projektstart.fas.nr).toBe(1);
  expect(d.projektstart.direktiv).toHaveLength(6);
  expect(d.projektstart.sektioner.some((s) => s.fasNr > 1)).toBe(false);
  const buf = await renderToBuffer(createElement(ProjektstartPdf, { dokument: d }));
  if (process.env.PDF_ANBUD_PREVIEW) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.PDF_ANBUD_PREVIEW, buf);
  }
  expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
}, 60_000);
