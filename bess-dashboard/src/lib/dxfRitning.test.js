import { describe, expect, it } from "vitest";
import { dxfEnhet, dxfGeometri, dxfText, dxfUnderlag, lasDxf, rensaMtext } from "./dxfRitning.js";
import { placeraEfterEtiketter, ritningsMatt } from "./ritningar.js";

/* En liten DXF byggd som text: grupp-kod och värde på var sin rad. */
const rad = (...par) => par.flat(Infinity).join("\n");
const g = (kod, v) => [String(kod), String(v)];

function dxf({ insunits = 4, extra = [], lager = [], block = [] } = {}) {
  return rad(
    g(0, "SECTION"), g(2, "HEADER"), ...(insunits === null ? [] : [g(9, "$INSUNITS"), g(70, insunits)]), g(0, "ENDSEC"),
    g(0, "SECTION"), g(2, "TABLES"), g(0, "TABLE"), g(2, "LAYER"),
    ...lager.map(([namn, farg, flagga = 0]) => [g(0, "LAYER"), g(2, namn), g(70, flagga), g(62, farg), g(6, "CONTINUOUS")]),
    g(0, "ENDTAB"), g(0, "ENDSEC"),
    g(0, "SECTION"), g(2, "BLOCKS"), ...block, g(0, "ENDSEC"),
    g(0, "SECTION"), g(2, "ENTITIES"), ...extra, g(0, "ENDSEC"),
    g(0, "EOF"),
  );
}
const linje = (x1, y1, x2, y2, lager = "0") => [g(0, "LINE"), g(8, lager), g(10, x1), g(20, y1), g(30, 0), g(11, x2), g(21, y2), g(31, 0)];
const text = (x, y, t, h = 500) => [g(0, "TEXT"), g(8, "0"), g(10, x), g(20, y), g(30, 0), g(40, h), g(1, t)];

describe("enheter", () => {
  it("läser $INSUNITS", () => {
    expect(dxfEnhet({ $INSUNITS: 4 })).toEqual({ namn: "mm", tillMeter: 0.001, antagen: false });
    expect(dxfEnhet({ $INSUNITS: 6 })).toMatchObject({ namn: "m", tillMeter: 1, antagen: false });
  });

  it("gissar mm eller m utan enhet, och säger att det är antaget", () => {
    expect(dxfEnhet({}, 80000)).toMatchObject({ namn: "mm", antagen: true });
    expect(dxfEnhet({}, 80)).toMatchObject({ namn: "m", antagen: true });
  });
});

describe("läsning", () => {
  it("avvisar annat än DXF", () => {
    expect(() => lasDxf("hej")).toThrow(/inte ut som en DXF/);
  });

  it("UTF-8 och Windows-1252 avkodas", () => {
    expect(dxfText(new TextEncoder().encode("Växjö"))).toBe("Växjö");
    expect(dxfText(new Uint8Array([0x56, 0xe4, 0x78, 0x6a, 0xf6]))).toBe("Växjö");
  });

  it("MTEXT-koder rensas", () => {
    expect(rensaMtext("{\\fArial|b1;SKID 1}\\PRad två")).toBe("SKID 1 Rad två");
  });
});

describe("geometri", () => {
  it("linjer, cirkel och text med omfång", () => {
    const d = lasDxf(dxf({ extra: [...linje(0, 0, 10000, 0), ...linje(10000, 0, 10000, 5000), ...text(2000, 2000, "SKID 1")] }));
    const geo = dxfGeometri(d);
    expect(geo.linjer).toHaveLength(2);
    expect(geo.texter.map((t) => t.text)).toEqual(["SKID 1"]);
    expect(geo.omfang).toEqual({ minX: 0, minY: 0, maxX: 10000, maxY: 5000 });
  });

  it("ritar inte objekt på avslagna eller frysta lager", () => {
    const d = lasDxf(dxf({ lager: [["SYNS", 7], ["AV", -7], ["FRYST", 7, 1]], extra: [...linje(0, 0, 1, 1, "SYNS"), ...linje(0, 0, 9, 9, "AV"), ...linje(0, 0, 9, 9, "FRYST")] }));
    expect(dxfGeometri(d).linjer).toHaveLength(1);
  });

  it("block sätts in med förflyttning, skala och vridning", () => {
    const block = [g(0, "BLOCK"), g(8, "0"), g(2, "ENHET"), g(70, 0), g(10, 0), g(20, 0), g(30, 0), g(3, "ENHET"), ...linje(0, 0, 1000, 0), g(0, "ENDBLK")];
    const insert = [g(0, "INSERT"), g(8, "0"), g(2, "ENHET"), g(10, 5000), g(20, 5000), g(30, 0), g(41, 2), g(42, 2), g(50, 90)];
    const geo = dxfGeometri(lasDxf(dxf({ block, extra: insert })));
    const [a, b] = geo.linjer[0];
    expect(a[0]).toBeCloseTo(5000); expect(a[1]).toBeCloseTo(5000);
    // 1000 mm lång, skalad 2× och vriden 90°: slutar 2000 mm rakt norrut.
    expect(b[0]).toBeCloseTo(5000); expect(b[1]).toBeCloseTo(7000);
  });

  it("en polylinje med bulge blir en båge", () => {
    const pl = [g(0, "LWPOLYLINE"), g(8, "0"), g(90, 2), g(70, 0), g(10, 0), g(20, 0), g(42, 1), g(10, 2000), g(20, 0)];
    const geo = dxfGeometri(lasDxf(dxf({ extra: pl })));
    const ys = geo.linjer[0].map((p) => p[1]);
    // Halvcirkel med radie 1000: djupaste punkten är 1000 från kordan.
    expect(Math.max(...ys.map(Math.abs))).toBeCloseTo(1000, 0);
  });
});

describe("underlag för siten", () => {
  const d = () => lasDxf(dxf({ extra: [
    ...linje(0, 0, 80000, 0), ...linje(80000, 0, 80000, 52000), ...linje(0, 0, 0, 52000),
    ...text(10000, 40000, "SKID 1"), ...text(30000, 40000, "SKID 2"), ...text(50000, 10000, "Väg"),
  ] }));

  it("ger exakta mått i meter ur ritningens enheter", () => {
    const u = dxfUnderlag(d());
    expect(u.enhet).toMatchObject({ namn: "mm", antagen: false });
    expect(u.bredd).toBeCloseTo(80); expect(u.djup).toBeCloseTo(52);
    // Samma mått som resten av ritningskoden räknar fram med skala 1.
    const m = ritningsMatt({ sida: u.sida, skala: 1 });
    expect(m.bredd).toBeCloseTo(80, 1); expect(m.djup).toBeCloseTo(52, 1);
  });

  it("beteckningar blir etiketter som placerar ritningen över enheterna", () => {
    const u = dxfUnderlag(d());
    expect(u.etiketter.map((e) => e.namn)).toEqual(["SKID 1", "SKID 2"]);
    // Enheterna står 5 m öster om där ritningen säger: placeringen flyttar ritningen 5 m.
    const objekt = [
      { typ: "skid", namn: "SKID 1", x: 10 - 40 + 5, z: 52 / 2 - 40 },
      { typ: "skid", namn: "SKID 2", x: 30 - 40 + 5, z: 52 / 2 - 40 },
    ];
    const p = placeraEfterEtiketter(u.etiketter, objekt, u.sida, 1);
    expect(p.x).toBeCloseTo(5, 0); expect(p.z).toBeCloseTo(0, 0);
    expect(p.antal).toBe(2);
  });

  it("en tom ritning ger ett tydligt fel", () => {
    expect(() => dxfUnderlag(lasDxf(dxf()))).toThrow(/inga linjer eller texter/);
  });
});

describe("text i listan", () => {
  it("visar DXF och enheten i stället för pappersformat och skala", async () => {
    const { ritningsText } = await import("./ritningar.js");
    const u = dxfUnderlag(lasDxf(dxf({ insunits: null, extra: [linje(0, 0, 100000, 0), linje(0, 0, 0, 50000)] })));
    const r = { kalla: "dxf", sida: u.sida, skala: 1, enhet: u.enhet };
    expect(ritningsText(r)).toBe("DXF · mm (antagen) · 100 × 50 m");
    // Användaren byter enhet till cm: skalan blir kvoten mot den lästa enheten.
    expect(ritningsText({ ...r, skala: 10 })).toBe("DXF · cm · 1000 × 500 m");
  });
});
