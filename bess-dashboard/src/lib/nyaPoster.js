/* Nya poster — en form per lista.

   Samma rad skapades tidigare inline på två eller tre ställen (ÄTA från
   ÄTA-vyn och från byggmötet, dagboksrad från dagboken och från ett ÄTA-ärende)
   och formerna hade börjat glida isär. Nu finns formen här, och den som skapar
   posten skickar bara med det som skiljer. Översiktens snabbåtgärder använder
   samma fabriker, så en post skapad därifrån är identisk med en skapad i vyn. */

import { idag } from "./datum.js";

const lopnr = (lista, pid, prefix) =>
  prefix + String((lista || []).filter((r) => r.projektId === pid).length + 1).padStart(3, "0");

/** ÄTA/UR-post. Händelsedatum blir idag om inget annat anges — 24-timmarsfristen
 *  för underrättelse räknas därifrån. */
export function nyAtaPost(state, pid, falt = {}) {
  return {
    id: "u" + Date.now(),
    projektId: pid,
    nr: lopnr(state.ur, pid, "UR"),
    benamning: "",
    status: "oppen",
    klass: "oklar",
    handelseDatum: idag(),
    underrattelseDatum: "",
    prisgrund: "lopande",
    belopp: null,
    godkantDatum: "",
    fakturaDatum: "",
    arbeteStartat: false,
    orsak: "",
    ...falt,
  };
}

/** Dagboksrad. ataRef binder raden till ÄTA-numret vid fakturering. */
export function nyDagboksrad(pid, falt = {}) {
  return {
    id: "d" + Date.now(),
    projektId: pid,
    ataRef: "",
    titel: "",
    startdatum: idag(),
    omfattning: "",
    vader: "",
    kostnad: "",
    ombud: "",
    forvantadTid: "",
    faktiskTid: "",
    kravSignering: false,
    signerad: false,
    fakturerad: false,
    notering: "",
    ...falt,
  };
}

/** Skyddsrond med tom checklista, daterad idag. */
export function nySkyddsrond(pid, falt = {}) {
  return {
    id: "sr" + Date.now(),
    projektId: pid,
    datum: idag(),
    utfordAv: "",
    checklista: {},
    enia: "",
    avvikelser: [],
    ...falt,
  };
}
