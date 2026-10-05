import { useEffect, useMemo, useRef } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { AtaAvi } from "../../components/print/AtaAvi.jsx";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { idag } from "../../lib/datum.js";
import { laddaNer } from "../../lib/export.js";
import { fmtSEK } from "../../lib/format.js";
import { kalkylResurser } from "../../lib/planering.js";
import { kalkylCsv, kalkylRader, kalkylSummor, nyKalkylRad, tidrapportRader } from "../../lib/atakalkyl.js";

/* ÄTA-kalkylens logik för ett ärende — samma i kortet under ÄTA och hinder
   (AtaKalkyl) och i fliken ÄTA-kalkyl (AtaKalkylVy). Raderna ligger på
   ärendet (kalkyl.rader); inget sparas vid sidan av portföljen. */

/** Avins dokumentmodell — samma för utskrift och PDF. */
export function aviDokument(u, projekt, rader) {
  return {
    ata: u,
    projekt: projekt || { id: u.projektId, namn: "" },
    rader,
    summor: kalkylSummor(rader),
    dagbok: [],
    datum: idag(),
    skapadAv: hamtaNamn(),
  };
}

/** Allt kalkylen gör med ett ärende: rader, summor och åtgärder. */
export function useAtaKalkyl(u) {
  const { state, dispatch } = usePortfolj();
  const { skrivUt, visaToast } = useUi();
  const fokusRad = useRef(null);

  const resurser = useMemo(() => kalkylResurser(state), [state]);
  const rader = kalkylRader(u);
  const summor = kalkylSummor(rader);
  const franTid = tidrapportRader(state, u);
  const projekt = state.projekt.find((p) => p.id === u.projektId) || null;
  const harBelopp = u.belopp !== null && u.belopp !== undefined && u.belopp !== "";
  const sparat = harBelopp && Number(u.belopp) === summor.netto;

  /* En ny rad får fokus i sin beskrivning när den har ritats. */
  useEffect(() => {
    const el = fokusRad.current && document.getElementById(`kb-${fokusRad.current}`);
    if (!el) return;
    fokusRad.current = null;
    el.focus();
  });

  const laggTill = (nya, efter) => dispatch({ type: "ATA_KALKYL_LAGG_TILL", id: u.id, rader: nya, efter });
  const andra = (radId, andring) => dispatch({ type: "ATA_KALKYL_ANDRA", id: u.id, radId, andring });
  const taBort = (radId) => dispatch({ type: "ATA_KALKYL_TA_BORT", id: u.id, radId });

  const nyRad = (resurs) => {
    const r = nyKalkylRad(resurs);
    laggTill([r]);
    fokusRad.current = r.id;
  };

  /* Enter i beskrivningen: ny rad direkt under, med samma resurs och datum. */
  const nyRadEfter = (rad) => {
    const resurs = resurser.find((x) => x.namn === rad.resurs);
    const r = resurs
      ? nyKalkylRad(resurs, { datum: rad.datum })
      : { ...nyKalkylRad(null, { datum: rad.datum }), resurs: rad.resurs, kategori: rad.kategori, enhet: rad.enhet, apris: rad.apris, paslag: rad.paslag };
    laggTill([r], rad.id);
    fokusRad.current = r.id;
  };

  const spara = () => {
    dispatch({ type: "ATA_KALKYL_SPARA", id: u.id });
    visaToast(`${u.nr}: ${fmtSEK(summor.netto)} sparat på ärendet`);
  };

  const exporteraCsv = async () => {
    if (!rader.length) {
      visaToast("Kalkylen har inga rader.", "warn");
      return;
    }
    const r = await laddaNer(`ATA_kalkyl_${u.nr}_${idag()}.csv`.replace(/[^\p{L}\p{N}_.-]+/gu, "_"), kalkylCsv(rader));
    if (!r.tyst && r.txt) visaToast(r.txt, r.typ || "");
  };

  const avi = aviDokument(u, projekt, rader);
  const skrivUtAvi = () => skrivUt(<AtaAvi dokument={avi} />);

  return { resurser, rader, summor, franTid, projekt, harBelopp, sparat, laggTill, andra, taBort, nyRad, nyRadEfter, spara, exporteraCsv, avi, skrivUtAvi };
}
