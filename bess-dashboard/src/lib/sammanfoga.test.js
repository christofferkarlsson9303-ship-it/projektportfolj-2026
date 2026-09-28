import { describe, expect, it } from "vitest";
import { sammanfoga } from "./sammanfoga.js";

const bas = {
  risker: [
    { id: "r1", titel: "Leverans trafo", status: "Öppen", sannolikhet: 3 },
    { id: "r2", titel: "Markförhållanden", status: "Öppen", sannolikhet: 2 },
  ],
  installningar: { vecka: 39, tema: "ljus" },
  taggar: ["a", "b"],
};
const kopia = () => structuredClone(bas);

describe("sammanfoga", () => {
  it("behåller den andras ändring när bara den andra ändrat", () => {
    const deras = kopia();
    deras.risker[0].status = "Stängd";
    const { varde, konflikter } = sammanfoga(bas, kopia(), deras);
    expect(varde.risker[0].status).toBe("Stängd");
    expect(konflikter).toEqual([]);
  });

  it("två personer som ändrar olika rader får båda behålla sina ändringar", () => {
    const mina = kopia();
    mina.risker[0].status = "Stängd";
    const deras = kopia();
    deras.risker[1].sannolikhet = 4;
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(varde.risker[0].status).toBe("Stängd");
    expect(varde.risker[1].sannolikhet).toBe(4);
    expect(konflikter).toEqual([]);
  });

  it("olika fält på samma rad slås ihop", () => {
    const mina = kopia();
    mina.risker[0].status = "Stängd";
    const deras = kopia();
    deras.risker[0].sannolikhet = 5;
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(varde.risker[0]).toMatchObject({ status: "Stängd", sannolikhet: 5 });
    expect(konflikter).toEqual([]);
  });

  it("samma fält ändrat olika: min version gäller och det rapporteras", () => {
    const mina = kopia();
    mina.risker[0].status = "Stängd";
    const deras = kopia();
    deras.risker[0].status = "Bevakas";
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(varde.risker[0].status).toBe("Stängd");
    expect(konflikter).toEqual(["risker[r1].status"]);
  });

  it("rader som läggs till på båda håll finns med efteråt", () => {
    const mina = kopia();
    mina.risker.push({ id: "r3", titel: "Min nya" });
    const deras = kopia();
    deras.risker.push({ id: "r4", titel: "Deras nya" });
    const { varde } = sammanfoga(bas, mina, deras);
    expect(varde.risker.map((r) => r.id)).toEqual(["r1", "r2", "r4", "r3"]);
  });

  it("en borttagen rad förblir borttagen om den andra inte rört den", () => {
    const mina = kopia();
    mina.risker = mina.risker.filter((r) => r.id !== "r2");
    const deras = kopia();
    deras.installningar.vecka = 40;
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(varde.risker.map((r) => r.id)).toEqual(["r1"]);
    expect(varde.installningar.vecka).toBe(40);
    expect(konflikter).toEqual([]);
  });

  it("borttagen hos en men ändrad hos den andra: ändringen behålls", () => {
    const mina = kopia();
    mina.risker = mina.risker.filter((r) => r.id !== "r2");
    const deras = kopia();
    deras.risker[1].status = "Stängd";
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(varde.risker.find((r) => r.id === "r2").status).toBe("Stängd");
    expect(konflikter).toEqual(["risker[r2]"]);
  });

  it("listor utan id behandlas som ett värde", () => {
    const mina = kopia();
    mina.taggar = ["a", "b", "c"];
    const deras = kopia();
    deras.taggar = ["a"];
    const { varde, konflikter } = sammanfoga(bas, mina, deras);
    expect(varde.taggar).toEqual(["a", "b", "c"]);
    expect(konflikter).toEqual(["taggar"]);
  });

  it("nya nycklar på båda håll tas med", () => {
    const mina = { ...kopia(), minNyckel: 1 };
    const deras = { ...kopia(), derasNyckel: 2 };
    const { varde } = sammanfoga(bas, mina, deras);
    expect(varde).toMatchObject({ minNyckel: 1, derasNyckel: 2 });
  });

  it("utan bas (inget gemensamt läge) vinner min version vid skillnad", () => {
    const { varde, konflikter } = sammanfoga(undefined, { a: 1 }, { a: 2 });
    expect(varde).toEqual({ a: 1 });
    expect(konflikter).toEqual(["a"]);
  });
});
