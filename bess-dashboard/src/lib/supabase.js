/* Supabase-klienten. Saknas miljövariablerna returneras null, och appen faller
   tillbaka på lokalt läge precis som förut — bygget ska aldrig gå sönder bara
   för att någon kör utan .env.local. */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const nyckel = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const KONFIGURERAD = !!(url && nyckel);

export const supabase = KONFIGURERAD
  ? createClient(url, nyckel, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
