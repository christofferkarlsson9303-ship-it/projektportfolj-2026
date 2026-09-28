/* En minimal Supabase i minnet för synktesten. Används via vi.mock av
   src/lib/supabase.js. Täcker exakt det adaptern använder:

   - app_state: update/select/insert med eq-filter, versionsräknare som ökar
     vid varje skrivning (som triggern i databasen)
   - andringslogg: select/order/limit och insert, där avsändaren sätts av
     "databasen" (inloggad användare), som i riktiga tabellen
   - realtid: postgres_changes per tabell, levererat asynkront som i drift

   Andra användare simuleras med annanSkriver / annanLoggar, som skriver
   direkt i tabellerna och skickar realtidshändelser. */

export function skapaFalskSupabase() {
  const appState = new Map();
  let logg = [];
  const lyssnare = new Set(); // { tabell, filter, fn }
  let inloggad = "jag@one-nordic.se";
  let fel = null; // (tabell, op, rad) => {code, message} | null

  const sand = (tabell, rad, typ = "UPDATE") => {
    for (const l of [...lyssnare]) {
      if (l.tabell !== tabell) continue;
      if (l.filter && `key=eq.${rad.key}` !== l.filter) continue;
      if (l.event !== "*" && l.event !== typ) continue;
      setTimeout(() => l.fn({ new: structuredClone(rad), eventType: typ }), 0);
    }
  };

  function fraga(tabell) {
    const villkor = [];
    let op = "select";
    let data = null;
    let gräns = null;
    const q = {
      update(v) {
        op = "update";
        data = v;
        return q;
      },
      insert(v) {
        op = "insert";
        data = v;
        return q;
      },
      select() {
        return q;
      },
      order() {
        return q;
      },
      limit(n) {
        gräns = n;
        return q;
      },
      eq(k, v) {
        villkor.push([k, v]);
        return q;
      },
      maybeSingle() {
        return kor().then((r) => (r.error ? r : { data: r.data[0] || null, error: null }));
      },
      then(ok, nej) {
        return kor().then(ok, nej);
      },
    };
    const matchar = (rad) => villkor.every(([k, v]) => rad[k] === v);

    async function kor() {
      await Promise.resolve();
      const f = fel && fel(tabell, op, data);
      if (f) return { data: null, error: f };

      if (tabell === "andringslogg") {
        if (op === "insert") {
          const rader = (Array.isArray(data) ? data : [data]).map((r) => ({ ...r, anvandare: inloggad }));
          logg.push(...rader);
          rader.forEach((r) => sand("andringslogg", r, "INSERT"));
          return { data: rader, error: null };
        }
        const sorterad = [...logg].sort((a, b) => (a.ts < b.ts ? 1 : -1));
        return { data: gräns ? sorterad.slice(0, gräns) : sorterad, error: null };
      }

      if (op === "insert") {
        const rad = { ...data, version: 1 };
        appState.set(rad.key, rad);
        sand("app_state", rad, "INSERT");
        return { data: [{ ...rad }], error: null };
      }
      const traffar = [...appState.values()].filter(matchar);
      if (op === "update") {
        for (const r of traffar) {
          Object.assign(r, structuredClone(data), { version: r.version + 1 });
          sand("app_state", r);
        }
      }
      return { data: traffar.map((r) => structuredClone(r)), error: null };
    }
    return q;
  }

  const klient = {
    from: fraga,
    channel() {
      const kanal = {
        on(_typ, { event, table, filter }, fn) {
          kanal.l = { tabell: table, filter, event, fn };
          return kanal;
        },
        subscribe() {
          lyssnare.add(kanal.l);
          return kanal;
        },
      };
      return kanal;
    },
    removeChannel(kanal) {
      lyssnare.delete(kanal.l);
    },
  };

  return {
    klient,
    appState,
    get logg() {
      return logg;
    },
    nollstall() {
      appState.clear();
      logg = [];
      lyssnare.clear();
      fel = null;
    },
    sattFel(fn) {
      fel = fn;
    },
    /** Någon annan sparar ett dokument. */
    annanSkriver(key, value) {
      const r = appState.get(key);
      Object.assign(r, { value: structuredClone(value), version: r.version + 1 });
      sand("app_state", r);
    },
    /** Någon annan skriver en loggpost. */
    annanLoggar(post, avsandare = "kim@one-nordic.se") {
      const rad = { ...post, anvandare: avsandare };
      logg.push(rad);
      sand("andringslogg", rad, "INSERT");
    },
  };
}
