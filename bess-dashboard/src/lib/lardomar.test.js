import { describe, expect, it } from "vitest";
import { SEED } from "../data/seed.js";
import { ALLA_PUNKTER } from "../data/bessChecklistData.ts";
import { efterInlasning, normalisera } from "../state/portfolj-reducer.js";
import { lardomarForMoment } from "./epc.js";
import { arbetslistaDokument } from "./snabbutskrift.js";
import { nastaAtgard } from "./projektlage.js";

/* Erfarenhetsåterföring där den behövs: på arbetslistan för uppgifternas moment,
   och vid nästa åtgärd i Idag. Bara andra projekts lärdomar, bara de med råd. */

const NU = "2026-10-30";
const bas = efterInlasning(normalisera(structuredClone(SEED)));
const MOMENT = 11;
const kp = ALLA_PUNKTER.find((p) => p.fas === MOMENT);
const annanKp = ALLA_PUNKTER.find((p) => p.fas === 3);

function medKommentarer(state, kommentarer) {
  return { ...state, epcKommentarer: kommentarer.map((k, i) => ({ id: `ek${i}`, typ: "lardom", paverkan: 2, datum: "2026-09-01", av: "", kostnad: "", text: "Händelse", ...k })) };
}

describe("lardomarForMoment", () => {
  const state = medKommentarer(bas, [
    { projektId: "36038", punkt: kp.id, gorSa: "Boka kranen två veckor tidigare", paverkan: 3 },
    { projektId: "36038", punkt: kp.id, gorSa: "" }, // ingen gör-så-text: tas inte med
    { projektId: "36037", punkt: kp.id, gorSa: "Egen lärdom i samma projekt" }, // eget projekt: tas inte med
    { projektId: "36038", punkt: annanKp.id, gorSa: "Gäller ett annat moment" },
  ]);

  it("ger andra projekts råd för valda moment, med projektets nummer", () => {
    expect(lardomarForMoment(state, "36037", [MOMENT])).toEqual([{ text: "Boka kranen två veckor tidigare", fran: "36038", moment: MOMENT }]);
  });

  it("inga moment ger inga råd, och max begränsar", () => {
    expect(lardomarForMoment(state, "36037", [])).toEqual([]);
    expect(lardomarForMoment(state, "36037", [MOMENT, 3], 1)).toHaveLength(1);
  });

  it("arbetslistan får råden för uppgifternas moment", () => {
    const medUppgift = {
      ...state,
      punkter: [...state.punkter, { id: "pk", projektId: "36037", titel: "Lyft containrar", status: "oppen", forfaller: "2026-11-05", moment: MOMENT, momentKalla: "vald" }],
    };
    const d = arbetslistaDokument(medUppgift, medUppgift.projekt.find((p) => p.id === "36037"), { ids: ["pk"] });
    expect(d.uppgifter[0].moment).toBe(MOMENT);
    expect(d.lardomar.map((l) => l.text)).toEqual(["Boka kranen två veckor tidigare"]);
  });
});

describe("nastaAtgard – lärdomar", () => {
  it("räknar lärdomar från andra projekt på exakt den punkt som är nästa åtgärd", () => {
    const utan = nastaAtgard(bas, "36037", NU);
    expect(utan?.post).toMatch(/^kp-/);
    expect(utan.lardomar).toBe(0);
    const punktId = utan.post.slice(3);
    const med = nastaAtgard(medKommentarer(bas, [{ projektId: "36038", punkt: punktId, gorSa: "Gör så här" }, { projektId: "36037", punkt: punktId }]), "36037", NU);
    expect(med.lardomar).toBe(1);
  });
});
