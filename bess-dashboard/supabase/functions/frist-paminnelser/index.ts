// Edge Function: påminnelser om ABT 06-frister.
//
// Anropas av pg_cron var 15:e minut (se supabase/manuellt/frist_paminnelser_schema.sql).
// Kräver headern x-paminnelse-nyckel = PAMINNELSE_NYCKEL.
// ?torr=1 visar vad som skulle skickas utan att skicka eller reservera.
//
// Miljövariabler (supabase secrets set …):
//   PAMINNELSE_NYCKEL   delad hemlighet med schemaläggningen (krävs)
//   TEAMS_WEBHOOK_URL   Workflows-webhook till en Teams-kanal (valfri)
//   RESEND_API_KEY      mejl via Resend (valfri, kräver PAMINNELSE_TILL)
//   PAMINNELSE_TILL     mottagare, kommaseparerade
//   PAMINNELSE_FRAN     avsändare, t.ex. "Projektportfölj <pl@one-nordic.se>"
//   APP_URL             länk till appen i meddelandet
// SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY sätts av plattformen.

import { createClient } from "npm:@supabase/supabase-js@2";
import { kanalerFranMiljo, korPaminnelser, portfoljUrRader } from "./hanterare.js";

const LISTOR = ["ur", "hseqIncidenter", "projekt"];

Deno.serve(async (req) => {
  const env = Deno.env.toObject();
  if (!env.PAMINNELSE_NYCKEL || req.headers.get("x-paminnelse-nyckel") !== env.PAMINNELSE_NYCKEL) {
    return new Response(JSON.stringify({ fel: "obehörig" }), { status: 401 });
  }

  const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const lager = {
    async lasPortfolj() {
      const { data, error } = await db
        .from("poster")
        .select("lista, data")
        .in("lista", LISTOR)
        .eq("borttagen", false);
      if (!error) return portfoljUrRader(data ?? []);
      // Tabellen poster finns inte än: portföljen ligger som dokument i app_state.
      const { data: dok, error: fel2 } = await db
        .from("app_state")
        .select("value")
        .eq("key", "portfolj/state")
        .maybeSingle();
      if (fel2) throw new Error(fel2.message);
      const v = dok?.value ?? {};
      return { ur: v.ur ?? [], hseqIncidenter: v.hseqIncidenter ?? [], projekt: v.projekt ?? [] };
    },
    async reservera(rader) {
      const { data, error } = await db
        .from("frist_paminnelser")
        .upsert(rader, { onConflict: "nyckel,niva", ignoreDuplicates: true })
        .select("nyckel, niva");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async slappa(rader) {
      for (const r of rader) {
        await db.from("frist_paminnelser").delete().eq("nyckel", r.nyckel).eq("niva", r.niva);
      }
    },
  };

  const torr = new URL(req.url).searchParams.get("torr") === "1";
  try {
    const ut = await korPaminnelser({ lager, kanaler: kanalerFranMiljo(env), torr, appUrl: env.APP_URL ?? "" });
    return new Response(JSON.stringify(ut), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ fel: String(e?.message ?? e) }), { status: 500 });
  }
});
