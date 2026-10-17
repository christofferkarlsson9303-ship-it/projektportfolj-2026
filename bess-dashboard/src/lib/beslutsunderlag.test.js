import { describe, expect, it } from "vitest";
import { STEG } from "../data/projektstartSteg.js";
import { ANBUDSFRAGOR, anbudsfragaId } from "../data/anbudsfragor.js";
import { fasKrav, stegKrav } from "./projektfas.js";
import { projektstartDokument, tomtUtkast } from "./projektstart.js";
import { styrparametrar } from "./styrparametrar.js";

/* Projektstart fas 1 enligt ONE-P-projektdirektivet (beslut 2026-10-17):
   del Anbud och del Planering, fast frågelista, styrparametrar som summerar till 100 %
   och ett beslutsunderlag i PDF med signaturblock för intern beställare och projektledare. */

const fas1 = () => STEG.filter((s) => s.fas === 1);

describe("fas 1 i två delar", () => {
  it("Anbud: projektkort, avropsacceptans, anbudsfrågor, kontrakt. Planering: projektdirektiv, intressenter", () => {
    expect(fas1().map((s) => [s.del, s.id])).toEqual([
      ["Anbud", "projekt"],
      ["Anbud", "avrop"],
      ["Anbud", "anbudsfragor"],
      ["Anbud", "kontrakt"],
      ["Planering – projektdirektiv", "direktiv"],
      ["Planering – projektdirektiv", "intressenter"],
    ]);
  });

  it("avropsacceptans har ersättningsform och anbudsprocess", () => {
    const avrop = STEG.find((s) => s.id === "avrop");
    const ids = avrop.falt.map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["ersattningsform", "anbudsprocess", "anbudsdag", "sistaFragedag", "anbudGiltigt", "tilldelning"]));
    expect(avrop.falt.find((f) => f.id === "ersattningsform").obligatoriskt).toBe(true);
  });

  it("anbudsfrågorna är en fast lista där varje svar är obligatoriskt", () => {
    const steg = STEG.find((s) => s.id === "anbudsfragor");
    expect(steg.falt.map((f) => f.id)).toEqual(ANBUDSFRAGOR.map(anbudsfragaId));
    expect(steg.falt.every((f) => f.obligatoriskt && f.typ === "textarea")).toBe(true);
    const u = tomtUtkast();
    expect(stegKrav(u, steg)).toEqual({ totalt: ANBUDSFRAGOR.length, klara: 0 });
    for (const f of ANBUDSFRAGOR) u.v[anbudsfragaId(f)] = "Svar";
    expect(stegKrav(u, steg)).toEqual({ totalt: ANBUDSFRAGOR.length, klara: ANBUDSFRAGOR.length });
  });

  it("projektdirektivet har alla avsnitt i ONE-P-ordning, med nulägesanalys", () => {
    const etiketter = STEG.find((s) => s.id === "direktiv").falt.map((f) => f.etikett);
    const ordning = ["Bakgrund", "Syfte", "Mål", "Ingår", "Avgränsningar – ingår inte", "Identifierade risker", "Övergripande tidplan och kontraktsdatum", "Nulägesanalys", "HSEQ och BAS-U", "Organisation och överlämning", "Rapportering till kund", "Intern rapportering", "Kostnad (%)", "Kvalitet (%)", "Tid (%)", "Vad får ge vika först?"];
    const plats = ordning.map((e) => etiketter.findIndex((x) => x.startsWith(e)));
    expect(plats.every((i) => i >= 0)).toBe(true);
    expect([...plats].sort((a, b) => a - b)).toEqual(plats);
  });
});

describe("styrparametrar", () => {
  it("kräver tre tal mellan 0 och 100 som summerar till 100", () => {
    expect(styrparametrar({ prioritetKostnad: "60", prioritetKvalitet: "10", prioritetTid: "30" })).toMatchObject({ summa: 100, giltig: true });
    expect(styrparametrar({ prioritetKostnad: "60", prioritetKvalitet: "10", prioritetTid: "20" })).toMatchObject({ summa: 90, giltig: false });
    expect(styrparametrar({ prioritetKostnad: "33,5", prioritetKvalitet: "33,5", prioritetTid: "33" })).toMatchObject({ summa: 100, giltig: true });
    expect(styrparametrar({ prioritetKostnad: "120", prioritetKvalitet: "-10", prioritetTid: "-10" }).giltig).toBe(false);
    expect(styrparametrar({ prioritetKostnad: "", prioritetKvalitet: "50", prioritetTid: "50" })).toMatchObject({ ifyllda: 2, giltig: false });
  });

  it("fas 1 godkänns inte förrän fördelningen är 100 %", () => {
    const u = tomtUtkast();
    const regel = () => fasKrav(u, 1).falt.find((f) => f.id === "styrparametrar100");
    expect(regel()).toMatchObject({ stegId: "direktiv", etikett: "Kostnad, kvalitet och tid summerar till 100 %" });
    Object.assign(u.v, { prioritetKostnad: "50", prioritetKvalitet: "20", prioritetTid: "20" });
    expect(regel()).toBeTruthy();
    u.v.prioritetTid = "30";
    expect(regel()).toBeUndefined();
  });
});

describe("beslutsunderlaget", () => {
  const ifyllt = () => {
    const u = tomtUtkast();
    Object.assign(u.v, {
      namn: "Batteripark Test", bestallare: "Kund AB", kontraktsform: "ABT 06", ersattningsform: "Fast pris",
      anbudsprocess: "Frågetid pågår", anbudsdag: "2026-11-02", anbudsutfall: "Anbudsarbete pågår",
      bakgrund: "Bakgrund", syfte: "Syfte", mal: "Mål", nulagesanalys: "Nuläget är …",
      prioritetKostnad: "60", prioritetKvalitet: "10", prioritetTid: "30", offra: "Kvalitet",
      roll_pl: "Pia Ledare", roll_internalClient: "Ivar Beställare", signPL: "", signBestallare: "",
    });
    u.v[anbudsfragaId(ANBUDSFRAGOR[0])] = "Allt utom nätanslutningen.";
    return u;
  };

  it("har del 1 Anbud med entreprenadform, anbudsprocess och frågor med svar", () => {
    const d = projektstartDokument(ifyllt(), { datum: "2026-10-17" }).projektstart;
    expect(d.anbud.map((x) => x.titel)).toEqual(["Entreprenadform och anbudsprocess", "Svar på anbudsfrågor", "Avropsbeslut, kontrakt och kassaflöde"]);
    const process = Object.fromEntries(d.anbud[0].falt.map(([k, v]) => [k, v]));
    expect(process).toMatchObject({ "Entreprenadform (kontraktsform)": "ABT 06", Ersättningsform: "Fast pris", "Anbudsprocessen just nu": "Frågetid pågår", "Anbudet lämnas senast": "2026-11-02" });
    const fragor = d.anbud[1].falt;
    expect(fragor).toHaveLength(ANBUDSFRAGOR.length);
    expect(fragor[0].slice(0, 2)).toEqual([ANBUDSFRAGOR[0].fraga, "Allt utom nätanslutningen."]);
    expect(fragor[0][2]).toEqual([{ typ: "stycke", text: "Allt utom nätanslutningen." }]);
    expect(fragor[1][1]).toBe("Ej besvarad");
  });

  it("del 2 Planering har nulägesanalys och styrparametrar med summa", () => {
    const d = projektstartDokument(ifyllt(), { datum: "2026-10-17" }).projektstart;
    const allt = d.direktiv.flatMap((x) => x.falt.map(([k, v]) => [k, v]));
    expect(allt).toEqual(expect.arrayContaining([["Nulägesanalys", "Nuläget är …"], ["Styrparametrar", "Kostnad 60 %, kvalitet 10 %, tid 30 % (summa 100 %)."]]));
  });

  it("signaturblocket har intern beställare och projektledare med namn ur direktivet", () => {
    const u = ifyllt();
    let s = projektstartDokument(u, { datum: "2026-10-17" }).projektstart.signering;
    expect(s).toEqual([{ roll: "Intern beställare", namn: "Ivar Beställare", datum: "" }, { roll: "Projektledare", namn: "Pia Ledare", datum: "" }]);
    Object.assign(u.v, { signPL: "Pia L", signBestallare: "Ivar B", signDatum: "2026-10-20" });
    s = projektstartDokument(u, { datum: "2026-10-17" }).projektstart.signering;
    expect(s).toEqual([{ roll: "Intern beställare", namn: "Ivar B", datum: "2026-10-20" }, { roll: "Projektledare", namn: "Pia L", datum: "2026-10-20" }]);
  });
});
