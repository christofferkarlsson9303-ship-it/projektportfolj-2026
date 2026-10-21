import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { SEED } from "../data/seed.js";
import { nu } from "../lib/datum.js";
import { PortfolioContext } from "./kontexter.js";
import { skapaDb } from "./db-supabase.js";
import { useUi } from "./hooks.js";
import { arEkonomiAtgard, efterInlasning, hamtaNamn, normalisera, reducer } from "./portfolj-reducer.js";
import { kvittensFor, laggIKo, lasKo, sparaKo, tomKo } from "../lib/godkannanden.js";
import { registreraGodkannande } from "./godkannanden.js";
import { supabase } from "../lib/supabase.js";
import { aktivVy, forlorade } from "../lib/arkiv.js";
import { lokalFelText, skrivLokalt } from "../lib/lokalLagring.js";
import { sammanfoga } from "../lib/sammanfoga.js";
import { feltyp, loggNyckel, nyaLoggposter, sammanslagningsText } from "./synk.js";

export const CONFIG = {
  autosaveMs: 1200,
  loggAterforsokMs: 15000, // nytt försök när en loggpost inte nådde tabellen
  sparaOmMs: 10_000, // nytt försök när portföljen inte gick att spara delat
  basKey: "batchc-portfolj-bas-v1", // senast gemensamma läge med databasen (basen i sammanslagningen)
  osparadKey: "batchc-portfolj-osparad-v1", // "1" så länge lokala ändringar inte nått databasen
  bekraftadKey: "batchc-portfolj-bekraftad-v1", // ISO-tid för senaste sparning som databasen kvitterat (F03)
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

/* Märkning i webbläsaren av vad som inte nått databasen. Utan den ersattes
   lokala ändringar som gjorts offline av serverns version vid nästa start. */
function lagraNyckel(nyckel, varde) {
  try {
    if (varde === null) localStorage.removeItem(nyckel);
    else localStorage.setItem(nyckel, varde);
  } catch {
    /* full eller blockerad lagring — då finns ingen bas att slå ihop mot */
  }
}
/* Synkläget (F03, förenklad kö) speglas till providern så att det kan visas:
   osparat ja/nej, senast bekräftade sparning och antal återförsök. */
let synkLyssnare = null;
const markeraOsparad = (ja) => {
  lagraNyckel(CONFIG.osparadKey, ja ? "1" : null);
  synkLyssnare?.((s) => (s.osparat === ja ? s : { ...s, osparat: ja }));
};
function lasBekraftad() {
  try {
    return localStorage.getItem(CONFIG.bekraftadKey) || null;
  } catch {
    return null;
  }
}
function arOsparad() {
  try {
    return localStorage.getItem(CONFIG.osparadKey) === "1";
  } catch {
    return false;
  }
}
function lasBas() {
  try {
    const raw = localStorage.getItem(CONFIG.basKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Basen i sammanslagningen: hålls i minnet och speglas i webbläsaren för nästa start. */
function sattBas(ref, payload) {
  ref.current = payload;
  lagraNyckel(CONFIG.basKey, JSON.stringify(payload));
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
  return !!(ae && ae.closest && (ae.closest("main") || ae.closest(".field-material-dialog")) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName));
}

export function PortfolioProvider({ children }) {
  const { visaToast } = useUi();
  const [state, rawDispatch] = useReducer(reducer, undefined, laddaLokalt);
  const [conn, setConn] = useState({ kl: "", txt: "Ansluter till delad lagring…" });
  /** Konflikter som väntar på ett val i konfliktvyn (#70). @type {[import("../lib/typer.js").Konfliktdetalj[], Function]} */
  const [konflikter, setKonflikter] = useState([]);
  const laggTillKonflikter = useCallback((detaljer) => {
    if (!detaljer?.length) return;
    setKonflikter((nu) => [...nu.filter((k) => !detaljer.some((d) => d.vag === k.vag)), ...detaljer]);
  }, []);
  /** @type {[import("../lib/typer.js").Synkoperation, Function]} */
  const [synk, setSynk] = useState(() => ({ osparat: arOsparad(), senastBekraftad: lasBekraftad(), forsok: 0, fel: null }));
  useEffect(() => {
    synkLyssnare = setSynk;
    return () => {
      if (synkLyssnare === setSynk) synkLyssnare = null;
    };
  }, []);
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
  const loggPagar = useRef(false); // en skrivning till loggtabellen är på väg
  const loggTimer = useRef(null);
  const [loggForsok, setLoggForsok] = useState(0);
  const tillampaFjarr = useRef(null); // sätts nedan, efter sparaState
  const laddad = useRef(false); // första läsningen från databasen är gjord — innan dess skrivs inget delat
  const anslutRef = useRef(null); // ny anslutning (efter ett misslyckat försök eller när nätet är tillbaka)
  const lasInVantande = useRef(null); // läser in en delad ändring som väntar
  const sparaRef = useRef(null); // sparaState för händelser utanför spar-logiken
  const startRef = useRef(null); // lokala läget när appen startade — reservbas om ingen bas sparats
  if (startRef.current === null) startRef.current = packaStatePayload(state);

  /* Håll en färsk referens till state för de asynkrona callbackerna (autospar
     och db-snapshots). Deklarerad före autospar-effekten så att den hinner
     uppdateras innan payloaden packas. */
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* Sätter state och låter stateRef följa direkt. Annars läser nästa asynkrona steg
     (till exempel ekonomidokumentet) ett föråldrat läge innan React hunnit rendera,
     och skriver tillbaka det över det som just lästs in. */
  const sattNu = useCallback((nytt) => {
    stateRef.current = nytt;
    rawDispatch({ type: "SATT_STATE", state: nytt });
  }, []);

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

  /* Skriver lokalt och rapporterar. I lokalt läge är det enda lagringen, så ett fel visas i statusraden och
     som en varning (en gång, tills det lyckas igen). I delat läge bär databasen, och felet ignoreras. */
  const lokalFelVarnat = useRef(false);
  const skrivLokaltOchRapportera = useCallback((s) => {
    const r = skrivLokalt(CONFIG.storageKey, s);
    if (dbRef.current) return;
    if (r.ok) {
      lokalFelVarnat.current = false;
      setConn({ kl: "", txt: "Lokalt läge · sparad " + nu() });
      return;
    }
    setConn({ kl: "err", txt: lokalFelText(r.orsak) });
    if (!lokalFelVarnat.current) {
      lokalFelVarnat.current = true;
      visaToast(lokalFelText(r.orsak), "warn");
    }
  }, [visaToast]);

  /* Spar-vakt: bara en skrivning åt gången. En andra skrivning som startade
     före den första svarat använde den gamla versionen och gav en konflikt med
     sig själv. Den körs i stället om när den pågående är klar. */
  const sparPagar = useRef(false);
  const sparaOm = useRef(false);

  const sparaState = useCallback(async function sparaStateNu() {
    const s = stateRef.current;
    if (!dbRef.current) {
      skrivLokaltOchRapportera(s);
      return;
    }
    if (!laddad.current) {
      // Det lokala exemplaret skrivs ändå, så att ändringen överlever en krasch eller en omstart innan kontakten finns.
      skrivLokalt(CONFIG.storageKey, s);
      // Utan en läst version skulle skrivningen ersätta andras ändringar. Ändringen ligger kvar, märkt som osparad.
      setConn({ kl: "err", txt: "Väntar på delad lagring — ändringarna är sparade lokalt och läggs in när kontakten finns" });
      return;
    }
    if (sparPagar.current) {
      sparaOm.current = true;
      return;
    }
    sparPagar.current = true;
    skrivLokalt(CONFIG.storageKey, s);
    try {
      setConn({ kl: "", txt: "Sparar…" });
      const payload = packaStatePayload(s);
      const str = JSON.stringify(payload);
      senastSynkad.current = str;
      komIhagSkickad(str);
      await dbRef.current.doc(CONFIG.dbPath).set(payload);
      sattBas(basState, payload);
      // Märkningen släpps bara om inget nytt hunnit ändras under skrivningen.
      if (JSON.stringify(packaStatePayload(stateRef.current)) === str) markeraOsparad(false);
      const tid = new Date().toISOString();
      lagraNyckel(CONFIG.bekraftadKey, tid);
      setSynk((x) => ({ ...x, senastBekraftad: tid, forsok: 0, fel: null }));
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
      setConn({ kl: "err", txt: `Kunde inte spara delat (${e.code || e.message || "fel"}) — försöker igen, finns lokalt` });
      setSynk((x) => ({ ...x, osparat: true, forsok: x.forsok + 1, fel: String(e.code || e.message || "fel") }));
      /* Nät- eller serverfel: ändringen ligger kvar, märkt som osparad, och
         skickas igen. Tidigare väntade den på nästa redigering — och vid nästa
         start ersattes den av serverns version. */
      if (feltyp(e) !== "nekad") {
        clearTimeout(sparTimer.current);
        sparTimer.current = setTimeout(sparaStateNu, CONFIG.sparaOmMs);
      }
    } finally {
      sparPagar.current = false;
      if (sparaOm.current) {
        sparaOm.current = false;
        clearTimeout(sparTimer.current);
        sparTimer.current = setTimeout(sparaStateNu, 0);
      }
    }
  }, [skrivLokaltOchRapportera]);

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
    const { varde, konflikter, detaljer } = sammanfoga(bas, mina, deras);
    laggTillKonflikter(detaljer);

    dbRef.current?.doc(CONFIG.dbPath).antaVersion?.(version);
    sattBas(basState, deras);
    senastSynkad.current = JSON.stringify(packa(raw));
    vantar.current = false;

    sattNu(franPayload(varde));
    if (!lika(varde, deras)) {
      clearTimeout(sparTimer.current);
      sparTimer.current = setTimeout(sparaState, CONFIG.autosaveMs);
    } else {
      markeraOsparad(false); // inget lokalt som databasen saknar
    }
    // Statusraden skrivs över av omsparningen direkt — toasten syns.
    if (konflikter.length) visaToast(sammanslagningsText(konflikter), "warn");
    return konflikter;
  }, [franPayload, sparaState, visaToast, sattNu, laggTillKonflikter]);

  useEffect(() => {
    tillampaFjarr.current = tillampaFjarrFn;
  }, [tillampaFjarrFn]);

  const sparaEkonomi = useCallback(async function sparaEkonomiNu() {
    const s = stateRef.current;
    const forsok = packaEkonomi(s);
    if (!dbRef.current) {
      ekonomiLast.current = forsok;
      skrivLokaltOchRapportera(s);
      return;
    }
    skrivLokalt(CONFIG.storageKey, s);
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
            sattNu(tillampaEkonomi(stateRef.current, varde));
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
          sattNu(tillampaEkonomi(stateRef.current, ekonomiLast.current));
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
  }, [skrivLokaltOchRapportera, sattNu]);

  /** Dispatch som också schemalägger autospar på rätt kanal. */
  /* Serverkvittens av egenkontroller och grindar (F05). Kvittensen köas lokalt och
     skickas till registrera_godkannande; misslyckas den försöks den igen. */
  const kvittensKo = useRef(null);
  if (kvittensKo.current === null) kvittensKo.current = lasKo();
  const [kvittens, setKvittens] = useState(() => ({ koade: kvittensKo.current.length, nekade: [], senast: null }));
  const kvittensTimer = useRef(null);
  const skickaKvittenser = useCallback(async function skickaNu() {
    if (!supabase || !kvittensKo.current.length) return;
    clearTimeout(kvittensTimer.current);
    const ko = kvittensKo.current;
    const { kvar, nekade, skickade } = await tomKo(ko, registreraGodkannande);
    // Det som lagts i kön under tiden ligger kvar.
    kvittensKo.current = [...kvar, ...kvittensKo.current.filter((k) => !ko.includes(k))];
    sparaKo(kvittensKo.current);
    setKvittens((x) => ({ koade: kvittensKo.current.length, nekade: [...x.nekade, ...nekade].slice(-20), senast: skickade ? new Date().toISOString() : x.senast }));
    if (nekade.length) visaToast(`Databasen nekade kvittens: ${nekade[0].fel}`, "warn");
    if (kvittensKo.current.length) kvittensTimer.current = setTimeout(skickaNu, CONFIG.loggAterforsokMs);
  }, [visaToast]);
  useEffect(() => {
    skickaKvittenser();
    const vidOnline = () => skickaKvittenser();
    window.addEventListener("online", vidOnline);
    return () => {
      window.removeEventListener("online", vidOnline);
      clearTimeout(kvittensTimer.current);
    };
  }, [skickaKvittenser]);

  const dispatch = useCallback(
    (action) => {
      rawDispatch(action);
      const k = supabase ? kvittensFor(action, hamtaNamn()) : null;
      if (k) {
        kvittensKo.current = laggIKo(kvittensKo.current, k);
        sparaKo(kvittensKo.current);
        setKvittens((x) => ({ ...x, koade: kvittensKo.current.length }));
        setTimeout(() => skickaKvittenser(), 0);
      }
      if (action.type === "SATT_STATE" && action.tyst) return;
      if (action.type === "SATT_LOGG") return; // loggen sparas i egen tabell
      koadKanal.current = arEkonomiAtgard(action) ? "ekonomi" : "state";
      if (koadKanal.current === "state" && dbRef.current) markeraOsparad(true);
    },
    [skickaKvittenser]
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
    let avregistrera = [];
    let omforsok = null;
    let pagar = false;

    const rensa = () => {
      avregistrera.forEach((av) => {
        try {
          if (typeof av === "function") av();
        } catch {
          /* redan avregistrerad */
        }
      });
      avregistrera = [];
    };

    /* Efter ett avbrott: läs in det som hänt och skicka det som väntar. */
    const ikapp = () => {
      vantar.current = true;
      lasInVantande.current?.();
      if (arOsparad()) {
        clearTimeout(sparTimer.current);
        sparTimer.current = setTimeout(() => sparaRef.current?.(), 0);
      }
    };

    const anslut = async () => {
      if (pagar || avbruten) return;
      pagar = true;
      try {
        await anslutEnGang();
      } finally {
        pagar = false;
      }
    };
    anslutRef.current = anslut;

    const forsokIgen = (txt) => {
      setConn({ kl: "err", txt });
      clearTimeout(omforsok);
      omforsok = setTimeout(anslut, CONFIG.sparaOmMs);
    };

    const anslutEnGang = async () => {
      rensa();
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
          /* Lokala ändringar som aldrig nått databasen (offline, tappad anslutning,
             stängd flik) slås ihop med databasens version mot senast gemensamma
             läge. Tidigare ersattes de av serverns version utan ett ord. */
          const bas = arOsparad() ? lasBas() ?? startRef.current : null;
          if (bas) {
            basState.current = bas;
            const konflikter = tillampaFjarr.current(snap.data(), undefined);
            setConn(
              konflikter.length
                ? { kl: "err", txt: sammanslagningsText(konflikter) }
                : { kl: "ok", txt: "Delad · hämtad, dina osparade ändringar är inlagda " + nu() }
            );
          } else {
            senastSynkad.current = JSON.stringify(packa(snap.data()));
            const inlast = franPayload(snap.data());
            sattBas(basState, packaStatePayload(inlast));
            sattNu(inlast);
            setConn({ kl: "ok", txt: "Delad · hämtad " + nu() });
          }
        } else {
          const start = packaStatePayload(stateRef.current);
          senastSynkad.current = JSON.stringify(start);
          await ref.set(start);
          sattBas(basState, start);
          setConn({ kl: "ok", txt: "Delad · databasen skapad " + nu() });
        }
      } catch {
        forsokIgen("Delad lagring svarar inte — ändringarna sparas lokalt, nytt försök strax");
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
          // Kanalen byggs om av db-lagret; dbRef lämnas orörd så att sparandet fortsätter och kön töms.
          (err) => setConn({ kl: "err", txt: `Delningen avbröts (${err.code}) — återansluter, ändringar sparas när kontakten är tillbaka` }),
          ikapp
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
          sattNu(tillampaEkonomi(stateRef.current, data));
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
        forsokIgen("Delad lagring svarar inte — ändringarna sparas lokalt, nytt försök strax");
        return;
      }
      laddad.current = true;
      // Något väntade på första kontakten (offline-start): skicka det nu.
      if (arOsparad() && !lika(packaStatePayload(stateRef.current), basState.current)) {
        clearTimeout(sparTimer.current);
        sparTimer.current = setTimeout(() => sparaRef.current?.(), CONFIG.autosaveMs);
      }

      const lasEkonomiIgen = async () => {
        try {
          const snap = await refEk.get();
          if (!snap.exists || !snap.data()) return;
          const data = snap.data();
          const inkommande = JSON.stringify(data);
          if (inkommande === senastSynkadEk.current || redigerarNu()) return;
          senastSynkadEk.current = inkommande;
          ekonomiLast.current = data;
          sattNu(tillampaEkonomi(stateRef.current, data));
        } catch {
          /* nästa händelse eller nästa spar ger en ny chans */
        }
      };

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
            sattNu(tillampaEkonomi(stateRef.current, data));
          },
          () => {},
          lasEkonomiIgen
        )
      );

      /* Ändringsloggen: egen append-only-tabell. Läses separat från portföljen
         och lyssnas på, så att spåret växer även när andra skriver. */
      if (DB.logg) {
        const lasLogg = async (forsta = false) => {
          const poster = await DB.logg.las();
          if (avbruten) return;
          /* Gränsen för vad som ska skickas sätts bara vid första läsningen. Vid en
             läsning efter återanslutning kan andra ha loggat under avbrottet; då får
             gränsen inte flyttas förbi lokala poster som ännu inte nått tabellen. */
          if (forsta) senastLogg.current = poster.length ? poster[0].ts : "";
          poster.forEach((p) => kandaLogg.current.add(loggNyckel(p)));
          if (poster.length) dispatch({ type: "SATT_LOGG", poster });
        };
        try {
          await lasLogg(true);
        } catch {
          senastLogg.current = null; // otillgänglig — skicka inget blint
        }
        avregistrera.push(
          DB.logg.lyssna(
            (post) => {
              // Känd innan den når listan — annars skickas den upp igen i mitt namn.
              kandaLogg.current.add(loggNyckel(post));
              dispatch({ type: "SATT_LOGG", poster: [post] });
            },
            () => lasLogg().catch(() => {})
          )
        );
      }
    };

    anslut();

    return () => {
      avbruten = true;
      clearTimeout(omforsok);
      anslutRef.current = null;
      rensa();
    };
  }, [dispatch, franPayload, sattNu]);

  /* En delad ändring som väntade medan användaren skrev läses in när fokus
     lämnar fältet. Timeouten låter fokus landa i nästa fält först. */
  useEffect(() => {
    const lasIn = async () => {
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
    };
    lasInVantande.current = lasIn;
    const vidFokusUt = () => {
      setTimeout(lasIn, 0);
    };
    /* Nätet är tillbaka: anslut om första kontakten aldrig lyckades, annars läs
       ikapp och skicka det som väntar. */
    const vidOnline = () => {
      if (!laddad.current) {
        anslutRef.current?.();
        return;
      }
      vantar.current = true;
      lasIn();
      if (arOsparad()) {
        clearTimeout(sparTimer.current);
        sparTimer.current = setTimeout(() => sparaRef.current?.(), 0);
      }
    };
    document.addEventListener("focusout", vidFokusUt);
    window.addEventListener("online", vidOnline);
    return () => {
      document.removeEventListener("focusout", vidFokusUt);
      window.removeEventListener("online", vidOnline);
    };
  }, []);

  useEffect(() => {
    sparaRef.current = sparaState;
  }, [sparaState]);

  /* Skickar upp poster som tillkommit lokalt. Avsändaren utelämnas med flit —
     databasen fyller i den inloggade adressen, och reglerna tillåter ingen
     annan. Det är hela poängen: spåret går inte att skriva i någons namn. */
  useEffect(() => {
    const db = dbRef.current;
    const granse = senastLogg.current;
    if (!db?.logg || granse === null) return;

    if (loggPagar.current) return; // körs om när skrivningen är klar

    const nya = nyaLoggposter(state.andringslogg, granse, kandaLogg.current);
    if (!nya.length) return;

    /* Posterna räknas som skickade först när tabellen har kvitterat dem.
       Tidigare markerades de före skrivningen, och ett nätfel gjorde att de
       aldrig skickades igen (granskning F04). */
    loggPagar.current = true;
    clearTimeout(loggTimer.current);
    db.logg
      .skriv([...nya].reverse())
      .then(
        () => {
          nya.forEach((p) => kandaLogg.current.add(loggNyckel(p)));
          if (senastLogg.current !== null && nya[0].ts > senastLogg.current) senastLogg.current = nya[0].ts;
          loggPagar.current = false;
          setLoggForsok((n) => n + 1); // poster som kom under skrivningen
        },
        () => {
          loggPagar.current = false;
          setConn({ kl: "err", txt: "Loggposten sparades lokalt men inte delat — nytt försök strax" });
          loggTimer.current = setTimeout(() => setLoggForsok((n) => n + 1), CONFIG.loggAterforsokMs);
        }
      );
  }, [state.andringslogg, loggForsok]);

  // Avbryt köade spar när providern plockas ner. Egen effekt — tidigare låg det
  // i db-effektens cleanup, vilket kopplade ihop två orelaterade livscykler.
  // (Lintern varnar för .current i cleanup; regeln gäller DOM-refs, inte timer-id.)
  useEffect(() => {
    const timers = [sparTimer, sparTimerEk, loggTimer];
    return () => timers.forEach((t) => clearTimeout(t.current));
  }, []);

  /* ---------- Bekvämlighetsmetoder ---------- */

  /* Vyerna ser portföljen utan förlorade anbud. Hela datan finns kvar som `heltState` för arkiv,
     export och import. Skrivningar går alltid mot hela datan. */
  const vy = useMemo(() => aktivVy(state), [state]);
  const ejVunna = useMemo(() => forlorade(state), [state]);

  const api = useMemo(
    () => ({
      state: vy,
      heltState: state,
      ejVunna,
      dispatch,
      conn,
      synk,
      konflikter,
      kvittens,
      /** Väljer version för en konflikt. "mina" eller "deras". */
      losKonflikt: (k, val) => {
        dispatch({ type: "LOS_KONFLIKT", steg: k.steg, varde: val === "mina" ? k.mina : k.deras, vag: k.vag, val });
        setKonflikter((nu) => nu.filter((x) => x.vag !== k.vag));
      },
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
      kommenteraPunkt: (id, kommentar) => dispatch({ type: "PUNKT_KOMMENTAR", id, kommentar }),
      laggTill: (lista, rad) => dispatch({ type: "LAGG_TILL", lista, rad }),
      taBort: (lista, id) => dispatch({ type: "TA_BORT", lista, id }),
      sattLista: (lista, rader) => dispatch({ type: "SATT_LISTA", lista, rader }),
      ateraktiveraAnbud: (id) => dispatch({ type: "ATERAKTIVERA_ANBUD", id }),
      markeraEjVunnet: (id, orsak, text) => dispatch({ type: "MARKERA_EJ_VUNNET", id, orsak, text }),
    }),
    [state, vy, ejVunna, dispatch, conn, synk, konflikter, kvittens, ekonomiFel, visaToast]
  );

  return <PortfolioContext.Provider value={api}>{children}</PortfolioContext.Provider>;
}
