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
