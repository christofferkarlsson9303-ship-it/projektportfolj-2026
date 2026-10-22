import { describe, it, expect } from "vitest";
import { bedomProvsvar, slutresultat, kontrolleraStadning } from "../../scripts/behorighetsprov-resultat.mjs";

describe("behörighetsprovet får inte ge falskt godkänt", () => {
  it("skiljer verkligt rättighetsfel från JWT-, nät- och schemafel", () => {
    expect(bedomProvsvar({ error: { code: "42501", message: "permission denied" } }).ok).toBe(false);
    for (const code of ["PGRST301", "42P01", "23503", "FETCH_ERROR"]) {
      expect(bedomProvsvar({ error: { code, message: "test" } }).ok).toBeNull();
    }
  });
  it("ett tomt underlag eller en uppdatering av en obefintlig rad bevisar inget", () => {
    expect(bedomProvsvar({ data: [] }).ok).toBeNull();
    expect(bedomProvsvar({ data: [] }, { tomtArNekat: true }).ok).toBe(false);
    expect(bedomProvsvar({ data: [] }, { tomtArTillatet: true }).ok).toBe(true);
    expect(bedomProvsvar({ data: [{ key: "test" }] }).ok).toBe(true);
  });
  it("avbruten städning av provdata får inte döljas", () => {
    expect(() => kontrolleraStadning({ data: [] })).toThrow("Städningen");
    expect(() => kontrolleraStadning({ error: { message: "nekad" } })).toThrow("Städningen");
    expect(() => kontrolleraStadning({ data: [{ key: "prov" }] })).not.toThrow();
  });
  it("saknade inloggningar ger ofullständigt prov och felkod även utan avvikelser", () => {
    expect(slutresultat(0, 39).kod).toBe(2);
    expect(slutresultat(0, 39).text).toContain("Ofullständigt");
    expect(slutresultat(1, 0).kod).toBe(1);
    expect(slutresultat(0, 0).kod).toBe(0);
  });
});
