/* Supabase-klienten. Saknas miljövariablerna returneras null, och appen faller
   tillbaka på lokalt läge precis som förut — bygget ska aldrig gå sönder bara
   för att någon kör utan .env.local. */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const nyckel = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const KONFIGURERAD = !!(url && nyckel);

/** Lokalt läge är bara tillåtet i utveckling och i byggen som uttryckligen ber om det
 *  (e2e, fristående fil). Ett produktionsbygge utan Supabase-variabler – till exempel en
 *  Vercel-publicering där variablerna fallit bort – ska inte öppna en osynkad arbetsyta
 *  som ser ut som den riktiga (granskning #71). */
export function lokaltLageSparrat({ prod, konfigurerad, tillat }) {
  return Boolean(prod) && !konfigurerad && tillat !== "1";
}

export const LOKALT_SPARRAT = lokaltLageSparrat({
  prod: import.meta.env.PROD,
  konfigurerad: KONFIGURERAD,
  tillat: import.meta.env.VITE_TILLAT_LOKALT,
});

export const supabase = KONFIGURERAD
  ? createClient(url, nyckel, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
