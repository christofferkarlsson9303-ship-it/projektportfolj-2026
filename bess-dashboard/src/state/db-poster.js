/* Portföljdokumentet ovanpå tabellen poster — en rad per post.

   PortfolioProvider är skriven mot ett dokument-API (get / set / onSnapshot /
   antaVersion). Här presenteras raderna som samma dokument, {lista: [rader]},
   men under ytan sparas bara de rader som ändrats, var och en med sin egen
   versionskontroll. Två personer som ändrar olika poster krockar därför
   aldrig; bara samma post ändrad samtidigt ger konflikt, och då slår
   providern ihop fält för fält som förut.

   kanda   senast inlästa serverläge per rad {version, json, ordning, borttagen}.
           Det är mot det här set() räknar ut vad som ändrats.
   fjarr   radändringar som kommit via realtid men som providern inte tagit in
           ännu (användaren skriver). Flyttas till kanda först när providern
           anropar antaVersion — annars skulle en osparad lokal version av
           samma rad kunna skrivas över utan konflikt. */

import { fel } from "./db-fel.js";

const TABELL = "poster";
const SIDA = 1000;

/** Nyckel för en rad. Rutinstatus saknar id och nycklas på projekt och punkt,
 *  samma som i migreringen. */
export function radId(lista, rad) {
  if (rad && rad.id !== undefined && rad.id !== null && rad.id !== "") return String(rad.id);
  if (lista === "rutinstatus") return `rs-${rad?.projektId ?? ""}-${rad?.punkt ?? ""}`;
  return "~" + enkelHash(JSON.stringify(rad));
}

function enkelHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

const nyckel = (lista, id) => `${lista}\u0000${id}`;

/** Bygger dokumentet ur en karta av rader. Borttagna hoppas över. */
function sattIhop(radkarta) {
  const listor = {};
  for (const r of radkarta.values()) {
    if (r.borttagen) continue;
    (listor[r.lista] ||= []).push(r);
  }
  const ut = {};
  for (const [lista, rader] of Object.entries(listor)) {
    rader.sort((a, b) => a.ordning - b.ordning || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    ut[lista] = rader.map((r) => JSON.parse(r.json));
  }
  return ut;
}

const franServer = (r) => ({
  lista: r.lista,
  id: r.id,
  version: r.version,
  ordning: r.ordning ?? 0,
  borttagen: !!r.borttagen,
  json: JSON.stringify(r.data),
});

/** Önskat läge ur ett dokument: karta nyckel → {lista, id, ordning, json}. */
function onskat(payload) {
  const ut = new Map();
  for (const [lista, rader] of Object.entries(payload || {})) {
    if (!Array.isArray(rader)) continue;
    rader.forEach((rad, i) => {
      if (!rad || typeof rad !== "object") return;
      const id = radId(lista, rad);
      ut.set(nyckel(lista, id), { lista, id, ordning: i, json: JSON.stringify(rad) });
    });
  }
  return ut;
}

/**
 * Skapar ett dokument-handtag mot poster-tabellen.
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 */
export function radDokument(supabase) {
  const kanda = new Map();
  const fjarr = new Map();
  let token = 0;
  const tokenLage = new Map(); // token → nycklar och versioner i fjarr vid emission

  async function lasAlla() {
    const alla = [];
    for (let fran = 0; ; fran += SIDA) {
      const { data, error } = await supabase
        .from(TABELL)
        .select("lista, id, ordning, data, version, borttagen")
        .order("lista")
        .order("id")
        .range(fran, fran + SIDA - 1);
      if (error) throw fel(error.code, error.message);
      alla.push(...(data || []));
      if (!data || data.length < SIDA) break;
    }
    return alla;
  }

  async function uppdatera(rad, falt) {
    const { data, error } = await supabase
      .from(TABELL)
      .update(falt)
      .eq("lista", rad.lista)
      .eq("id", rad.id)
      .eq("version", rad.version)
      .select("lista, id, ordning, data, version, borttagen");
    if (error) throw fel(error.code, error.message);
    if (data && data.length) return { ok: franServer(data[0]) };

    // Noll rader: någon hann före, eller så sa reglerna nej.
    const { data: nu, error: lasfel } = await supabase
      .from(TABELL)
      .select("lista, id, ordning, data, version, borttagen")
      .eq("lista", rad.lista)
      .eq("id", rad.id)
      .maybeSingle();
    if (lasfel) throw fel(lasfel.code, lasfel.message);
    if (nu && nu.version !== rad.version) return { konflikt: franServer(nu) };
    return { nekad: true };
  }

  return {
    /** Läser hela portföljen och gör det till känt läge. */
    async get() {
      const alla = await lasAlla();
      kanda.clear();
      fjarr.clear();
      for (const r of alla) {
        const s = franServer(r);
        kanda.set(nyckel(s.lista, s.id), s);
      }
      const payload = sattIhop(kanda);
      const finns = alla.some((r) => !r.borttagen);
      return { exists: finns, data: () => (finns ? payload : null) };
    },

    /** Skriver bara det som skiljer från känt läge. Konflikt kastas efter att
     *  alla övriga rader skrivits, så att bara de krockande återstår. */
    async set(payload) {
      const mal = onskat(payload);
      const nya = [];
      const andringar = [];

      for (const [k, m] of mal) {
        const kand = kanda.get(k);
        if (!kand) nya.push(m);
        else if (kand.borttagen || kand.json !== m.json || kand.ordning !== m.ordning)
          andringar.push({ kand, falt: { data: JSON.parse(m.json), ordning: m.ordning, borttagen: false } });
      }
      for (const [k, kand] of kanda) {
        if (!kand.borttagen && !mal.has(k)) andringar.push({ kand, falt: { borttagen: true } });
      }

      let konflikter = 0;
      let nekade = 0;

      if (nya.length) {
        const { data, error } = await supabase
          .from(TABELL)
          .insert(nya.map((m) => ({ lista: m.lista, id: m.id, ordning: m.ordning, data: JSON.parse(m.json) })))
          .select("lista, id, ordning, data, version, borttagen");
        if (error) {
          // Unik nyckel finns redan: någon annan skapade samma post.
          if (error.code === "23505") konflikter++;
          else throw fel(error.code, error.message);
        } else {
          for (const r of data || []) {
            const s = franServer(r);
            kanda.set(nyckel(s.lista, s.id), s);
          }
        }
      }

      for (const { kand, falt } of andringar) {
        const ut = await uppdatera(kand, falt);
        if (ut.ok) kanda.set(nyckel(ut.ok.lista, ut.ok.id), ut.ok);
        else if (ut.konflikt) konflikter++;
        else nekade++;
      }

      if (konflikter) throw fel("konflikt", `${konflikter} post(er) ändrade av någon annan sedan du läste`);
      if (nekade) throw fel("nekad", "skrivning nekad av behörighetsreglerna");
    },

    /** Providern har tagit in läget från snapshoten med denna token. */
    antaVersion(t) {
      const lage = tokenLage.get(t);
      if (!lage) return;
      for (const [k, version] of lage) {
        const r = fjarr.get(k);
        if (r && r.version === version) {
          kanda.set(k, r);
          fjarr.delete(k);
        }
      }
      for (const gammal of [...tokenLage.keys()]) if (gammal <= t) tokenLage.delete(gammal);
    },

    /** Realtid per rad. Egna ekon (version redan känd) ignoreras. Flera
     *  ändringar i samma svep samlas till en snapshot. */
    onSnapshot(vidAndring, vidFel) {
      let timer = null;
      const skicka = () => {
        timer = null;
        const vy = new Map(kanda);
        for (const [k, r] of fjarr) vy.set(k, r);
        const payload = sattIhop(vy);
        token += 1;
        tokenLage.set(token, new Map([...fjarr].map(([k, r]) => [k, r.version])));
        vidAndring({ exists: true, version: token, data: () => payload, metadata: { hasPendingWrites: false } });
      };

      const kanal = supabase
        .channel("poster")
        .on("postgres_changes", { event: "*", schema: "public", table: TABELL }, (handelse) => {
          const r = handelse.new && Object.keys(handelse.new).length ? handelse.new : null;
          if (!r || r.lista === undefined) return;
          const s = franServer(r);
          const k = nyckel(s.lista, s.id);
          const kand = kanda.get(k);
          const vantande = fjarr.get(k);
          if ((kand && kand.version >= s.version) || (vantande && vantande.version >= s.version)) return;
          fjarr.set(k, s);
          if (!timer) timer = setTimeout(skicka, 30);
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") vidFel?.(fel(status, err?.message || status));
        });

      return () => {
        clearTimeout(timer);
        supabase.removeChannel(kanal);
      };
    },

    /** Versionerna av en post, nyast först. */
    async historik(lista, id) {
      const { data, error } = await supabase
        .from("poster_historik")
        .select("version, operation, data, tid, av")
        .eq("lista", lista)
        .eq("id", String(id))
        .order("version", { ascending: false })
        .limit(100);
      if (error) throw fel(error.code, error.message);
      return data || [];
    },
  };
}

/** Finns poster-tabellen? Saknas den (migreringen inte körd) används
 *  portföljdokumentet i app_state som förut. */
export async function harPosterTabell(supabase) {
  const { error } = await supabase.from(TABELL).select("id").limit(1);
  if (!error) return true;
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message || ""))
    return false;
  throw fel(error.code, error.message);
}
