import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const kanaler = [];
const borttagna = [];
const klient = {
  channel() {
    const kanal = {
      on() {
        return kanal;
      },
      subscribe(fn) {
        kanal.status = fn;
        return kanal;
      },
    };
    kanaler.push(kanal);
    return kanal;
  },
  removeChannel(kanal) {
    borttagna.push(kanal);
  },
};

vi.mock("../lib/supabase.js", () => ({ supabase: klient, KONFIGURERAD: true }));
const { skapaDb } = await import("./db-supabase.js");

beforeEach(() => {
  vi.useFakeTimers();
  kanaler.length = 0;
  borttagna.length = 0;
});
afterEach(() => vi.useRealTimers());

describe("realtidskanal som återansluter", () => {
  it("bygger om kanalen efter ett fel och meddelar när den är uppe igen", () => {
    const vidFel = vi.fn();
    const vidAteransluten = vi.fn();
    const av = skapaDb().doc("portfolj/state").onSnapshot(() => {}, vidFel, vidAteransluten);

    kanaler[0].status("SUBSCRIBED");
    expect(vidAteransluten).not.toHaveBeenCalled(); // första uppkopplingen är ingen återanslutning

    kanaler[0].status("CHANNEL_ERROR", { message: "nät" });
    expect(vidFel).toHaveBeenCalledTimes(1);
    expect(borttagna).toContain(kanaler[0]);
    expect(kanaler).toHaveLength(1);

    // CLOSED från den utbytta kanalen räknas inte som ett nytt fel.
    kanaler[0].status("CLOSED");
    expect(vidFel).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(kanaler).toHaveLength(2);
    kanaler[1].status("SUBSCRIBED");
    expect(vidAteransluten).toHaveBeenCalledTimes(1);

    av();
    expect(borttagna).toContain(kanaler[1]);
  });

  it("väntar längre för varje misslyckat försök och ger upp när den avregistreras", () => {
    const av = skapaDb().doc("portfolj/state").onSnapshot(() => {}, () => {}, () => {});
    kanaler[0].status("TIMED_OUT");
    vi.advanceTimersByTime(1000);
    expect(kanaler).toHaveLength(2);
    kanaler[1].status("TIMED_OUT");
    vi.advanceTimersByTime(1000);
    expect(kanaler).toHaveLength(2); // andra väntetiden är 2 s
    vi.advanceTimersByTime(1000);
    expect(kanaler).toHaveLength(3);

    kanaler[2].status("CHANNEL_ERROR");
    av();
    vi.advanceTimersByTime(60_000);
    expect(kanaler).toHaveLength(3);
  });
});
