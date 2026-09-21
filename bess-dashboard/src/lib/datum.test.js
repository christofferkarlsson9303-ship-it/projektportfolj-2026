import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dagarTill, idag, isoVecka, timmarSedan, veckaForskjut, veckansDagar } from "./datum.js";

/* Klockan står still under testen. Utan det blir varje fristberäkning ett
   test som går sönder i morgon. */
function stall(iso) {
  vi.setSystemTime(new Date(iso));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("idag", () => {
  it("räknar i lokal tid, inte UTC", () => {
    // 00:30 svensk sommartid är fortfarande 22:30 UTC dagen innan. Originalet
    // använde toISOString() här och tappade ett dygn i just det fönstret.
    stall("2026-06-15T00:30:00+02:00");
    expect(idag()).toBe("2026-06-15");
  });

  it("håller samma dygn strax före midnatt", () => {
    stall("2026-06-15T23:59:00+02:00");
    expect(idag()).toBe("2026-06-15");
  });
});

describe("dagarTill", () => {
  beforeEach(() => stall("2026-09-21T10:00:00+02:00"));

  it("ger noll för dagens datum", () => {
    expect(dagarTill("2026-09-21")).toBe(0);
  });

  it("ger negativt för passerade datum", () => {
    expect(dagarTill("2026-09-14")).toBe(-7);
  });

  it("ger positivt för kommande datum", () => {
    expect(dagarTill("2026-10-01")).toBe(10);
  });

  it("räknar över en sommartidsövergång utan att tappa ett dygn", () => {
    // Klockan ställs om natten mot 25 oktober 2026.
    expect(dagarTill("2026-11-01")).toBe(41);
  });

  it("ger null för tomt och ogiltigt datum", () => {
    expect(dagarTill("")).toBeNull();
    expect(dagarTill(null)).toBeNull();
    expect(dagarTill("inte-ett-datum")).toBeNull();
  });
});

describe("timmarSedan — bär 24-timmarsfristen", () => {
  beforeEach(() => stall("2026-09-21T10:00:00+02:00"));

  it("räknar timmar från en full tidsstämpel", () => {
    expect(timmarSedan("2026-09-20T10:00:00+02:00")).toBe(24);
    expect(timmarSedan("2026-09-20T09:00:00+02:00")).toBe(25);
  });

  it("räknar ett datum utan klockslag från midnatt", () => {
    // Dokumenterar nuvarande beteende, som också är dess svaghet: en händelse
    // 23:00 behandlas som 00:00 och fristen börjar löpa nästan ett dygn för
    // tidigt. Ändras fältet till tidsstämpel ska det här testet falla.
    expect(timmarSedan("2026-09-21")).toBe(10);
    expect(timmarSedan("2026-09-20")).toBe(34);
  });

  it("ger null när datum saknas", () => {
    expect(timmarSedan("")).toBeNull();
    expect(timmarSedan(null)).toBeNull();
  });
});

describe("ISO-veckor", () => {
  it("lägger 1 januari 2026 i vecka 1", () => {
    expect(isoVecka(new Date("2026-01-01T12:00:00+01:00"))).toBe("2026-v01");
  });

  it("lägger 31 december 2026 i vecka 53", () => {
    expect(isoVecka(new Date("2026-12-31T12:00:00+01:00"))).toBe("2026-v53");
  });

  it("går över årsskiftet vid förskjutning", () => {
    expect(veckaForskjut("2026-v01", -1)).toBe("2025-v52");
    expect(veckaForskjut("2026-v52", 1)).toBe("2026-v53");
  });

  it("ger måndag till söndag", () => {
    const dagar = veckansDagar("2026-v39");
    expect(dagar).toHaveLength(7);
    expect(dagar[0]).toBe("2026-09-21");
    expect(dagar[6]).toBe("2026-09-27");
  });
});
