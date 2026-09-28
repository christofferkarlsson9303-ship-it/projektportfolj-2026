import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SEED } from "../data/seed.js";
import { nu } from "../lib/datum.js";
import { PortfolioContext } from "./kontexter.js";
import { skapaDb } from "./db-supabase.js";
import { useUi } from "./hooks.js";
import { arEkonomiAtgard, efterInlasning, normalisera, reducer } from "./portfolj-reducer.js";
import { sammanfoga } from "../lib/sammanfoga.js";
import { feltyp, loggNyckel, nyaLoggposter, sammanslagningsText } from "./synk.js";

export const CONFIG = {
  autosaveMs: 1200,
  storageKey: "batchc-portfolj-v1",
  dbPath: "portfolj/state", // huvuddokument — alla med länken kan ändra
  dbPathEkonomi: "portfolj/ekonomi", // kontraktsvärde + betalplan, write:admin
};

/** Läser den lokala spegelkopian. Används som första vy och som reservläge. */
function laddaLokalt() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) return efterInlasning(normalisera(JSON.parse(raw)));
  } catch {
    /* trasig eller blockerad lagring — falla tillbaka på grunddatan */
  }
  return efterInlasning(structuredClone(SEED));
}

const packa = (s) => JSON.parse(JSON.stringify(s));
const lika = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Ekonomidata som egen payload — {kontraktsvarde:{id:kr}, betalplan:[...]}. */
function packaEkonomi(state) {
  const kv = {};
  for (const p of state.projekt) kv[p.id] = p.kontraktsvarde ?? null;
  return { kontraktsvarde: kv, betalplan: packa(state.betalplan || []) };
}

/** Allt UTOM de administratörslåsta ekonomifälten — de synkas i eget dokument. */
function packaStatePayload(state) {
  const clean = packa(state);
  clean.projekt = clean.projekt.map((p) => {
    const rest = { ...p };
    delete rest.kontraktsvarde;
    return rest;
  });
  delete clean.betalplan;
  // Ändringsloggen har en egen append-only-tabell och ska inte skrivas om
  // varje gång portföljen sparas — då vore den lika överskrivbar som allt annat.
  delete clean.andringslogg;
  return clean;
}

function tillampaEkonomi(state, ek) {
  if (!ek) return state;
  const projekt = state.projekt.map((p) =>
    ek.kontraktsvarde && Object.prototype.hasOwnProperty.call(ek.kontraktsvarde, p.id)
      ? { ...p, kontraktsvarde: ek.kontraktsvarde[p.id] }
      : p
  );
  return { ...state, projekt, betalplan: Array.isArray(ek.betalplan) ? ek.betalplan : state.betalplan };
}

/** Sant när markören står i ett fält i arbetsytan — då skjuts inkommande
 *  delade ändringar upp, annars skrivs det användaren just skriver över. */
function redigerarNu() {
  const ae = document.activeElement;
  return !!(ae && ae.closest && ae.closest("main") && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
}

export function PortfolioProvider({ children }) {
  const { visaToast } = useUi();
  const [state, rawDispatch] = useReducer(reducer, undefined, laddaLokalt);
  const [conn, setConn] = useState({ kl: "", txt: "Ansluter till delad lagring…" });
  const [ekonomiFel, setEkonomiFel] = useState("");

  const dbRef = useRef(null);
  const stateRef = useRef(state);
  const senastSynkad = useRef("");
  const senastSynkadEk = useRef("");
  const ekonomiLast = useRef(null);
  const senastLogg = useRef(null); // ts för senaste posten som nått tabellen
  const sparTimer = useRef(null);
  const sparTimerEk = useRef(null);
  const koadKanal = useRef(null); // "state" | "ekonomi" | null

  /* Senast gemensamma läge med databasen (normaliserad payload). Det är basen
     i tre-vägs-sammanslagningen när någon annan har sparat samtidigt. */
  const basState = useRef(null);
  // Payloads vi själva skickat — deras realtidseko ska inte läsas in igen.
  const skickade = useRef([]);
  // En delad ändring kom medan användaren skrev och väntar på att läsas in.
  const vantar = useRef(false);
  // Loggposter som redan finns i tabellen — de ska aldrig skickas upp igen.
  const kandaLogg = useRef(new Set());
  const tillampaFjarr = useRef(null); // sätts nedan, efter sparaState

  /* Håll en färsk referens till state för de asynkrona callbackerna (autospar
     och db-snapshots). Deklarerad före autospar-effekten så att den hinner
     uppdateras innan payloaden packas. */
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /** Fullt state ur en portföljpayload. Ekonomi och logg ligger i egna
   *  källor och tas från det vi redan har. */
  const franPayload = useCallback((payload) => {
    const nytt = efterInlasning(normalisera(structuredClone(payload)));
    const kv = new Map(stateRef.current.projekt.map((p) => [p.id, p.kontraktsvarde]));
    nytt.projekt = nytt.projekt.map((p) => (kv.has(p.id) ? { ...p, kontraktsvarde: kv.get(p.id) } : p));
    nytt.betalplan = stateRef.current.betalplan;
    nytt.andringslogg = stateRef.current.andringslogg || [];
    return nytt;
  }, []);

  const komIhagSkickad = (str) => {
    skickade.current = [...skickade.current.slice(-9), str];
  };

  /* ---------- Spara ---------- */

  const sparaState = useCallback(async () => {
    const s = stateRef.current;
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(s));
    } catch {
      /* lagring full eller blockerad — delad lagring får bära */
    }
    if (!dbRef.current) {
      setConn({ kl: "", txt: "Lokalt läge · sparad " + nu() });
      return;
    }
    try {
      setConn({ kl: "", txt: "Sparar…" });
      const payload = packaStatePayload(s);
      const str = JSON.stringify(payload);
      senastSynkad.current = str;
      komIhagSkickad(str);
      await dbRef.current.doc(CONFIG.dbPath).set(payload);
      basState.current = payload;
      setConn({ kl: "ok", txt: "Delad · sparad " + nu() });
    } catch (e) {
      /* Konflikt betyder att någon hann spara mellan vår läsning och vår
         skrivning. Tidigare lästes den andras version in och den egna ändringen
         försvann. Nu slås de ihop mot senast gemensamma läge, och resultatet
         sparas om — båda ändringarna finns kvar. */
      if (feltyp(e) === "konflikt") {
        try {
          const snap = await dbRef.current.doc(CONFIG.dbPath).get();
          if (snap.exists && snap.data()) {
            const konflikter = tillampaFjarr.current(snap.data(), undefined);
            setConn({ kl: konflikter.length ? "err" : "ok", txt: sammanslagningsText(konflikter) });
          }
        } catch {
          setConn({ kl: "err", txt: "Någon annan sparade samtidigt — kunde inte läsa om, din ändring finns lokalt" });
        }
        return;
      }
      setConn({ kl: "err", txt: `Kunde inte spara delat (${e.code || e.message || "fel"}) — finns lokalt` });
    }
  }, []);

  /* Tar in en version av portföljen från databasen utan att tappa det som
     ändrats lokalt men inte sparats: tre-vägs-sammanslagning mot basen.
     Skiljer sig resultatet från databasens version sparas det om.
     Returnerar sökvägarna där båda ändrat samma fält. Nås via en ref, eftersom
     sparaState (som anropar den) och den (som schemalägger sparaState)
     refererar till varandra. */
  const tillampaFjarrFn = useCallback((raw, version) => {
    const deras = packaStatePayload(franPayload(raw));
    const mina = packaStatePayload(stateRef.current);
    const bas = basState.current ?? mina;
    const { varde, konflikter } = sammanfoga(bas, mina, deras);

    dbRef.current?.doc(CONFIG.dbPath).antaVersion?.(version);
    basState.current = deras;
    senastSynkad.current = JSON.stringify(packa(raw));
    vantar.current = false;

    rawDispatch({ type: "SATT_STATE", state: franPayload(varde) });
    if (!lika(varde, deras)) {
      clearTimeout(sparTimer.current);
      sparTimer.current = setTimeout(sparaState, CONFIG.autosaveMs);
    }
    // Statusraden skrivs över av omsparningen direkt — toasten syns.
    if (konflikter.length) visaToast(sammanslagningsText(konflikter), "warn");
    return konflikter;
  }, [franPayload, sparaState, visaToast]);

  useEffect(() => {
    tillampaFjarr.current = tillampaFjarrFn;
  }, [tillampaFjarrFn]);

  const sparaEkonomi = useCallback(async function sparaEkonomiNu() {
    const s = stateRef.current;
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(s));
    } catch {
      /* se ovan */
    }
    const forsok = packaEkonomi(s);
    if (!dbRef.current) {
      ekonomiLast.current = forsok;
      setConn({ kl: "", txt: "Lokalt läge · sparad " + nu() });
      return;
    }
    const doc = dbRef.current.doc(CONFIG.dbPathEkonomi);
    try {
      setConn({ kl: "", txt: "Sparar…" });
      senastSynkadEk.current = JSON.stringify(forsok);
      await doc.set(forsok);
      ekonomiLast.current = forsok;
      setEkonomiFel("");
      setConn({ kl: "ok", txt: "Delad · sparad " + nu() });
    } catch (e) {
      const typ = feltyp(e);

      if (typ === "konflikt") {
        // En annan administratör hann spara. Slå ihop och spara om.
        try {
          const snap = await doc.get();
          const deras = snap.exists ? snap.data() : null;
          if (deras) {
            const { varde, konflikter } = sammanfoga(ekonomiLast.current ?? deras, forsok, deras);
            ekonomiLast.current = deras;
            senastSynkadEk.current = JSON.stringify(deras);
            rawDispatch({ type: "SATT_STATE", state: tillampaEkonomi(stateRef.current, varde) });
            if (!lika(varde, deras)) {
              clearTimeout(sparTimerEk.current);
              sparTimerEk.current = setTimeout(sparaEkonomiNu, CONFIG.autosaveMs);
            }
            setConn({ kl: konflikter.length ? "err" : "ok", txt: sammanslagningsText(konflikter) });
          }
        } catch {
          setConn({ kl: "err", txt: "Ekonomin: någon annan sparade samtidigt — kunde inte läsa om" });
        }
        return;
      }

      if (typ === "nekad") {
        // Behörigheten sa nej: återställ vyn till senast bekräftade värden.
        if (ekonomiLast.current) {
          rawDispatch({ type: "SATT_STATE", state: tillampaEkonomi(stateRef.current, ekonomiLast.current) });
        }
        senastSynkadEk.current = JSON.stringify(ekonomiLast.current || forsok);
        setEkonomiFel(
          "Kunde inte spara — kontraktsvärde och betalplan kan bara ändras av administratören. Ändringen har återställts."
        );
        setConn({ kl: "err", txt: "Ekonomiändring nekad — endast administratör" });
        return;
      }

      /* Nätverk, tidsgräns, serverfel. Tidigare tolkades även detta som nekad
         behörighet och ändringen rullades tillbaka — administratören tappade
         sin ändring vid ett kort avbrott. Nu ligger den kvar och vi försöker
         igen. */
      setEkonomiFel(
        `Kunde inte spara ekonomin (${e?.code || e?.message || "fel"}). Ändringen finns kvar lokalt — nytt försök om en stund.`
      );
      setConn({ kl: "err", txt: "Ekonomin kunde inte sparas — försöker igen" });
      clearTimeout(sparTimerEk.current);
      sparTimerEk.current = setTimeout(sparaEkonomiNu, 10_000);
    }
  }, []);

  /** Dispatch som också schemalägger autospar på rätt kanal. */
  const dispatch = useCallback(
    (action) => {
      rawDispatch(action);
      if (action.type === "SATT_STATE" && action.tyst) return;
      if (action.type === "SATT_LOGG") return; // loggen sparas i egen tabell
      koadKanal.current = arEkonomiAtgard(action) ? "ekonomi" : "state";
    },
    []
  );

  // Autospar: körs efter att state faktiskt uppdaterats, så payloaden är färsk.
  useEffect(() => {
    const kanal = koadKanal.current;
    if (!kanal) return;
    koadKanal.current = null;
    const timer = kanal === "ekonomi" ? sparTimerEk : sparTimer;
    const kor = kanal === "ekonomi" ? sparaEkonomi : sparaState;
    clearTimeout(timer.current);
    timer.current = setTimeout(kor, CONFIG.autosaveMs);
  }, [state, sparaState, sparaEkonomi]);

  // Skriv av eventuellt köat spar när fliken stängs.
  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(stateRef.current));
      } catch {
        /* inget mer att göra vid stängning */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, []);

  /* ---------- Anslut till delad lagring ---------- */

  useEffect(() => {
    let avbruten = false;
    const avregistrera = [];

    (async () => {
      let DB = null;
      try {
        DB = skapaDb();
      } catch {
        DB = null;
      }
      if (avbruten) return;

      if (!DB) {
        setConn({ kl: "", txt: "Lokalt läge — sparas i den här webbläsaren" });
        return;
      }
      dbRef.current = DB;

      // Huvuddokumentet: öppet för alla med länken.
      const ref = DB.doc(CONFIG.dbPath);
      try {
        const snap = await ref.get();
        if (avbruten) return;
        if (snap.exists && snap.data()) {
          senastSynkad.current = JSON.stringify(packa(snap.data()));
          const inlast = franPayload(snap.data());
          basState.current = packaStatePayload(inlast);
          dispatch({ type: "SATT_STATE", state: inlast, tyst: true });
          setConn({ kl: "ok", txt: "Delad · hämtad " + nu() });
        } else {
          const start = packaStatePayload(stateRef.current);
          senastSynkad.current = JSON.stringify(start);
          await ref.set(start);
          basState.current = start;
          setConn({ kl: "ok", txt: "Delad · databasen skapad " + nu() });
        }
      } catch {
        setConn({ kl: "err", txt: "Delad lagring svarar inte — lokalt läge" });
        return;
      }

      avregistrera.push(
        ref.onSnapshot(
          (snap) => {
            if (!snap.exists || snap.metadata.hasPendingWrites) return;
            const inkommande = JSON.stringify(packa(snap.data()));
            if (inkommande === senastSynkad.current || skickade.current.includes(inkommande)) return;
            /* Står användaren i ett fält väntar vi — annars ändras det hen
               skriver i under fingrarna. Versionen antas inte, så en autospar
               under tiden ger konflikt och sammanslagning i stället för att
               skriva över den andras ändring. Läses in vid focusout. */
            if (redigerarNu()) {
              vantar.current = true;
              setConn({ kl: "ok", txt: "Ny delad ändring — läses in när du är klar" });
              return;
            }
            const konflikter = tillampaFjarr.current(snap.data(), snap.version);
            setConn(
              konflikter.length
                ? { kl: "err", txt: sammanslagningsText(konflikter) }
                : { kl: "ok", txt: "Delad · uppdaterad " + nu() }
            );
          },
          (err) => {
            setConn({ kl: "err", txt: `Delningen avbröts (${err.code}) — lokalt läge` });
            dbRef.current = null;
          }
        )
      );

      // Ekonomidokumentet: alla kan läsa, bara administratören kan skriva.
      const refEk = DB.doc(CONFIG.dbPathEkonomi);
      try {
        const snap = await refEk.get();
        if (avbruten) return;
        if (snap.exists && snap.data()) {
          const data = snap.data();
          ekonomiLast.current = data;
          senastSynkadEk.current = JSON.stringify(data);
          dispatch({ type: "SATT_STATE", state: tillampaEkonomi(stateRef.current, data), tyst: true });
        } else {
          const start = packaEkonomi(stateRef.current);
          ekonomiLast.current = start;
          senastSynkadEk.current = JSON.stringify(start);
          try {
            await refEk.set(start);
          } catch {
            /* icke-administratör får inte så dokumentet — det är förväntat */
          }
        }
      } catch {
        return;
      }

      avregistrera.push(
        refEk.onSnapshot(
          (snap) => {
            if (!snap.exists || snap.metadata.hasPendingWrites) return;
            const data = snap.data();
            const inkommande = JSON.stringify(data);
            if (inkommande === senastSynkadEk.current) return;
            // Mitt i en redigering: vänta. Nästa spar ger konflikt och slås ihop.
            if (redigerarNu()) return;
            senastSynkadEk.current = inkommande;
            ekonomiLast.current = data;
            refEk.antaVersion?.(snap.version);
            dispatch({ type: "SATT_STATE", state: tillampaEkonomi(stateRef.current, data), tyst: true });
          },
          () => {}
        )
      );

      /* Ändringsloggen: egen append-only-tabell. Läses separat från portföljen
         och lyssnas på, så att spåret växer även när andra skriver. */
      if (DB.logg) {
        try {
          const poster = await DB.logg.las();
          if (avbruten) return;
          senastLogg.current = poster.length ? poster[0].ts : "";
          poster.forEach((p) => kandaLogg.current.add(loggNyckel(p)));
          if (poster.length) dispatch({ type: "SATT_LOGG", poster });
        } catch {
          senastLogg.current = null; // otillgänglig — skicka inget blint
        }
        avregistrera.push(
          DB.logg.lyssna((post) => {
            // Känd innan den når listan — annars skickas den upp igen i mitt namn.
            kandaLogg.current.add(loggNyckel(post));
            dispatch({ type: "SATT_LOGG", poster: [post] });
          })
        );
      }
    })();

    return () => {
      avbruten = true;
      avregistrera.forEach((av) => {
        try {
          if (typeof av === "function") av();
        } catch {
          /* redan avregistrerad */
        }
      });
    };
  }, [dispatch, franPayload]);

  /* En delad ändring som väntade medan användaren skrev läses in när fokus
     lämnar fältet. Timeouten låter fokus landa i nästa fält först. */
  useEffect(() => {
    const vidFokusUt = () => {
      setTimeout(async () => {
        if (!vantar.current || redigerarNu() || !dbRef.current) return;
        try {
          const snap = await dbRef.current.doc(CONFIG.dbPath).get();
          if (!vantar.current || !snap.exists || !snap.data()) return;
          const konflikter = tillampaFjarr.current(snap.data(), undefined);
          setConn(
            konflikter.length
              ? { kl: "err", txt: sammanslagningsText(konflikter) }
              : { kl: "ok", txt: "Delad · uppdaterad " + nu() }
          );
        } catch {
          /* nästa spar ger konflikt och sammanslagning ändå */
        }
      }, 0);
    };
    document.addEventListener("focusout", vidFokusUt);
    return () => document.removeEventListener("focusout", vidFokusUt);
  }, []);

  /* Skickar upp poster som tillkommit lokalt. Avsändaren utelämnas med flit —
     databasen fyller i den inloggade adressen, och reglerna tillåter ingen
     annan. Det är hela poängen: spåret går inte att skriva i någons namn. */
  useEffect(() => {
    const db = dbRef.current;
    const granse = senastLogg.current;
    if (!db?.logg || granse === null) return;

    const nya = nyaLoggposter(state.andringslogg, granse, kandaLogg.current);
    if (!nya.length) return;

    nya.forEach((p) => kandaLogg.current.add(loggNyckel(p)));
    senastLogg.current = nya[0].ts;
    db.logg.skriv([...nya].reverse()).catch(() => {
      setConn({ kl: "err", txt: "Loggposten sparades lokalt men inte delat" });
    });
  }, [state.andringslogg]);

  // Avbryt köade spar när providern plockas ner. Egen effekt — tidigare låg det
  // i db-effektens cleanup, vilket kopplade ihop två orelaterade livscykler.
  // (Lintern varnar för .current i cleanup; regeln gäller DOM-refs, inte timer-id.)
  useEffect(() => {
    const timers = [sparTimer, sparTimerEk];
    return () => timers.forEach((t) => clearTimeout(t.current));
  }, []);

  /* ---------- Bekvämlighetsmetoder ---------- */

  const api = useMemo(
    () => ({
      state,
      dispatch,
      conn,
      ekonomiFel,
      uppd: (lista, id, falt, varde) => dispatch({ type: "UPPDATERA", lista, id, falt, varde }),
      uppdNum: (lista, id, falt, varde) =>
        dispatch({ type: "UPPDATERA", lista, id, falt, varde: varde === "" ? null : Number(varde) }),
      uppdBool: (lista, id, falt, varde) =>
        dispatch({ type: "UPPDATERA", lista, id, falt, varde: !!varde }),
      uppdStatus: (lista, id, falt, varde) => {
        const rad = (state[lista] || []).find((r) => r.id === id);
        dispatch({ type: "UPPDATERA_STATUS", lista, id, falt, varde });
        // Kvittera bara när värdet faktiskt ändrades — annars pratar toasten
        // varje gång någon öppnar en <select> och väljer samma sak igen.
        if (rad && rad[falt] !== varde) visaToast("Status uppdaterad och loggad");
      },
      laggTill: (lista, rad) => dispatch({ type: "LAGG_TILL", lista, rad }),
      taBort: (lista, id) => dispatch({ type: "TA_BORT", lista, id }),
      sattLista: (lista, rader) => dispatch({ type: "SATT_LISTA", lista, rader }),
    }),
    [state, dispatch, conn, ekonomiFel, visaToast]
  );

  return <PortfolioContext.Provider value={api}>{children}</PortfolioContext.Provider>;
}
