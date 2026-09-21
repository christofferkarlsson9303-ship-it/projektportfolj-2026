import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SEED } from "../data/seed.js";
import { nu } from "../lib/datum.js";
import { PortfolioContext } from "./kontexter.js";
import { skapaDb } from "./db-supabase.js";
import { useUi } from "./hooks.js";
import { arEkonomiAtgard, efterInlasning, normalisera, reducer } from "./portfolj-reducer.js";

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

  /* Håll en färsk referens till state för de asynkrona callbackerna (autospar
     och db-snapshots). Deklarerad före autospar-effekten så att den hinner
     uppdateras innan payloaden packas. */
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
      senastSynkad.current = JSON.stringify(payload);
      await dbRef.current.doc(CONFIG.dbPath).set(payload);
      setConn({ kl: "ok", txt: "Delad · sparad " + nu() });
    } catch (e) {
      /* Konflikt betyder att någon hann spara mellan vår läsning och vår
         skrivning. Tidigare skrevs den ändringen över utan ett ord; nu läser vi
         om och säger till. Ändringen finns kvar lokalt, men den delade bilden
         är nu någon annans — full sammanslagning kräver att portföljen delas
         upp i riktiga rader, vilket är nästa steg. */
      if (e.code === "konflikt") {
        try {
          const snap = await dbRef.current.doc(CONFIG.dbPath).get();
          if (snap.exists && snap.data()) {
            senastSynkad.current = JSON.stringify(packa(snap.data()));
            const inlast = efterInlasning(normalisera(snap.data()));
            inlast.andringslogg = stateRef.current.andringslogg || [];
            // Ekonomifälten ligger i eget dokument — behåll det vi redan vet.
            const kv = stateRef.current.projekt.map((p) => [p.id, p.kontraktsvarde]);
            inlast.projekt = inlast.projekt.map((p) => {
              const träff = kv.find(([id]) => id === p.id);
              return träff ? { ...p, kontraktsvarde: träff[1] } : p;
            });
            inlast.betalplan = stateRef.current.betalplan;
            rawDispatch({ type: "SATT_STATE", state: inlast });
          }
          setConn({ kl: "err", txt: "Någon annan sparade samtidigt — vyn är omläst, kontrollera din ändring" });
        } catch {
          setConn({ kl: "err", txt: "Någon annan sparade samtidigt — kunde inte läsa om" });
        }
        return;
      }
      setConn({ kl: "err", txt: `Kunde inte spara delat (${e.code || e.message || "fel"}) — finns lokalt` });
    }
  }, []);

  const sparaEkonomi = useCallback(async () => {
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
    try {
      setConn({ kl: "", txt: "Sparar…" });
      senastSynkadEk.current = JSON.stringify(forsok);
      await dbRef.current.doc(CONFIG.dbPathEkonomi).set(forsok);
      ekonomiLast.current = forsok;
      setEkonomiFel("");
      setConn({ kl: "ok", txt: "Delad · sparad " + nu() });
    } catch {
      // Nekad skrivning: återställ vyn till senast bekräftade värden.
      if (ekonomiLast.current) {
        rawDispatch({ type: "SATT_STATE", state: tillampaEkonomi(stateRef.current, ekonomiLast.current) });
      }
      senastSynkadEk.current = JSON.stringify(ekonomiLast.current || forsok);
      setEkonomiFel(
        "Kunde inte spara — kontraktsvärde och betalplan kan bara ändras av administratören. Ändringen har återställts."
      );
      setConn({ kl: "err", txt: "Ekonomiändring nekad — endast administratör" });
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
          const inlast = efterInlasning(normalisera(snap.data()));
          inlast.andringslogg = stateRef.current.andringslogg || [];
          dispatch({ type: "SATT_STATE", state: inlast, tyst: true });
          setConn({ kl: "ok", txt: "Delad · hämtad " + nu() });
        } else {
          const start = packaStatePayload(stateRef.current);
          senastSynkad.current = JSON.stringify(start);
          await ref.set(start);
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
            if (inkommande === senastSynkad.current) return;
            senastSynkad.current = inkommande;
            if (redigerarNu()) {
              setConn({ kl: "ok", txt: "Ny delad ändring — läses in när du är klar" });
              return;
            }
            // Ekonomifälten ingår inte i detta dokument — behåll det vi vet.
            const kvSpar = stateRef.current.projekt.map((p) => [p.id, p.kontraktsvarde]);
            const bpSpar = stateRef.current.betalplan;
            const nyttState = efterInlasning(normalisera(JSON.parse(inkommande)));
            nyttState.projekt = nyttState.projekt.map((p) => {
              const träff = kvSpar.find(([id]) => id === p.id);
              return träff ? { ...p, kontraktsvarde: träff[1] } : p;
            });
            nyttState.betalplan = bpSpar;
            nyttState.andringslogg = stateRef.current.andringslogg || [];
            dispatch({ type: "SATT_STATE", state: nyttState, tyst: true });
            setConn({ kl: "ok", txt: "Delad · uppdaterad " + nu() });
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
            senastSynkadEk.current = inkommande;
            ekonomiLast.current = data;
            if (redigerarNu()) return;
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
          if (poster.length) dispatch({ type: "SATT_LOGG", poster });
        } catch {
          senastLogg.current = null; // otillgänglig — skicka inget blint
        }
        avregistrera.push(DB.logg.lyssna((post) => dispatch({ type: "SATT_LOGG", poster: [post] })));
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
  }, [dispatch]);

  /* Skickar upp poster som tillkommit lokalt. Avsändaren utelämnas med flit —
     databasen fyller i den inloggade adressen, och reglerna tillåter ingen
     annan. Det är hela poängen: spåret går inte att skriva i någons namn. */
  useEffect(() => {
    const db = dbRef.current;
    const granse = senastLogg.current;
    if (!db?.logg || granse === null) return;

    const nya = (state.andringslogg || []).filter((p) => p.ts > granse);
    if (!nya.length) return;

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
