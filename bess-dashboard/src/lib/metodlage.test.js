import { describe, expect, it } from "vitest";
import { metodStegLage } from "./metodlage.js";
const fas = (status, passerad = false) => ({ status, grind: { passerad } });
describe("Projektmetodens fasgrindar", () => {
  it("visar passerade grindar utan att kalla provresultat verifierade", () => {
    expect(metodStegLage([fas("klar", true), fas("klar", true)])).toMatchObject({ totalt: 2, passerade: 2, procent: 100, ton: "ok", text: "Grindar passerade" });
  });
  it("prioriterar ett försenat öppet moment framför en redan passerad grind", () => {
    expect(metodStegLage([fas("klar", true), fas("sen")])).toMatchObject({ procent: 50, ton: "bad", text: "Försenat enligt plan" });
  });
  it("visar delvis genomfört steg som pågående även med kommande moment", () => {
    expect(metodStegLage([fas("klar", true), fas("kommande"), fas("kommande")])).toMatchObject({ procent: 33, ton: "warn", text: "Pågår" });
  });
  it("hittar inte på framdrift när datum eller moment saknas", () => {
    expect(metodStegLage([fas("odaterad")])).toMatchObject({ procent: 0, ton: "neutral", text: "Datum saknas" });
    expect(metodStegLage([])).toMatchObject({ procent: 0, totalt: 0, text: "Inga moment" });
  });
});
