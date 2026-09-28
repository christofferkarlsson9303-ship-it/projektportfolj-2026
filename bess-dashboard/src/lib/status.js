import { PILL } from "../data/konstanter.js";

/* Status i hela appen — en nyckel, en ton, en text.

   Tonerna är designsystemets: bad (röd, försenat), warn (orange, åtgärd nu),
   info (ONE Blå, pågår), ok (klart) och neutral. Rött och orange är
   accenter och används bara i små märken, aldrig som stora ytor. Status bärs
   alltid av text — färgen förstärker, den ersätter aldrig ordet.

   Klasserna står utskrivna här (inte sammansatta) så att Tailwind hittar dem. */

export const STATUS = {
  forsenad: { ton: "bad", text: "Försenad" },
  starta_nu: { ton: "warn", text: "Starta nu" },
  atgard: { ton: "warn", text: "Åtgärd" },
  pagar: { ton: "info", text: "Pågår" },
  bevaka: { ton: "info", text: "Bevaka" },
  kommande: { ton: "neutral", text: "Kommande" },
  i_tid: { ton: "neutral", text: "I tid" },
  ej_planerad: { ton: "neutral", text: "Ej planerad" },
  ej_aktuell: { ton: "neutral", text: "Ej aktuell" },
  klar: { ton: "ok", text: "Klar" },
};

/** Märkets färger per ton. Neutral får en tunn ring så att den syns mot kortet. */
export const TON_KLASS = {
  bad: "bg-bad-bg text-bad-ink",
  warn: "bg-warn-bg text-warn-ink",
  info: "bg-info-bg text-info-ink",
  ok: "bg-ok-bg text-ok-ink",
  neutral: "bg-sunken text-ink-soft ring-1 ring-inset ring-hairline-stark",
};

/** Textfärg för en detalj som hör till en status, t.ex. "15 d sedan". */
export const TON_TEXT = {
  bad: "text-bad-ink",
  warn: "text-warn-ink",
  info: "text-info-ink",
  ok: "text-ok-ink",
  neutral: "text-ink-soft",
};

/** Fasens läge i lib/epc.js → status. */
export const FAS_TILL_STATUS = {
  sen: "forsenad",
  pagar: "pagar",
  kommande: "kommande",
  klar: "klar",
  odaterad: "ej_planerad",
};

/** Ledtidens läge i lib/epc.js → status. */
export const LEDTID_TILL_STATUS = {
  sen: "forsenad",
  snart: "starta_nu",
  "i-tid": "i_tid",
  bevaka: "bevaka",
  odaterad: "ej_planerad",
  klar: "klar",
  passerad: "klar",
  ejaktuell: "ej_aktuell",
};

/** De äldre pill-klasserna (data/konstanter.js PILL) → ton. */
export const PILL_TILL_TON = { "p-ok": "ok", "p-go": "info", "p-wait": "neutral", "p-warn": "warn", "p-bad": "bad" };

/** Ton och text för en status ur registrens statuslistor (PILL i
 *  data/konstanter.js) — "fakturerad", "oppen", "godkand" … — som props till
 *  StatusBadge: <StatusBadge {...registerStatus(rad.status)} />. */
export function registerStatus(status) {
  const [c, t] = PILL[status] || ["p-wait", status];
  return { ton: PILL_TILL_TON[c], label: t };
}

/** Tonen för en status (eller en ton som redan är en ton). */
export const tonFor = (status) => STATUS[status]?.ton || (TON_KLASS[status] ? status : "neutral");
