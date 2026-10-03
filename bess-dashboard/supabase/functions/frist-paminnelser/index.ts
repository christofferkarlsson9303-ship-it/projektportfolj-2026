// Edge Function: påminnelser om frister (er 24-timmarsrutin, med kontraktets gräns i texten).
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
import { kanalerFranMiljo, korPaminnelser, portfoljUrDokument } from "./hanterare.js";

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
      // Portföljen ligger som ett dokument i app_state.
      const { data: dok, error } = await db
        .from("app_state")
        .select("value")
        .eq("key", "portfolj/state")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return portfoljUrDokument(dok?.value ?? {});
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
