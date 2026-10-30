/* Punkter, händelser, egenkontroller och EPC-checklistan (inkl. projektstart och baslinje).
   Delreducer: returnerar undefined för åtgärder den inte hanterar, så att
   portfolj-reducer.js kan fråga nästa domän. Flyttad oförändrad ur
   portfolj-reducer.js (R2, kodgranskning 2026-10-29). */

import { LEDTIDER, PUNKT_FOR_ID } from "../../data/bessChecklistData.ts";
import { idag } from "../../lib/datum.js";
import { postMedEpc } from "../../lib/punktlankar.js";
import { projektstartPost, utkastFranProjekt } from "../../lib/projektstart.js";
import { hamtaNamn, etikettFor, byt, uppsatt, loggat } from "./hjalp.js";

export function punkterReducer(state, action) {
  switch (action.type) {
    case "FALT_KONTROLL": {
      const { rad } = action;
      if (!rad?.id || !state.projekt.some((p) => p.id === rad.projektId)) return state;
      const gamla = state.faltkontroller || [];
      const fore = gamla.find((p) => p.id === rad.id);
      const finns = !!fore;
      const nytt = { ...state, faltkontroller: finns ? byt(gamla, rad.id, () => ({ ...rad })) : [...gamla, { ...rad }] };
      const etiketter = { resultat: "resultat", datum: "kontrolldatum", kontrollant: "kontrollant", referens: "protokollreferens", notering: "notering", mallrevision: "mallrevision", utforsAv: "utförs av", ue: "UE", ueSignerat: "UE signerad", ueDaterat: "UE daterad", ueAvvikelser: "UE avvikelser kommenterade", skickadBestallare: "skickad till beställaren" };
      const andringar = Object.entries(etiketter).filter(([k]) => String(fore?.[k] || "") !== String(rad[k] || "")).map(([k, namn]) => { const v = (x) => (x === true ? "ja" : x || "tomt"); return `${namn}: ${v(fore?.[k])} → ${v(rad[k])}`; });
      return andringar.length ? loggat(nytt, rad.projektId, `Egenkontroll ${rad.punktId} (${rad.omfattning}): ${andringar.join("; ")}`) : nytt;
    }

    /* Kommentar på en punkt. Kommentarerna är en lista med id, så att två personers
       kommentarer slås ihop av sammanfoga.js i stället för att den ena skriver över den andra. */
    case "PUNKT_KOMMENTAR": {
      const { id, kommentar } = action;
      const text = String(kommentar?.text || "").trim();
      const rad = (state.punkter || []).find((r) => r.id === id);
      if (!rad || !text || !kommentar.id) return state;
      const ny = { id: kommentar.id, text, av: kommentar.av || "", ts: kommentar.ts || "" };
      const nytt = { ...state, punkter: byt(state.punkter, id, (r) => ({ ...r, kommentarer: [...(r.kommentarer || []), ny] })) };
      const info = etikettFor(state, "punkter", id);
      return loggat(nytt, info?.projektId, `${info?.etikett || id}: kommentar — ${text.slice(0, 100)}`);
    }

    /* Komplettera en händelse med en länkad post (ÄTA, hinder, risk). Posten och
       länken läggs till tillsammans så att ingen av dem kan finnas utan den andra. */
    case "HANDELSE_KOPPLA": {
      const { punktId, lista, rad, lank } = action;
      const punkt = (state.punkter || []).find((r) => r.id === punktId);
      if (!punkt || !state[lista] || !rad?.id || !lank?.id) return state;
      if ((punkt.lankar || []).some((l) => l.id === lank.id)) return state;
      const nytt = {
        ...state,
        [lista]: [...state[lista], rad],
        punkter: byt(state.punkter, punktId, (r) => ({ ...r, lankar: [...(r.lankar || []), lank] })),
      };
      const info = etikettFor(state, "punkter", punktId);
      return loggat(nytt, punkt.projektId, `${info?.etikett || punktId}: kopplad till ${lank.etikett}`);
    }

    /* EPC-checklistan: en ledtid markerad klar före sin fas. Loggas — det
       är ett besked om att något ledtidskrävande faktiskt är igångsatt. */
    case "EPC_LEDTID": {
      const { pid, ledtid, klar } = action;
      const nytt = {
        ...state,
        epcLedtider: uppsatt(state.epcLedtider, (r) => r.projektId === pid && r.ledtid === ledtid, {
          id: `el-${pid}-${ledtid}`,
          projektId: pid,
          ledtid,
        }, { klar, datum: klar ? idag() : "", av: klar ? hamtaNamn() || "" : "" }),
      };
      const l = LEDTIDER.find((x) => x.id === ledtid);
      return loggat(nytt, pid, `Ledtid ${klar ? "klar" : "återöppnad"}: ${l ? l.arende : ledtid}`);
    }

    /* EPC-checklistan: en punkt bockad av, satt som ej aktuell eller
       återöppnad. Loggas — en godkänd hållpunkt är ett besked i sig. */
    /* Skapar projektstarten för ett befintligt projekt, med guidens startrader och
       projektets fas som golv — så att t.ex. interface-listan kan föras i
       Veckokoll innan guiden öppnats. Finns den redan händer inget. */
    case "PROJEKTSTART_SKAPA": {
      const proj = (state.projekt || []).find((p) => p.id === action.pid);
      if (!proj || (state.projektstart || []).some((x) => x.projektId === action.pid)) return state;
      /* Samma utkast som guiden öppnar för ett befintligt projekt utan sparad start: projektkortets
         fält, risker och milstolpar ifyllda. Ett tomt utkast skulle tolkas som att fälten rensats
         när guiden sparas (kortAndringar). */
      const u = utkastFranProjekt(proj, state);
      return loggat({ ...state, projektstart: [...(state.projektstart || []), projektstartPost(action.pid, u)] }, action.pid, "Projektstart skapad");
    }

    /* En rad i en Projektstart-tabell ändrad utanför guiden, t.ex. interface-listan i Veckokoll. */
    case "PROJEKTSTART_RAD": {
      const { pid, tabell, radId, falt, varde } = action;
      const post = (state.projektstart || []).find((x) => x.projektId === pid);
      const rader = post?.utkast?.rader?.[tabell] || [];
      const rad = rader.find((r) => r.id === radId);
      if (!rad || Object.is(rad[falt], varde)) return state;
      const nyPost = {
        ...post,
        utkast: { ...post.utkast, rader: { ...post.utkast.rader, [tabell]: rader.map((r) => (r.id === radId ? { ...r, [falt]: varde } : r)) } },
        uppdaterad: new Date().toISOString(),
      };
      const nytt = { ...state, projektstart: state.projektstart.map((x) => (x.id === post.id ? nyPost : x)) };
      return loggat(nytt, pid, `${tabell === "interface" ? "Interface-lista" : tabell}: ${rad.granssnitt || radId} ${falt} → ${String(varde ?? "—").slice(0, 60)}`);
    }

    case "EPC_PUNKT": {
      const { pid, punkt, status } = action;
      const nytt = {
        ...state,
        epcPunkter: uppsatt(state.epcPunkter, (r) => r.projektId === pid && r.punkt === punkt, {
          id: `ep-${pid}-${punkt}`,
          projektId: pid,
          punkt,
        }, { status, datum: status ? idag() : "", av: status ? hamtaNamn() || "" : "" }),
      };
      /* Samma punkt i Projektstart (data/punktlankar.js): skriv igenom bocken till projektstarten. */
      const post = (nytt.projektstart || []).find((x) => x.projektId === pid);
      const nyPost = post ? postMedEpc(post, punkt, status) : post;
      if (nyPost !== post) nytt.projektstart = nytt.projektstart.map((x) => (x === post ? nyPost : x));
      const hp = PUNKT_FOR_ID.get(punkt)?.badges.includes("HP");
      const vad =
        status === "klar" ? (hp ? "hållpunkt godkänd" : "klar") : status === "ejaktuell" ? "ej aktuell" : "återöppnad";
      return loggat(nytt, pid, `EPC ${punkt.replace("lop.", "∞.")} ${vad}`);
    }

    /* Kommentar, avvikelse eller lärdom på en punkt. Avvikelser och lärdomar
       blir erfarenhetslistan när projektet är klart. */
    case "EPC_KOMMENTAR": {
      const { pid, punkt, typ = "notering", text, gorSa = "", paverkan = 2, kostnad = "" } = action;
      const rad = {
        id: action.id || "ek" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        projektId: pid,
        punkt,
        typ,
        text: (text || "").trim(),
        gorSa: (gorSa || "").trim(),
        paverkan: Number(paverkan) || 2,
        kostnad,
        datum: idag(),
        av: hamtaNamn() || "",
      };
      if (!rad.text) return state;
      const nytt = { ...state, epcKommentarer: [...(state.epcKommentarer || []), rad] };
      const namn = { notering: "Kommentar", avvikelse: "Avvikelse", lardom: "Lärdom" }[typ] || "Kommentar";
      return loggat(nytt, pid, `${namn} på EPC ${punkt.replace("lop.", "∞.")}: ${rad.text.slice(0, 80)}`);
    }

    case "EPC_KOMMENTAR_UPPD": {
      const { id, falt, varde } = action;
      return { ...state, epcKommentarer: (state.epcKommentarer || []).map((k) => (k.id === id ? { ...k, [falt]: varde } : k)) };
    }

    case "EPC_KOMMENTAR_BORT":
      return { ...state, epcKommentarer: (state.epcKommentarer || []).filter((k) => k.id !== action.id) };

    /* EPC-checklistan: fasens egna datum, passerad grind och anteckningar.
       Grindpassage loggas — den låser upp nästa fas och ibland en betalning. */
    case "EPC_FAS": {
      const { pid, fas, falt, varde } = action;
      const nytt = {
        ...state,
        epcFaser: uppsatt(state.epcFaser, (r) => r.projektId === pid && r.fas === fas, {
          id: `ef-${pid}-${fas}`,
          projektId: pid,
          fas,
        }, { [falt]: varde }),
      };
      if (falt !== "grindDatum") return nytt;
      return loggat(nytt, pid, varde ? `G${fas} passerad ${varde}` : `G${fas} återöppnad`);
    }

    /* Tidplanens baslinje: en per projekt, skrivs över vid ny sparning. */
    case "SPARA_BASLINJE": {
      const { rad } = action;
      const lista = (state.epcBaslinje || []).filter((r) => r.projektId !== rad.projektId);
      return loggat({ ...state, epcBaslinje: [...lista, rad] }, rad.projektId, `Baslinje för tidplanen sparad ${rad.sparad}`);
    }

    default:
      return undefined;
  }
}
