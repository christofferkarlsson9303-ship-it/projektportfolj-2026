import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { efterInlasning, normalisera, reducer } from "../state/portfolj-reducer.js";
import { forslagCsv } from "./importera.js";
import { nyttId } from "./id.js";
import { angraFakturaunderlag, skapaFakturaunderlag } from "./planering.js";

const bas = () => efterInlasning(normalisera(structuredClone(SEED)));

describe("id för nya rader", () => {
  it("är unika även när de skapas i samma millisekund", () => {
    const ider = new Set(Array.from({ length: 500 }, () => nyttId("ak")));
    expect(ider.size).toBe(500);
    expect([...ider][0].startsWith("ak")).toBe(true);
  });
});

describe("fakturanummer", () => {
  it("återanvänds inte efter att ett mellanliggande underlag ångrats", () => {
    let s = bas();
    const pid = s.projekt[0].id;
    const tid = (i) => ({ id: `t${i}`, datum: `2026-10-0${i}`, personId: "x", projektId: pid, timmar: 1, ot: 1, debiterbar: true, fakturerad: false });
    const skapa = (i, id) => {
      s = { ...s, tidrader: [...s.tidrader, tid(i)] };
      s = skapaFakturaunderlag(s, pid, `2026-10-0${i}`);
      s.fakturor[s.fakturor.length - 1].id = id; // id:n är tidsbaserade i testet annars
    };
    skapa(1, "fuA");
    skapa(2, "fuB");
    skapa(3, "fuC");
    s = angraFakturaunderlag(s, "fuB");
    skapa(4, "fuD");
    const nr = s.fakturor.filter((f) => f.projektId === pid).map((f) => f.nr);
    expect(nr).toEqual(["FU001", "FU003", "FU004"]);
  });
});

describe("CSV-import av nya rader", () => {
  it("behåller id-fält som text och tolkar booleaner efter befintliga rader", () => {
    const s = bas();
    s.tidrader = [{ id: "td1", datum: "2026-10-01", personId: "p1", projektId: "36037", timmar: 4, ot: 1, debiterbar: true, fakturerad: false }];
    const csv = "id;projektId;personId;timmar;debiterbar;fakturerad\ntdNY;36037;p1;8;false;true\n";
    const f = forslagCsv(s, csv, { filnamn: "Portfolj_Tidrapport_2026-10-18.csv", lista: "tidrader" });
    expect(f.nya).toHaveLength(1);
    expect(f.nya[0].projektId).toBe("36037");
    expect(f.nya[0].timmar).toBe(8);
    expect(f.nya[0].debiterbar).toBe(false);
    expect(f.nya[0].fakturerad).toBe(true);
  });

  it("använder bara första raden när ett id förekommer flera gånger", () => {
    const s = bas();
    const csv = "id;namn\nx1;Första\nx1;Andra\n";
    const f = forslagCsv(s, csv, { filnamn: "Portfolj_Kontakter_2026-10-18.csv", lista: "kontakter" });
    expect(f.nya).toHaveLength(1);
    expect(f.nya[0].namn).toBe("Första");
    expect(f.varningar.join(" ")).toMatch(/flera gånger/);
  });
});

describe("rondavvikelser", () => {
  it("statusbyte loggas, andra fält ändrar inte loggen", () => {
    let s = bas();
    s = { ...s, hseqRonder: [{ id: "r1", projektId: "36037", datum: "2026-10-01", avvikelser: [{ id: "a1", text: "Saknad avspärrning", status: "oppen" }] }] };
    const fore = (s.andringslogg || []).length;
    const roll = reducer(s, { type: "UPPD_RONDAVVIKELSE", id: "a1", falt: "roll", varde: "UE" });
    expect(roll.andringslogg.length).toBe(fore);
    const status = reducer(s, { type: "UPPD_RONDAVVIKELSE", id: "a1", falt: "status", varde: "atgardad" });
    expect(status.hseqRonder[0].avvikelser[0].status).toBe("atgardad");
    expect(status.andringslogg.length).toBe(fore + 1);
    expect(status.andringslogg[0].text).toMatch(/Saknad avspärrning.*oppen → atgardad/);
  });
});
