import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { KATALOG } from "../data/projektstartKatalog.js";
import { PROJEKTKONTROLL_REVISION, PROJEKTMALLAR } from "../data/projektkontroll.js";
import { PUNKT_FOR_ID } from "../data/bessChecklistData.ts";
import { EGENKONTROLL_STYRKER, SAMMA_PUNKT } from "../data/punktlankar.js";
import { epcForProjektstart, medLankadeKryss, projektstartForEpc } from "./punktlankar.js";
import { kontrollId } from "./projektkontroll.js";
import { punktlage } from "./epc.js";
import { projektstartPost, tomtUtkast } from "./projektstart.js";

const seed = () => efterInlasning(normalisera(structuredClone(SEED)));
const medPost = (s, pid = "36037") => ({ ...s, projektstart: [...(s.projektstart || []), projektstartPost(pid, tomtUtkast())] });
const post = (s, pid = "36037") => s.projektstart.find((x) => x.projektId === pid);

describe("kopplingarna", () => {
  it("pekar på punkter som finns, åt båda hållen", () => {
    expect(SAMMA_PUNKT).toHaveLength(6);
    for (const [b, id, epc] of SAMMA_PUNKT) {
      expect(KATALOG[b].some((p) => p.id === id)).toBe(true);
      expect(PUNKT_FOR_ID.has(epc)).toBe(true);
      expect(epcForProjektstart(b, id)).toBe(epc);
      expect(projektstartForEpc(epc)).toEqual([b, id]);
    }
    const ek = new Set(PROJEKTMALLAR.flatMap((m) => m.punkter.map((p) => p.id)));
    for (const [id, epc] of EGENKONTROLL_STYRKER) {
      expect(ek.has(id)).toBe(true);
      expect(PUNKT_FOR_ID.has(epc)).toBe(true);
    }
  });
});

describe("en bock slår igenom på båda", () => {
  it("en bock i Bygga batteripark kryssar projektstarten, och återöppning tar bort krysset", () => {
    let s = medPost(seed());
    s = reducer(s, { type: "EPC_PUNKT", pid: "36037", punkt: "5.10", status: "klar" });
    expect(post(s).utkast.kryss.hseq.hotwork).toBe(true);
    s = reducer(s, { type: "EPC_PUNKT", pid: "36037", punkt: "5.10", status: "" });
    expect(post(s).utkast.kryss.hseq?.hotwork).toBeUndefined();
    // Ej aktuell ändrar inte projektstarten, och en okopplad punkt rör den inte.
    s = reducer(s, { type: "EPC_PUNKT", pid: "36037", punkt: "5.10", status: "ejaktuell" });
    expect(post(s).utkast.kryss.hseq?.hotwork).toBeUndefined();
    const fore = post(s);
    s = reducer(s, { type: "EPC_PUNKT", pid: "36037", punkt: "10.7", status: "klar" });
    expect(post(s)).toBe(fore);
  });

  it("guiden tar med EPC-bockar när den öppnas, men rör inte befintliga kryss", () => {
    let s = reducer(seed(), { type: "EPC_PUNKT", pid: "36037", punkt: "1.1", status: "klar" });
    const u = medLankadeKryss(tomtUtkast(), s, "36037");
    expect(u.kryss.org.security).toBe(true);
    const utan = tomtUtkast();
    expect(medLankadeKryss(utan, seed(), "36037")).toBe(utan);
  });

  it("en verifierad egenkontroll B.02 bockar 12.1", () => {
    const i = PROJEKTMALLAR.findIndex((m) => m.punkter.some((p) => p.id === "B.02"));
    let s = seed();
    expect(punktlage(s, "goteborg").get("12.1").status).toBe("oppen");
    s = { ...s, faltkontroller: [...(s.faltkontroller || []), { id: kontrollId("goteborg", "Hela anläggningen", "B.02"), projektId: "goteborg", punktId: "B.02", omfattning: "Hela anläggningen", resultat: "ok", datum: "2026-09-20", kontrollant: "C. Karlsson", referens: "Protokoll 7", mallrevision: PROJEKTKONTROLL_REVISION }] };
    expect(i).toBeGreaterThanOrEqual(0);
    expect(punktlage(s, "goteborg").get("12.1")).toMatchObject({ status: "klar", kalla: "egenkontroll", kontroll: "B.02" });
  });
});
