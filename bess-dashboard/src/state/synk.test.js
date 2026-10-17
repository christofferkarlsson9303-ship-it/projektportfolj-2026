import { describe, expect, it } from "vitest";
import { loggKlientNyckel } from "./synk.js";
import { feltyp, loggNyckel, nyaLoggposter } from "./synk.js";

describe("nyaLoggposter", () => {
  const granse = "2026-09-28T10:00:00.000Z";
  const serverPost = { ts: "2026-09-28T09:00:00.000Z", text: "gammal" };
  const annansPost = { ts: "2026-09-28T11:00:00.000Z", text: "Kim ändrade status" };
  const minPost = { ts: "2026-09-28T11:30:00.000Z", text: "Jag ändrade status" };

  it("skickar inte upp poster som andra skrivit och som kommit via realtid", () => {
    const kanda = new Set([loggNyckel(serverPost), loggNyckel(annansPost)]);
    const logg = [minPost, annansPost, serverPost];
    expect(nyaLoggposter(logg, granse, kanda)).toEqual([minPost]);
  });

  it("skickar inget som är äldre än gränsen", () => {
    expect(nyaLoggposter([serverPost], granse, new Set())).toEqual([]);
  });

  it("en egen post som redan skickats skickas inte igen", () => {
    const kanda = new Set([loggNyckel(minPost)]);
    expect(nyaLoggposter([minPost], granse, kanda)).toEqual([]);
  });
});

describe("feltyp", () => {
  it("skiljer nekad, konflikt och övriga fel åt", () => {
    expect(feltyp({ code: "nekad" })).toBe("nekad");
    expect(feltyp({ code: "42501" })).toBe("nekad");
    expect(feltyp({ code: "konflikt" })).toBe("konflikt");
    expect(feltyp(new TypeError("Failed to fetch"))).toBe("annat");
    expect(feltyp({ code: "PGRST301" })).toBe("annat");
    expect(feltyp(undefined)).toBe("annat");
  });
});

describe("loggKlientNyckel", () => {
  it("är stabil för samma post och skiljer olika texter åt", () => {
    const p = { ts: "2026-10-16T18:00:00.000Z", text: "Status ändrad" };
    expect(loggKlientNyckel(p)).toBe(loggKlientNyckel({ ...p }));
    expect(loggKlientNyckel(p)).not.toBe(loggKlientNyckel({ ...p, text: "Status ändrat" }));
    expect(loggKlientNyckel(p)).toMatch(/^2026-10-16T18:00:00\.000Z\|[0-9a-z]+$/);
  });
});
