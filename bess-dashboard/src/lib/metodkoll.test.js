import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { interfacelage, losningslage, trafikljus } from "./metodkoll.js";
import { rutinFor } from "../data/veckorutin.js";
import { GILTIGA_VYER } from "../data/vyer.js";
import { VECKORUTIN } from "../data/veckorutin.js";

const NU = "2026-09-26";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NU + "T10:00:00+02:00"));
});
afterEach(() => vi.useRealTimers());

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const skapa = (s, pid = "36037") => reducer(s, { type: "PROJEKTSTART_SKAPA", pid });

describe("interface-listan", () => {
  it("saknas tills den skapas, och skapas med metodens fem gränssnitt", () => {
    let s = seed();
    expect(interfacelage(s, "36037", NU).finns).toBe(false);
    s = skapa(s);
    const l = interfacelage(s, "36037", NU);
    expect(l.finns).toBe(true);
    expect(l.rader.map((r) => r.granssnitt)).toEqual(["Mark/betong ↔ el", "Leverantör ↔ site", "El/MV ↔ nätägare", "Kommunikation", "Brand ↔ drift"]);
    expect(l.rader.every((r) => r.lage === "ejbedomd")).toBe(true);
    expect(reducer(s, { type: "PROJEKTSTART_SKAPA", pid: "36037" })).toBe(s);
  });

  it("en skapad projektstart har projektkortets fält, så att en senare sparning inte rensar dem", () => {
    const s = skapa(seed());
    const p = s.projekt.find((x) => x.id === "36037");
    const v = s.projektstart.find((x) => x.projektId === "36037").utkast.v;
    expect(v).toMatchObject({ namn: p.namn, nr: p.nr || "", plats: p.ort || "", fardigdatum: p.fardigstallande || "" });
  });

  it("ett datum som inte finns i kalendern räknas inte som avstämt", () => {
    let s = skapa(seed());
    const rad = interfacelage(s, "36037", NU).rader[0];
    const satt = (st, falt, varde) => reducer(st, { type: "PROJEKTSTART_RAD", pid: "36037", tabell: "interface", radId: rad.id, falt, varde });
    s = satt(satt(s, "status", "Klart"), "avstamd", "2026-09-31");
    expect(interfacelage(s, "36037", "2026-10-02").rader[0]).toMatchObject({ lage: "gammal", dagarSedan: null });
  });

  it("är avstämd först med status och datum inom sju dagar; Oklart vinner alltid", () => {
    let s = skapa(seed());
    const rad = interfacelage(s, "36037", NU).rader[0];
    const satt = (st, falt, varde) => reducer(st, { type: "PROJEKTSTART_RAD", pid: "36037", tabell: "interface", radId: rad.id, falt, varde });
    s = satt(s, "status", "Klart");
    expect(interfacelage(s, "36037", NU).rader[0].lage).toBe("gammal");
    s = satt(s, "avstamd", "2026-09-22");
    expect(interfacelage(s, "36037", NU).rader[0].lage).toBe("ok");
    expect(interfacelage(s, "36037", "2026-10-05").rader[0].lage).toBe("gammal");
    s = satt(s, "status", "Oklart");
    expect(interfacelage(s, "36037", NU).rader[0].lage).toBe("oklart");
    expect(s.andringslogg[0].text).toContain("Interface-lista: Mark/betong ↔ el status → Oklart");
  });
});

describe("godkänd lösning", () => {
  it("kräver alla kritiska punkter i Grind före inköp", () => {
    let s = seed();
    expect(losningslage(s, "36037")).toMatchObject({ finns: false, godkand: false });
    s = skapa(s);
    const l = losningslage(s, "36037");
    expect(l.saknas.length).toBe(l.totalt);
    const post = s.projektstart.find((x) => x.projektId === "36037");
    const kryss = { solution: Object.fromEntries(["docs", "internalOk", "lead", "cashOk", "noBuy"].map((id) => [id, true])) };
    s = { ...s, projektstart: [{ ...post, utkast: { ...post.utkast, kryss } }] };
    expect(losningslage(s, "36037")).toMatchObject({ godkand: true, saknas: [] });
  });
});

describe("trafikljus", () => {
  it("ger fyra ljus och ett samlat som är det sämsta", () => {
    const t = trafikljus(seed(), "36037", NU);
    for (const k of ["tid", "budget", "arbete", "milstolpar"]) expect(["ok", "warn", "bad", "neutral"]).toContain(t[k].ton);
    const varre = { neutral: 0, ok: 1, warn: 2, bad: 3 };
    expect(varre[t.samlad]).toBe(Math.max(...["tid", "budget", "arbete", "milstolpar"].map((k) => varre[t[k].ton])));
  });

  it("säger att underlag saknas för ett projekt utan plan", () => {
    const t = trafikljus(seed(), "goteborg", NU);
    expect(t.tid.ton).toBe("neutral");
    expect(t.arbete.ton).toBe("neutral");
  });
});

describe("veckorutin", () => {
  it("har en rutin måndag–fredag med giltiga vyer och ingen på helgen", () => {
    expect(rutinFor(new Date("2026-10-26T09:00:00"))?.dag).toBe("Måndag");
    expect(rutinFor(new Date("2026-10-30T09:00:00"))?.fokus).toBe("Framåtblick");
    expect(rutinFor(new Date("2026-10-25T09:00:00"))).toBe(null);
    for (const r of Object.values(VECKORUTIN)) for (const [id] of r.vyer) expect(GILTIGA_VYER.has(id)).toBe(true);
  });
});
