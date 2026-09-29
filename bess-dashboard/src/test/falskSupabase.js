/* En minimal Supabase i minnet för synktesten. Används via vi.mock av
   src/lib/supabase.js. Täcker exakt det adaptrarna använder:

   - app_state: update/select/insert med eq-filter, versionsräknare som ökar
     vid varje skrivning (som triggern i databasen)
   - poster (om medPoster): rad per post med nyckeln (lista, id), version per
     rad, unik nyckel (23505) och poster_historik som triggern fyller
   - andringslogg: select/order/limit och insert, där avsändaren sätts av
     "databasen" (inloggad användare), som i riktiga tabellen
   - realtid: postgres_changes per tabell, levererat asynkront som i drift
   - okänd tabell: PGRST205, som PostgREST svarar när tabellen saknas

   Andra användare simuleras med annanSkriver / annanPost / annanLoggar, som
   skriver direkt i tabellerna och skickar realtidshändelser. */

export function skapaFalskSupabase() {
  const appState = new Map();
  const poster = new Map(); // "lista\0id" → rad
  let historik = [];
  let logg = [];
  const lyssnare = new Set(); // { tabell, filter, event, fn }
  let inloggad = "jag@one-nordic.se";
  let fel = null; // (tabell, op, data) => {code, message} | null
  let medPoster = false;

  const pk = (lista, id) => `${lista}\u0000${id}`;
  const klon = (v) => structuredClone(v);

  const sand = (tabell, rad, typ = "UPDATE") => {
    for (const l of [...lyssnare]) {
      if (l.tabell !== tabell) continue;
      if (l.filter && `key=eq.${rad.key}` !== l.filter) continue;
      if (l.event !== "*" && l.event !== typ) continue;
      setTimeout(() => l.fn({ new: klon(rad), eventType: typ }), 0);
    }
  };

  function posterSkrivning(rad, gammal, av) {
    const ny = { ...rad, projekt_id: rad.data?.projektId ?? null, uppdaterad_av: av };
    ny.version = gammal ? gammal.version + 1 : 1;
    ny.borttagen = !!ny.borttagen;
    ny.ordning = ny.ordning ?? 0;
    poster.set(pk(ny.lista, ny.id), ny);
    const andrad = !gammal || JSON.stringify(gammal.data) !== JSON.stringify(ny.data) || gammal.borttagen !== ny.borttagen;
    if (andrad) {
      const operation = !gammal
        ? "skapad"
        : ny.borttagen && !gammal.borttagen
          ? "borttagen"
          : !ny.borttagen && gammal.borttagen
            ? "aterstalld"
            : "andrad";
      historik.push({ lista: ny.lista, id: ny.id, version: ny.version, operation, data: klon(ny.data), tid: new Date().toISOString(), av });
    }
    sand("poster", ny, gammal ? "UPDATE" : "INSERT");
    return ny;
  }

  function fraga(tabell) {
    const villkor = [];
    let op = "select";
    let data = null;
    let gräns = null;
    let intervall = null;
    let ordning = null;
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
      order(kol, opt) {
        if (!ordning) ordning = [kol, opt?.ascending !== false];
        return q;
      },
      limit(n) {
        gräns = n;
        return q;
      },
      range(a, b) {
        intervall = [a, b];
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
    const utsnitt = (lista) => {
      let ut = lista;
      if (ordning) {
        const [kol, upp] = ordning;
        ut = [...ut].sort((a, b) => (a[kol] < b[kol] ? -1 : a[kol] > b[kol] ? 1 : 0) * (upp ? 1 : -1));
      }
      if (intervall) ut = ut.slice(intervall[0], intervall[1] + 1);
      if (gräns) ut = ut.slice(0, gräns);
      return ut;
    };

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

      if (tabell === "poster" || tabell === "poster_historik") {
        if (!medPoster) return { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${tabell}' in the schema cache` } };
        if (tabell === "poster_historik") return { data: klon(utsnitt(historik.filter(matchar))), error: null };
        if (op === "insert") {
          const rader = Array.isArray(data) ? data : [data];
          if (rader.some((r) => poster.has(pk(r.lista, r.id))))
            return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
          return { data: rader.map((r) => klon(posterSkrivning(klon(r), null, inloggad))), error: null };
        }
        const traffar = [...poster.values()].filter(matchar);
        if (op === "update") {
          return { data: traffar.map((r) => klon(posterSkrivning({ ...r, ...klon(data) }, r, inloggad))), error: null };
        }
        return { data: klon(utsnitt(traffar)), error: null };
      }

      if (tabell !== "app_state")
        return { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${tabell}' in the schema cache` } };

      if (op === "insert") {
        const rad = { ...data, version: 1 };
        appState.set(rad.key, rad);
        sand("app_state", rad, "INSERT");
        return { data: [{ ...rad }], error: null };
      }
      const traffar = [...appState.values()].filter(matchar);
      if (op === "update") {
        for (const r of traffar) {
          Object.assign(r, klon(data), { version: r.version + 1 });
          sand("app_state", r);
        }
      }
      return { data: traffar.map((r) => klon(r)), error: null };
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
    poster,
    get historik() {
      return historik;
    },
    get logg() {
      return logg;
    },
    nollstall({ poster: medPosterTabell = false } = {}) {
      appState.clear();
      poster.clear();
      historik = [];
      logg = [];
      lyssnare.clear();
      fel = null;
      medPoster = medPosterTabell;
    },
    sattFel(fn) {
      fel = fn;
    },
    /** Hämtar en rad i poster. */
    post(lista, id) {
      return poster.get(pk(lista, id)) || null;
    },
    /** Någon annan sparar ett dokument. */
    annanSkriver(key, value) {
      const r = appState.get(key);
      Object.assign(r, { value: klon(value), version: r.version + 1 });
      sand("app_state", r);
    },
    /** Någon annan ändrar en post (fält slås in i datan). */
    annanPost(lista, id, falt, avsandare = "kim@one-nordic.se") {
      const r = poster.get(pk(lista, id));
      return posterSkrivning({ ...r, data: { ...r.data, ...klon(falt) } }, r, avsandare);
    },
    /** Någon annan skriver en loggpost. */
    annanLoggar(post, avsandare = "kim@one-nordic.se") {
      const rad = { ...post, anvandare: avsandare };
      logg.push(rad);
      sand("andringslogg", rad, "INSERT");
    },
  };
}
