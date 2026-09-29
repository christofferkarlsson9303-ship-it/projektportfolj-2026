/* Adapter som lägger Supabase under det dokument-API PortfolioProvider redan
   är skriven mot: DB.doc(nyckel) med .get(), .set() och .onSnapshot().
   Varje "dokument" är en rad i app_state med nyckeln som primärnyckel. */

import { supabase } from "../lib/supabase.js";
import { fel } from "./db-fel.js";
import { harPosterTabell, radDokument } from "./db-poster.js";

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
    onSnapshot(vidAndring, vidFel) {
      const kanal = supabase
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
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            vidFel?.(fel(status, err?.message || status));
          }
        });

      return () => {
        supabase.removeChannel(kanal);
      };
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

  async skriv(poster) {
    if (!poster.length) return;
    const rader = poster.map((p) => ({
      ts: p.ts,
      projekt_id: p.projektId || null,
      text: p.text,
    }));
    const { error } = await supabase.from("andringslogg").insert(rader);
    if (error) throw fel(error.code, error.message);
  },

  lyssna(vidPost) {
    const kanal = supabase
      .channel("andringslogg")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "andringslogg" },
        (handelse) => vidPost(franRad(handelse.new))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };
  },
};

/* Portföljdokumentet: rad per post i tabellen poster när den finns, annars
   som förut en JSON-rad i app_state. Valet görs vid första läsningen —
   providern läser alltid innan den skriver eller lyssnar. */
const PORTFOLJ = "portfolj/state";

function portfoljDokument() {
  let vald = null;
  let rader = null;
  const valj = async () => {
    if (vald) return vald;
    if (await harPosterTabell(supabase)) {
      rader = radDokument(supabase);
      vald = rader;
    } else vald = dokument(PORTFOLJ);
    return vald;
  };
  const kraver = () => {
    if (!vald) throw fel("ej_last", "portföljen måste läsas innan den skrivs eller avlyssnas");
    return vald;
  };
  return {
    get: async () => (await valj()).get(),
    set: async (payload) => (await valj()).set(payload),
    antaVersion: (v) => kraver().antaVersion(v),
    onSnapshot: (vidAndring, vidFel) => kraver().onSnapshot(vidAndring, vidFel),
    /** Versionshistorik för en post, eller null när den inte finns (app_state-läget). */
    historik: async (lista, id) => {
      await valj();
      return rader ? rader.historik(lista, id) : null;
    },
    get radlage() {
      return vald === null ? null : vald === rader;
    },
  };
}

/** DB-handtaget, eller null när Supabase inte är konfigurerat. */
export function skapaDb() {
  if (!supabase) return null;
  const portfolj = portfoljDokument();
  return {
    doc: (nyckel) => (nyckel === PORTFOLJ ? portfolj : dokument(nyckel)),
    historik: (lista, id) => portfolj.historik(lista, id),
    logg,
  };
}
