import { describe, expect, it, vi } from "vitest";
import { LAS_SEKUNDER, MAX_FORSOK, kanalerFranMiljo, korPaminnelser, likaNycklar, portfoljUrDokument } from "../functions/frist-paminnelser/hanterare.js";

const NU = new Date("2026-09-29T20:00:00+02:00").getTime();
const iso = (h) => new Date(NU - h * 3600000).toISOString();

/** Lager i minnet med samma semantik som frist_paminnelser per kanal (F07). */
function minneslager(state) {
  const rader = new Map(); // nyckel → { status, forsok, lasTill }
  let nu = 0;
  const k = (r) => `${r.nyckel}|${r.niva}|${r.revision ?? ""}|${r.kanal}`;
  return {
    rader,
    state,
    sattTid: (ms) => (nu = ms),
    lasPortfolj: async () => structuredClone(state),
    reservera: async (lista, lasSekunder) =>
      lista.filter((r) => {
        const x = rader.get(k(r));
        if (!x || (x.status === "failed" && x.forsok < MAX_FORSOK) || (x.status === "sending" && x.lasTill < nu)) {
          rader.set(k(r), { status: "sending", forsok: (x?.forsok || 0) + 1, lasTill: nu + lasSekunder * 1000 });
          return true;
        }
        return false;
      }),
    markera: async (lista, status) => lista.forEach((r) => rader.set(k(r), { ...rader.get(k(r)), status, lasTill: null })),
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

  it("en kanal som fallerar försöks igen; den som lyckats skickar inte igen (F07)", async () => {
    const lager = minneslager(grund());
    const teams = kanal("teams");
    const mejlFel = kanal("mejl", "503");
    await expect(korPaminnelser({ lager, kanaler: [teams, mejlFel], nuMs: NU })).rejects.toThrow(/1 av 2 kanaler.*mejl: 503/);
    expect(teams.skickat).toHaveLength(1);
    const mejl = kanal("mejl");
    const ut = await korPaminnelser({ lager, kanaler: [teams, mejl], nuMs: NU + 15 * 60000 });
    expect(ut.kanalutfall).toEqual([
      { kanal: "teams", ok: true, antal: 0 },
      { kanal: "mejl", ok: true, antal: 1 },
    ]);
    expect(teams.skickat).toHaveLength(1);
    expect(mejl.skickat).toHaveLength(1);
  });

  it("en körning som dör efter reservationen blockerar bara tills låset gått ut", async () => {
    const lager = minneslager(grund());
    const dor = { namn: "teams", skicka: () => new Promise(() => {}) }; // svarar aldrig
    lager.sattTid(NU);
    void korPaminnelser({ lager, kanaler: [dor], nuMs: NU });
    await new Promise((r) => setTimeout(r, 0));
    const teams = kanal("teams");
    lager.sattTid(NU + 60_000);
    expect((await korPaminnelser({ lager, kanaler: [teams], nuMs: NU + 60_000 })).skickade).toBe(0);
    lager.sattTid(NU + LAS_SEKUNDER * 1000 + 1);
    expect((await korPaminnelser({ lager, kanaler: [teams], nuMs: NU + LAS_SEKUNDER * 1000 + 1 })).skickade).toBe(1);
  });

  it("ett nytt händelsedatum är en ny frist som påminns igen", async () => {
    const lager = minneslager(grund());
    const teams = kanal("teams");
    await korPaminnelser({ lager, kanaler: [teams], nuMs: NU });
    lager.state.ur[0].handelseDatum = iso(14);
    expect((await korPaminnelser({ lager, kanaler: [teams], nuMs: NU })).skickade).toBe(1);
  });

  it("torrkörning visar meddelandet utan att skicka eller reservera", async () => {
    const lager = minneslager(grund());
    const teams = kanal("teams");
    const ut = await korPaminnelser({ lager, kanaler: [teams], nuMs: NU, torr: true });
    expect(ut.torr).toBe(true);
    expect(ut.meddelande.amne).toMatch(/inom 12 h/);
    expect(teams.skickat).toHaveLength(0);
    expect(lager.rader.size).toBe(0);
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

describe("likaNycklar", () => {
  it("släpper bara igenom exakt samma nyckel", () => {
    expect(likaNycklar("hemlig-nyckel-123", "hemlig-nyckel-123")).toBe(true);
    expect(likaNycklar("hemlig-nyckel-124", "hemlig-nyckel-123")).toBe(false);
    expect(likaNycklar("hemlig", "hemlig-nyckel-123")).toBe(false);
    expect(likaNycklar("", "")).toBe(false);
    expect(likaNycklar("x", undefined)).toBe(false);
  });
});
