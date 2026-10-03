import { describe, expect, it, vi } from "vitest";
import { kanalerFranMiljo, korPaminnelser, portfoljUrDokument } from "../functions/frist-paminnelser/hanterare.js";

const NU = new Date("2026-09-29T20:00:00+02:00").getTime();
const iso = (h) => new Date(NU - h * 3600000).toISOString();

/** Lager i minnet med samma semantik som frist_paminnelser. */
function minneslager(state) {
  const reserverat = new Set();
  return {
    reserverat,
    state,
    lasPortfolj: async () => structuredClone(state),
    reservera: async (rader) =>
      rader.filter((r) => {
        const k = `${r.nyckel}|${r.niva}`;
        if (reserverat.has(k)) return false;
        reserverat.add(k);
        return true;
      }),
    slappa: async (rader) => rader.forEach((r) => reserverat.delete(`${r.nyckel}|${r.niva}`)),
  };
}

const kanal = (namn, fel = null) => {
  const skickat = [];
  return {
    namn,
    skickat,
    skicka: async (m) => {
      if (fel) throw new Error(fel);
      skickat.push(m);
    },
  };
};

const grund = () => ({
  projekt: [{ id: "36037", namn: "Växjö Batteripark" }],
  ur: [
    { id: "u1", projektId: "36037", nr: "UR001", status: "oppen", handelseDatum: iso(13) }, // akut
    { id: "u2", projektId: "36037", nr: "UR002", status: "oppen", handelseDatum: iso(2) }, // snart
  ],
  hseqIncidenter: [],
});

describe("korPaminnelser", () => {
  it("skickar en gång per frist och nivå", async () => {
    const lager = minneslager(grund());
    const teams = kanal("teams");
    const forsta = await korPaminnelser({ lager, kanaler: [teams], nuMs: NU });
    const andra = await korPaminnelser({ lager, kanaler: [teams], nuMs: NU + 15 * 60000 });
    expect(forsta.skickade).toBe(1);
    expect(andra.skickade).toBe(0);
    expect(teams.skickat).toHaveLength(1);
    expect(teams.skickat[0].text).toContain("UR001");
    expect(teams.skickat[0].text).not.toContain("UR002");
  });

  it("påminner igen när fristen passerats", async () => {
    const lager = minneslager(grund());
    const teams = kanal("teams");
    await korPaminnelser({ lager, kanaler: [teams], nuMs: NU });
    const ut = await korPaminnelser({ lager, kanaler: [teams], nuMs: NU + 12 * 3600000 });
    // UR001 har passerat, UR002 har hunnit bli akut (14 h).
    expect(ut.skickade).toBe(2);
    expect(teams.skickat[1].amne).toMatch(/passerad/);
    expect(teams.skickat[1].text).toMatch(/PASSERAD.*UR001/);
    expect(teams.skickat[1].text).toMatch(/AKUT.*UR002/);
  });

  it("slutar när underrättelsen är skickad", async () => {
    const lager = minneslager(grund());
    lager.state.ur[0].underrattelseDatum = "2026-09-29";
    const teams = kanal("teams");
    await korPaminnelser({ lager, kanaler: [teams], nuMs: NU + 12 * 3600000 });
    expect(teams.skickat.map((m) => m.text).join()).not.toContain("UR001");
  });

  it("släpper reservationen när alla kanaler fallerar, så att nästa körning försöker igen", async () => {
    const lager = minneslager(grund());
    await expect(korPaminnelser({ lager, kanaler: [kanal("teams", "503")], nuMs: NU })).rejects.toThrow(/teams: 503/);
    expect(lager.reserverat.size).toBe(0);
    const ok = kanal("teams");
    expect((await korPaminnelser({ lager, kanaler: [ok], nuMs: NU })).skickade).toBe(1);
  });

  it("en fungerande kanal räcker; den andras fel redovisas", async () => {
    const lager = minneslager(grund());
    const ut = await korPaminnelser({ lager, kanaler: [kanal("teams", "503"), kanal("mejl")], nuMs: NU });
    expect(ut.kanalutfall).toEqual([
      { kanal: "teams", ok: false, fel: "503" },
      { kanal: "mejl", ok: true },
    ]);
    expect(lager.reserverat.size).toBe(1);
  });

  it("torrkörning visar meddelandet utan att skicka eller reservera", async () => {
    const lager = minneslager(grund());
    const teams = kanal("teams");
    const ut = await korPaminnelser({ lager, kanaler: [teams], nuMs: NU, torr: true });
    expect(ut.torr).toBe(true);
    expect(ut.meddelande.amne).toMatch(/inom 12 h/);
    expect(teams.skickat).toHaveLength(0);
    expect(lager.reserverat.size).toBe(0);
  });

  it("utan kanal är det ett fel — inte tyst", async () => {
    await expect(korPaminnelser({ lager: minneslager(grund()), kanaler: [], nuMs: NU })).rejects.toThrow(/Ingen kanal/);
  });
});

describe("kanaler", () => {
  it("Teams får ett adaptivt kort, mejl går via Resend till alla mottagare", async () => {
    const anrop = [];
    const hamta = vi.fn(async (url, init) => {
      anrop.push({ url, body: JSON.parse(init.body), auth: init.headers.Authorization });
      return { ok: true, status: 200 };
    });
    const kanaler = kanalerFranMiljo(
      { TEAMS_WEBHOOK_URL: "https://teams/hook", RESEND_API_KEY: "re_x", PAMINNELSE_TILL: "a@x.se, b@x.se" },
      hamta
    );
    for (const k of kanaler) await k.skicka({ amne: "Ämne", text: "Ämne\n\nRad 1\nRad 2" });
    expect(anrop[0].url).toBe("https://teams/hook");
    expect(anrop[0].body.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    expect(anrop[1]).toMatchObject({ url: "https://api.resend.com/emails", auth: "Bearer re_x" });
    expect(anrop[1].body.to).toEqual(["a@x.se", "b@x.se"]);
  });

  it("utan konfiguration finns inga kanaler", () => {
    expect(kanalerFranMiljo({ RESEND_API_KEY: "x" })).toEqual([]);
  });

  it("ett felsvar blir ett fel", async () => {
    const [k] = kanalerFranMiljo({ TEAMS_WEBHOOK_URL: "u" }, async () => ({ ok: false, status: 400 }));
    await expect(k.skicka({ amne: "a", text: "a" })).rejects.toThrow("Teams svarade 400");
  });
});

describe("portfoljUrDokument", () => {
  it("plockar fristlistorna och kontraktsprofilerna ur dokumentet", () => {
    expect(portfoljUrDokument({ ur: [{ id: 1 }], risker: [{ id: 2 }], projekt: [{ id: 3 }], kontrakt: [{ projektId: "3" }] })).toEqual({
      ur: [{ id: 1 }],
      hseqIncidenter: [],
      projekt: [{ id: 3 }],
      kontrakt: [{ projektId: "3" }],
    });
    expect(portfoljUrDokument()).toEqual({ ur: [], hseqIncidenter: [], projekt: [], kontrakt: [] });
  });
});
