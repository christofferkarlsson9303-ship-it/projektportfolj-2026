/* Adapter som lägger Supabase under det dokument-API PortfolioProvider redan
   är skriven mot: DB.doc(nyckel) med .get(), .set() och .onSnapshot().
   Varje "dokument" är en rad i app_state med nyckeln som primärnyckel. */

import { supabase } from "../lib/supabase.js";
import { loggKlientNyckel } from "./synk.js";

function fel(kod, meddelande) {
  const e = new Error(meddelande);
  e.code = kod;
  return e;
}

/* Senast lästa version per nyckel. Driver den optimistiska låsningen: vi skriver
   bara om raden ser ut som när vi läste den. */
const versioner = new Map();

/* PostgREST svarar inte med ett fel när RLS nekar en UPDATE — raden matchar
   bara inte, och vi får noll träffar tillbaka. Samma sak när versionsvillkoret
   inte stämmer. Noll rader har alltså tre möjliga orsaker, och de måste skiljas
   åt: raden saknas (skapa den), någon hann före (konflikt), eller reglerna sa
   nej (nekad). Providern rullar tillbaka ekonomiändringar på det sista. */
async function skriv(nyckel, payload) {
  const rad = { value: payload };
  const kand = versioner.get(nyckel);

  let fraga = supabase.from("app_state").update(rad).eq("key", nyckel);
  if (kand !== undefined) fraga = fraga.eq("version", kand);

  const { data, error } = await fraga.select("key, version");

  if (error) throw fel(error.code, error.message);
  if (data && data.length) {
    versioner.set(nyckel, data[0].version);
    return;
  }

  const { data: befintlig, error: lasfel } = await supabase
    .from("app_state")
    .select("key, version")
    .eq("key", nyckel)
    .maybeSingle();

  if (lasfel) throw fel(lasfel.code, lasfel.message);

  if (befintlig) {
    // Raden finns och går att läsa. Skiljer sig versionen har någon annan
    // skrivit sedan vi läste — annars var det behörigheten som stoppade oss.
    if (kand !== undefined && befintlig.version !== kand) {
      versioner.set(nyckel, befintlig.version);
      throw fel("konflikt", "någon annan har sparat sedan du läste");
    }
    throw fel("nekad", "skrivning nekad av behörighetsreglerna");
  }

  const { data: ny, error: insfel } = await supabase
    .from("app_state")
    .insert({ key: nyckel, ...rad })
    .select("version")
    .maybeSingle();

  if (insfel) throw fel(insfel.code, insfel.message);
  if (ny) versioner.set(nyckel, ny.version);
}

/* Realtidskanal som kopplar upp sig igen efter ett fel. Tidigare gav första
   CHANNEL_ERROR eller TIMED_OUT ett permanent avbrott: ett kort nätavbrott
   ute på site räckte för att resten av sessionen bara sparades lokalt.
   Nu tas kanalen ner och byggs om med stigande väntetid (1, 2, 4 … 30 s), och
   vidAteransluten anropas när den är uppe igen så att anroparen kan läsa
   ikapp det som hänt under avbrottet. Returnerar avregistreringsfunktionen. */
function prenumerera(bygg, vidFel, vidAteransluten) {
  let kanal = null;
  let timer = null;
  let forsok = 0;
  let harFelat = false;
  let avregistrerad = false;

  const anslut = () => {
    if (avregistrerad) return;
    let denna = null;
    denna = bygg((status, err) => {
      // Händelser från en kanal vi redan bytt ut (t.ex. CLOSED efter removeChannel) ignoreras.
      if (avregistrerad || denna !== kanal) return;
      if (status === "SUBSCRIBED") {
        forsok = 0;
        if (harFelat) {
          harFelat = false;
          vidAteransluten?.();
        }
        return;
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        harFelat = true;
        vidFel?.(fel(status, err?.message || status));
        supabase.removeChannel(denna);
        kanal = null;
        clearTimeout(timer);
        timer = setTimeout(anslut, Math.min(30_000, 1000 * 2 ** forsok++));
      }
    });
    kanal = denna;
  };
  anslut();

  return () => {
    avregistrerad = true;
    clearTimeout(timer);
    if (kanal) supabase.removeChannel(kanal);
    kanal = null;
  };
}

function dokument(nyckel) {
  return {
    async get() {
      const { data, error } = await supabase
        .from("app_state")
        .select("value, version")
        .eq("key", nyckel)
        .maybeSingle();

      if (error) throw fel(error.code, error.message);
      if (data) versioner.set(nyckel, data.version);
      return { exists: !!data, data: () => (data ? data.value : null) };
    },

    set: (payload) => skriv(nyckel, payload),

    /* Säger att klienten nu har tagit in läget i den här versionen. Anropas av
       providern när en realtidsändring faktiskt har lästs in i vyn. */
    antaVersion(version) {
      if (version !== undefined && version !== null) versioner.set(nyckel, version);
    },

    /* Returnerar en avregistreringsfunktion, som providern samlar och kallar
       vid nedmontering. hasPendingWrites finns inte i Postgres — den egna
       ekot filtreras redan bort av providerns jämförelse mot senast synkade.

       Versionen från realtid antas INTE automatiskt. Tidigare gjorde den det,
       och då gick nästa skrivning igenom även när klienten aldrig tagit in den
       andras ändring (t.ex. för att användaren stod i ett fält) — den andras
       ändring skrevs över utan konflikt. Nu följer versionen med i snapshoten
       och providern anropar antaVersion först när ändringen är inläst. */
    onSnapshot(vidAndring, vidFel, vidAteransluten) {
      return prenumerera(
        (status) =>
          supabase
            .channel(`app_state:${nyckel}`)
            .on(
              "postgres_changes",
              { event: "*", schema: "public", table: "app_state", filter: `key=eq.${nyckel}` },
              (handelse) => {
                const rad = handelse.new && Object.keys(handelse.new).length ? handelse.new : null;
                vidAndring({
                  exists: !!rad,
                  version: rad ? rad.version : undefined,
                  data: () => (rad ? rad.value : null),
                  metadata: { hasPendingWrites: false },
                });
              }
            )
            .subscribe(status),
        vidFel,
        vidAteransluten
      );
    },
  };
}


/* Ändringsloggen ligger i en egen append-only-tabell i stället för i
   portfölj-bloben. Avsändaren sätts av databasen ur JWT:n — klienten skickar
   den aldrig, och kan därför inte skriva i någon annans namn. */

const franRad = (r) => ({
  ts: r.ts,
  anvandare: r.anvandare,
  projektId: r.projekt_id || null,
  text: r.text,
});

/** Felet när kolumnen eller det unika indexet ännu inte finns i databasen. */
const saknarKlientNyckel = (e) =>
  ["PGRST204", "42703", "42P10"].includes(e?.code) || /klient_nyckel/.test(e?.message || "");

const logg = {
  async las(antal = 150) {
    const { data, error } = await supabase
      .from("andringslogg")
      .select("ts, anvandare, projekt_id, text")
      .order("ts", { ascending: false })
      .limit(antal);

    if (error) throw fel(error.code, error.message);
    return (data || []).map(franRad);
  },

  /* Varje post har en stabil klient_nyckel med unikt index (anvandare,
     klient_nyckel). Ett återförsök efter ett tappat svar blir då ON CONFLICT
     DO NOTHING i stället för en dubblett. Saknas kolumnen (migrationen
     20261016190000 ej körd) skrivs posten som förut, utan nyckel. */
  async skriv(poster) {
    if (!poster.length) return;
    const rader = poster.map((p) => ({
      ts: p.ts,
      projekt_id: p.projektId || null,
      text: p.text,
      klient_nyckel: loggKlientNyckel(p),
    }));
    const { error } = await supabase
      .from("andringslogg")
      .upsert(rader, { onConflict: "anvandare,klient_nyckel", ignoreDuplicates: true });
    if (!error) return;
    if (!saknarKlientNyckel(error)) throw fel(error.code, error.message);
    const { error: e2 } = await supabase.from("andringslogg").insert(rader.map(({ klient_nyckel: _, ...r }) => r));
    if (e2) throw fel(e2.code, e2.message);
  },

  lyssna(vidPost, vidAteransluten) {
    return prenumerera(
      (status) =>
        supabase
          .channel("andringslogg")
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "andringslogg" }, (handelse) =>
            vidPost(franRad(handelse.new))
          )
          .subscribe(status),
      undefined,
      vidAteransluten
    );
  },
};

/** DB-handtaget, eller null när Supabase inte är konfigurerat. */
export function skapaDb() {
  if (!supabase) return null;
  return { doc: dokument, logg };
}
