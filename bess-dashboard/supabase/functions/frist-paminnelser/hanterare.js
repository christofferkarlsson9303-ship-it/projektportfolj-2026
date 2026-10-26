/* Påminnelser om frister — själva körningen, utan Deno och Supabase.
   index.ts kopplar in lagret (databasen) och kanalerna (mejl, Teams); här
   ligger logiken så att den går att testa i Vitest.

   Varje frist påminns en gång per nivå (akut ≤ 12 h kvar, passerad) och per
   revision av fristen (händelsedatumet). Beslut 2026-10-21 (F07): ALLA kanaler
   måste lyckas. Status hålls per kanal i frist_paminnelser:

     sending  reserverad av en körning, med lås som går ut (LAS_SEKUNDER)
     sent     kanalen har skickat
     failed   kanalen misslyckades – nästa körning försöker igen

   En körning som dör efter reservationen lämnar raden i sending; när låset gått
   ut tar nästa körning den. En kanal som lyckats skickar inte igen för att en
   annan misslyckats. Efter MAX_FORSOK ges kanalen upp för den fristen. */

import { meddelande, paminnelser } from "../_shared/frister.js";

export const LAS_SEKUNDER = 10 * 60;
export const MAX_FORSOK = 12;

const radNyckel = (r) => `${r.nyckel}|${r.niva}|${r.revision ?? ""}|${r.kanal}`;

/**
 * @param {object} arg
 * @param {{lasPortfolj: () => Promise<object>,
 *          reservera: (rader: {nyckel:string, niva:string, revision:string, kanal:string}[], lasSekunder:number) => Promise<{nyckel:string, niva:string, revision:string, kanal:string}[]>,
 *          markera: (rader: {nyckel:string, niva:string, revision:string, kanal:string}[], status:"sent"|"failed", fel?:string) => Promise<void>}} arg.lager
 * @param {{namn:string, skicka: (m:{amne:string, text:string}) => Promise<void>}[]} arg.kanaler
 * @param {number} [arg.nuMs]
 * @param {boolean} [arg.torr] visa vad som skulle skickas, utan att skicka eller reservera
 * @param {string} [arg.appUrl]
 */
export async function korPaminnelser({ lager, kanaler, nuMs = Date.now(), torr = false, appUrl = "" }) {
  const state = await lager.lasPortfolj();
  const aktuella = paminnelser(state, nuMs);

  if (torr) {
    return {
      torr: true,
      aktuella: aktuella.length,
      meddelande: aktuella.length ? meddelande(aktuella, state.projekt, appUrl) : null,
    };
  }
  if (!aktuella.length) return { aktuella: 0, skickade: 0, kanalutfall: [] };
  if (!kanaler.length) throw new Error("Ingen kanal konfigurerad (TEAMS_WEBHOOK_URL eller RESEND_API_KEY + PAMINNELSE_TILL)");

  const kanalutfall = [];
  const skickadeFrister = new Set();
  for (const k of kanaler) {
    const rader = aktuella.map((f) => ({ nyckel: f.nyckel, niva: f.niva, revision: f.revision ?? "", kanal: k.namn }));
    const reserverade = await lager.reservera(rader, LAS_SEKUNDER);
    const nya = new Set(reserverade.map(radNyckel));
    const attSkicka = aktuella.filter((f) => nya.has(radNyckel({ ...f, revision: f.revision ?? "", kanal: k.namn })));
    if (!attSkicka.length) {
      kanalutfall.push({ kanal: k.namn, ok: true, antal: 0 });
      continue;
    }
    try {
      await k.skicka(meddelande(attSkicka, state.projekt, appUrl));
      await lager.markera(reserverade, "sent");
      attSkicka.forEach((f) => skickadeFrister.add(`${f.nyckel}|${f.niva}`));
      kanalutfall.push({ kanal: k.namn, ok: true, antal: attSkicka.length });
    } catch (e) {
      const fel = String(e?.message || e);
      await lager.markera(reserverade, "failed", fel);
      kanalutfall.push({ kanal: k.namn, ok: false, antal: attSkicka.length, fel });
    }
  }

  const misslyckade = kanalutfall.filter((k) => !k.ok);
  if (misslyckade.length) {
    const e = new Error(`${misslyckade.length} av ${kanaler.length} kanaler kunde inte skicka (försöks igen): ` + misslyckade.map((k) => `${k.kanal}: ${k.fel}`).join("; "));
    e.kanalutfall = kanalutfall;
    throw e;
  }
  return { aktuella: aktuella.length, skickade: skickadeFrister.size, kanalutfall };
}

/* ---------- Kanaler ---------- */

/** Teams via Workflows-webhook ("Post to a channel when a webhook request is
 *  received"). Adaptiva kort är formatet Workflows tar emot. */
export function teamsKanal(url, hamta = fetch) {
  return {
    namn: "teams",
    async skicka({ amne, text }) {
      const kort = {
        type: "message",
        attachments: [
          {
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
              type: "AdaptiveCard",
              $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
              version: "1.4",
              body: [
                { type: "TextBlock", text: amne, weight: "Bolder", size: "Medium", wrap: true },
                { type: "TextBlock", text: text.split("\n").slice(2).join("\n\n"), wrap: true },
              ],
            },
          },
        ],
      };
      const svar = await hamta(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kort),
      });
      if (!svar.ok) throw new Error(`Teams svarade ${svar.status}`);
    },
  };
}

/** Mejl via Resend. */
export function mejlKanal({ nyckel, fran, till }, hamta = fetch) {
  return {
    namn: "mejl",
    async skicka({ amne, text }) {
      const svar = await hamta("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${nyckel}` },
        body: JSON.stringify({ from: fran, to: till, subject: amne, text }),
      });
      if (!svar.ok) throw new Error(`Resend svarade ${svar.status}`);
    },
  };
}

/** Kanaler ur miljövariabler. */
export function kanalerFranMiljo(env, hamta = fetch) {
  const ut = [];
  if (env.TEAMS_WEBHOOK_URL) ut.push(teamsKanal(env.TEAMS_WEBHOOK_URL, hamta));
  if (env.RESEND_API_KEY && env.PAMINNELSE_TILL) {
    ut.push(
      mejlKanal(
        {
          nyckel: env.RESEND_API_KEY,
          fran: env.PAMINNELSE_FRAN || "Projektportfölj <onboarding@resend.dev>",
          till: env.PAMINNELSE_TILL.split(",").map((s) => s.trim()).filter(Boolean),
        },
        hamta
      )
    );
  }
  return ut;
}

/** Portföljens frist-relevanta listor ur dokumentet i app_state. */
export function portfoljUrDokument(v = {}) {
  return { ur: v.ur ?? [], hseqIncidenter: v.hseqIncidenter ?? [], projekt: v.projekt ?? [], kontrakt: v.kontrakt ?? [] };
}

/** Jämför två hemligheter utan att svarstiden avslöjar hur många tecken som
 *  stämmer. Längden får läcka (nyckeln är lång och slumpad), innehållet inte. */
export function likaNycklar(given, vantad) {
  if (typeof given !== "string" || typeof vantad !== "string" || !vantad) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(vantad);
  let skillnad = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) skillnad |= (a[i] ?? 0) ^ b[i];
  return skillnad === 0;
}
