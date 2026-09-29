/* Påminnelser om ABT 06-frister — själva körningen, utan Deno och Supabase.
   index.ts kopplar in lagret (databasen) och kanalerna (mejl, Teams); här
   ligger logiken så att den går att testa i Vitest.

   Varje frist påminns en gång per nivå: när den blir akut (≤ 12 h kvar) och
   när den passerat. Reservationen i frist_paminnelser görs FÖRE utskicket så
   att två samtidiga körningar inte skickar samma sak; misslyckas alla kanaler
   släpps reservationen och nästa körning försöker igen. */

import { meddelande, paminnelser } from "../_shared/frister.js";

const nyckelFor = (f) => `${f.nyckel}|${f.niva}`;

/**
 * @param {object} arg
 * @param {{lasPortfolj: () => Promise<object>,
 *          reservera: (rader: {nyckel:string, niva:string}[]) => Promise<{nyckel:string, niva:string}[]>,
 *          slappa: (rader: {nyckel:string, niva:string}[]) => Promise<void>}} arg.lager
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
  if (!aktuella.length) return { aktuella: 0, skickade: 0 };
  if (!kanaler.length) throw new Error("Ingen kanal konfigurerad (TEAMS_WEBHOOK_URL eller RESEND_API_KEY + PAMINNELSE_TILL)");

  const reserverade = await lager.reservera(aktuella.map((f) => ({ nyckel: f.nyckel, niva: f.niva })));
  const nya = new Set(reserverade.map(nyckelFor));
  const attSkicka = aktuella.filter((f) => nya.has(nyckelFor(f)));
  if (!attSkicka.length) return { aktuella: aktuella.length, skickade: 0 };

  const m = meddelande(attSkicka, state.projekt, appUrl);
  const kanalutfall = [];
  for (const k of kanaler) {
    try {
      await k.skicka(m);
      kanalutfall.push({ kanal: k.namn, ok: true });
    } catch (e) {
      kanalutfall.push({ kanal: k.namn, ok: false, fel: String(e?.message || e) });
    }
  }

  if (!kanalutfall.some((k) => k.ok)) {
    await lager.slappa(reserverade);
    const e = new Error("Ingen kanal kunde skicka: " + kanalutfall.map((k) => `${k.kanal}: ${k.fel}`).join("; "));
    e.kanalutfall = kanalutfall;
    throw e;
  }

  return { aktuella: aktuella.length, skickade: attSkicka.length, amne: m.amne, kanalutfall };
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

/** Portföljens frist-relevanta listor ur rader i poster eller dokumentet i app_state. */
export function portfoljUrRader(rader) {
  const ut = { ur: [], hseqIncidenter: [], projekt: [] };
  for (const r of rader) if (ut[r.lista]) ut[r.lista].push(r.data);
  return ut;
}
