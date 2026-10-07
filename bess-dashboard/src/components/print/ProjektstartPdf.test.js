import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { createElement } from "react";

// Logotypen är en Vite-asset i appen. I Node pekar vi den till filen på disk.
vi.mock("../../assets/one-nordic-logo.png", () => ({ default: path.resolve("src/assets/one-nordic-logo.png") }));

const { renderToBuffer } = await import("@react-pdf/renderer");
const { ProjektstartPdf } = await import("./ProjektstartPdf.jsx");
const { projektstartDokument, tomtUtkast, nyTabellrad, stegPunkter, stegTabeller } = await import("../../lib/projektstart.js");
const { STEG } = await import("../../data/projektstartSteg.js");

/* Ett fullt ifyllt utkast med långa texter i alla fält. Sidbrytningar hamnar då
   på många olika ställen, vilket fångade att den fasta sidfoten fick en orimlig
   höjd på vissa sidor och fällde hela PDF:en. */
function fulltUtkast(langd) {
  const u = tomtUtkast();
  const text = (n) => Array.from({ length: n }, (_, i) => `Mening ${i + 1} med lite innehåll om leveranser, kassaflöde och gränssnitt.`).join(" ");
  for (const s of STEG)
    for (const f of s.falt || [])
      if (f.typ === "textarea") u.v[f.id] = `${text(langd)}\n\n${text(2)}`;
      else if (f.typ === "text") u.v[f.id] = text(1);
  Object.assign(u.v, { namn: "Testpark 100MW", nr: "-", startdatum: "2027-02-01", fardigdatum: "2029-11-30", skede: "Anbud" });
  for (const tb of STEG.flatMap(stegTabeller))
    u.rader[tb.id] = Array.from({ length: 7 }, () =>
      nyTabellrad(
        tb,
        Object.fromEntries(
          tb.kolumner.map((k) => [k.id, k.typ === "date" ? "2028-01-01" : k.typ === "number" ? "10" : k.typ === "select" ? k.alternativ[0] : text(2)]),
        ),
      ),
    );
  for (const s of STEG) for (const p of stegPunkter(s).filter((_, i) => i % 3 === 0)) (u.kryss[p.bucket] ||= {})[p.id] = true;
  u.besokta = STEG.map((s) => s.id);
  return u;
}

describe("ProjektstartPdf", () => {
  it.each([1, 3, 6, 10])(
    "renderar ett fullt utkast med långa texter (%i meningar per fält)",
    async (n) => {
      const u = fulltUtkast(n);
      const historik = [{ datum: "2026-10-06", av: "CK", skede: "Anbud", nulage: "Första", klara: 10, totalt: 206, kritiskaOppna: 80 }];
      const d = projektstartDokument(u, { datum: "2026-10-06", skapadAv: "CK", historik, sparad: "2026-10-06" });
      const buf = await renderToBuffer(createElement(ProjektstartPdf, { dokument: d }));
      expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    },
    60_000,
  );

  it("renderar projektstart utan ledningsunderlag i andra skeden", async () => {
    const u = fulltUtkast(2);
    u.v.skede = "Planering";
    const d = projektstartDokument(u, { datum: "2026-10-07" });
    expect(d.projektstart.ledning).toBeNull();
    const buf = await renderToBuffer(createElement(ProjektstartPdf, { dokument: d }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);
});
