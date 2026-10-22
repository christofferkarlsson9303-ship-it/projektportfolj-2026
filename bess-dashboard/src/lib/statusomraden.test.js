import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import {
  INTERNA_OMRADEN,
  KUNDOMRADEN,
  ekonomiStatus,
  eskaleratStatus,
  nyStatusrapport,
  nyckeltalFor,
  rapporterFor,
  resurserStatus,
  riskerStatus,
  statusOmraden,
  toppRisker,
} from "./statusomraden.js";

const PID = "36037";
const state = () => structuredClone(SEED);

describe("status per område", () => {
  it("ger ett förslag med ton, text och regel för varje område", () => {
    const f = statusOmraden(state(), PID, { nu: "2026-10-22" });
    for (const o of [...new Set([...KUNDOMRADEN, ...INTERNA_OMRADEN])]) {
      expect(["ok", "warn", "bad", "neutral"], o).toContain(f[o].ton);
      expect(f[o].text, o).toBeTruthy();
      expect(f[o].regel, o).toBeTruthy();
    }
  });

  it("inget riskregister är inget underlag, inte grönt; en hög risk är röd", () => {
    const s = state();
    s.risker = [];
    expect(riskerStatus(s, PID).ton).toBe("neutral");
    s.risker = [{ id: "x", projektId: PID, titel: "Fundament", sannolikhet: 4, konsekvens: 4, status: "oppen" }];
    expect(riskerStatus(s, PID).ton).toBe("bad");
    s.risker[0].status = "stangd";
    expect(riskerStatus(s, PID).ton).toBe("ok");
  });

  it("risker för båda projekten räknas på varje projekt", () => {
    const s = state();
    s.risker = [{ id: "x", projektId: "bada", titel: "Leverans", sannolikhet: 3, konsekvens: 3, status: "oppen" }];
    expect(riskerStatus(s, PID).ton).toBe("warn");
    expect(toppRisker(s, PID)).toHaveLength(1);
  });

  it("kundens ekonomi visar kontrakt och ÄTA, aldrig budget eller utfall", () => {
    const kund = ekonomiStatus(state(), PID, { kund: true });
    expect(kund.text).not.toMatch(/budget|utfall/i);
    expect(ekonomiStatus(state(), PID).text).toMatch(/budget|Ingen budget/i);
  });

  it("kundens resurser nämner inga namn", () => {
    const s = state();
    s.bemanning = [{ id: "b1", personId: "me1", projektId: PID, vecka: "2026-v43", timmar: 60 }];
    const intern = resurserStatus(s, PID, { vecka: "2026-v43" });
    const kund = resurserStatus(s, PID, { kund: true, vecka: "2026-v43" });
    expect(intern.ton).toBe("warn");
    expect(intern.text).toContain("Christoffer Karlsson");
    expect(kund.text).not.toContain("Christoffer");
    expect(resurserStatus({ ...s, bemanning: [] }, PID, { vecka: "2026-v43" }).ton).toBe("neutral");
  });

  it("egna eskalerade frågor ger gul tills de är beslutade", () => {
    const s = { ...state(), flaggor: [] };
    const fragor = [{ id: "e1", beskrivning: "Byte av UE för betong", status: "Öppen" }];
    expect(eskaleratStatus(s, "inget-projekt", fragor).ton).toBe("warn");
    expect(eskaleratStatus(s, "inget-projekt", [{ ...fragor[0], status: "Beslutad" }]).ton).toBe("ok");
  });
});

describe("intern statusrapport", () => {
  it("ny rapport har förslagen som ljus och inga frysta nyckeltal", () => {
    const s = state();
    const rap = nyStatusrapport(s, PID, "2026-10");
    expect(rap).toMatchObject({ id: "sr-36037-2026-10", projektId: PID, period: "2026-10", status: "utkast", nyckeltal: null });
    expect(Object.keys(rap.omraden)).toEqual(INTERNA_OMRADEN);
  });

  it("föregående är den senaste rapporten före perioden", () => {
    const s = state();
    s.statusrapporter = [
      { ...nyStatusrapport(s, PID, "2026-08"), status: "last" },
      { ...nyStatusrapport(s, PID, "2026-09"), status: "last" },
      nyStatusrapport(s, PID, "2026-10"),
      nyStatusrapport(s, "36038", "2026-09"),
    ];
    const r = rapporterFor(s, PID, "2026-10");
    expect(r.aktuell.period).toBe("2026-10");
    expect(r.foregaende.period).toBe("2026-09");
    expect(r.alla).toHaveLength(3);
  });

  it("nyckeltalen tar inte med kontraktsvärdet (det ligger i ekonomidokumentet)", () => {
    const n = nyckeltalFor(state(), PID, "2026-10-22");
    expect(Object.keys(n)).toEqual(["slutPrognos", "forsening", "budget", "utfall", "ataGodkant", "ataVantar", "ataOppna", "oppnaRisker"]);
  });
});
