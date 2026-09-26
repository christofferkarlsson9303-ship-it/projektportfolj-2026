import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Card, Kpi, Note, Tabellyta } from "../components/ui/Primitiver.jsx";
import { DatumFalt, Falt } from "../components/ui/Falt.jsx";
import { Slideover } from "../components/ui/Slideover.jsx";
import { Skyddsrondsprotokoll } from "../components/ui/Rondprotokoll.jsx";
import { AVVIKELSENIVA, HSEQ_VITE, INCIDENTTYP, RONDPUNKTER } from "../data/konstanter.js";
import {
  ampAktuell,
  dagarSedanRond,
  incidentLage,
  oppnaRondavvikelser,
} from "../lib/berakningar.js";
import { rondHint, rondKlass } from "../lib/hseqtriage.js";
import { fmtSEK } from "../lib/format.js";
import { idag } from "../lib/datum.js";
import { nySkyddsrond } from "../lib/nyaPoster.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* HSEQ / BAS-U.

   Fyra grindar ur kontraktet och arbetsmiljölagstiftningen: skyddsrond minst
   varannan vecka, aktuell arbetsmiljöplan, åtgärdade rondavvikelser och
   incidentrapport inom 24 timmar. Flaggmotorn larmar redan på de två första —
   den här vyn är platsen larmet pekar på.

   Reducern behövde inte röras. hseqRonder, hseqIncidenter, hseqAmp och
   hseqId06 är toppnivåkollektioner, så generiska UPPDATERA och LAGG_TILL
   räcker; rondens nästlade checklista skrivs som ett helt objekt och
   avvikelserna går genom UPPD_RONDAVVIKELSE som redan fanns.

   Ronden öppnas i en slide-over så att listan över ronder ligger kvar. */

const nyttId = (prefix) => prefix + Date.now();

function Incident({ i, onUppd }) {
  const lage = incidentLage(i);

  return (
    <div className={`atarad${lage?.varning ? " flagg" : ""}`} style={{ marginBottom: 8 }}>
      <div className="ataform" style={{ borderTop: "none", padding: 13 }}>
        <div className="frow c3">
          <div className="f">
            <label htmlFor={`ityp-${i.id}`}>Typ</label>
            <select
              id={`ityp-${i.id}`}
              value={i.typ || "tillbud"}
              onChange={(e) => onUppd(i.id, "typ", e.target.value)}
            >
              {INCIDENTTYP.map(([v, n]) => (
                <option key={v} value={v}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label htmlFor={`idat-${i.id}`}>Datum</label>
            <DatumFalt
              id={`idat-${i.id}`}
              varde={i.datum}
              etikett="Datum för incidenten"
              onCommit={(v) => onUppd(i.id, "datum", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`ienia-${i.id}`}>Referens i ENIA</label>
            <Falt
              id={`ienia-${i.id}`}
              varde={i.enia}
              etikett="ENIA-referens"
              onCommit={(v) => onUppd(i.id, "enia", v)}
            />
          </div>
        </div>

        <div className="f">
          <label htmlFor={`ibesk-${i.id}`}>Beskrivning</label>
          <Falt
            id={`ibesk-${i.id}`}
            varde={i.beskrivning}
            etikett="Beskrivning av incidenten"
            flerrad
            onCommit={(v) => onUppd(i.id, "beskrivning", v)}
          />
        </div>

        <div className="cbrow">
          <input
            id={`irap-${i.id}`}
            type="checkbox"
            checked={!!i.rapporterad}
            onChange={(e) => onUppd(i.id, "rapporterad", e.target.checked)}
          />
          <label htmlFor={`irap-${i.id}`}>
            Rapport skickad till beställare och Arbetsmiljöverket
          </label>
        </div>

        {lage ? (
          <div className="atagrindar" style={{ padding: "6px 0 0" }}>
            <span className={`grind ${lage.varning ? "bad" : lage.ok ? "ok" : ""}`.trim()}>
              <span aria-hidden="true">⏱ </span>
              {lage.txt}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Rondpanel({ rond, projekt, onStang, onUppd, onPunkt, onAvvikelse, onNyAvvikelse, onSkrivUt }) {
  const checklista = rond.checklista || {};

  return (
    <Slideover
      titel={`Skyddsrond ${rond.datum}`}
      etikett={`Skyddsrond ${rond.datum}`}
      onStang={onStang}
      verktyg={
        <button type="button" className="btn sec mini" onClick={() => onSkrivUt(rond)}>
          Protokoll (A4)
        </button>
      }
    >
      <div className="frow c2">
        <div className="f">
          <label htmlFor={`rutf-${rond.id}`}>Utförd av</label>
          <Falt
            id={`rutf-${rond.id}`}
            varde={rond.utfordAv}
            etikett="Utförd av"
            onCommit={(v) => onUppd(rond.id, "utfordAv", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`renia-${rond.id}`}>Referens i ENIA</label>
          <Falt
            id={`renia-${rond.id}`}
            varde={rond.enia}
            etikett="ENIA-referens"
            placeholder="Diarienummer eller länk"
            onCommit={(v) => onUppd(rond.id, "enia", v)}
          />
        </div>
      </div>

      <div>
        <h4 className="mrub">Checklista — elkraft och BESS</h4>
        {RONDPUNKTER.map(([n, txt]) => {
          const id = `sr_${rond.id}_${n}`;
          const klar = !!checklista[n];
          return (
            <div className="chk" key={n}>
              <input
                id={id}
                type="checkbox"
                checked={klar}
                onChange={(e) => onPunkt(rond, n, e.target.checked)}
              />
              <label htmlFor={id}>{klar ? <s>{txt}</s> : txt}</label>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="mrub">Avvikelser</h4>
        <Tabellyta etikett={`Avvikelser i skyddsronden ${rond.datum}`}>
          <table>
            <thead>
              <tr>
                <th scope="col">Beskrivning</th>
                <th scope="col" style={{ width: 110 }}>
                  Allvarlighet
                </th>
                <th scope="col" style={{ width: 150 }}>
                  Ansvarig
                </th>
                <th scope="col" style={{ width: 130 }}>
                  Senast åtgärdat
                </th>
                <th scope="col" style={{ width: 120 }}>
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {(rond.avvikelser || []).length ? (
                rond.avvikelser.map((a) => (
                  <tr key={a.id}>
                    <td data-label="Beskrivning">
                      <Falt
                        varde={a.text}
                        etikett="Beskrivning av avvikelsen"
                        onCommit={(v) => onAvvikelse(a.id, "text", v)}
                      />
                    </td>
                    <td data-label="Allvarlighet">
                      <select
                        aria-label="Allvarlighet"
                        value={a.niva || "medium"}
                        onChange={(e) => onAvvikelse(a.id, "niva", e.target.value)}
                      >
                        {AVVIKELSENIVA.map(([v, n]) => (
                          <option key={v} value={v}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Ansvarig">
                      <Falt
                        varde={a.ansvarig}
                        etikett="Ansvarig för avvikelsen"
                        onCommit={(v) => onAvvikelse(a.id, "ansvarig", v)}
                      />
                    </td>
                    <td data-label="Senast åtgärdat">
                      <DatumFalt
                        varde={a.senast}
                        etikett="Senast åtgärdat"
                        onCommit={(v) => onAvvikelse(a.id, "senast", v)}
                      />
                    </td>
                    <td data-label="Status">
                      <select
                        aria-label="Status för avvikelsen"
                        value={a.status || "oppen"}
                        onChange={(e) => onAvvikelse(a.id, "status", e.target.value)}
                      >
                        <option value="oppen">Öppen</option>
                        <option value="atgardad">Åtgärdad</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Inga avvikelser noterade.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Tabellyta>
        <div className="rowbtns">
          <button type="button" className="btn sec" onClick={() => onNyAvvikelse(rond)}>
            + Avvikelse
          </button>
        </div>
      </div>

      <Note>
        Ronden ska dokumenteras i ENIA. Protokollet ovan är underlaget — ENIA är registret.{" "}
        {projekt?.namn}
      </Note>
    </Slideover>
  );
}

export function Hseq() {
  const { state, uppd, laggTill, dispatch } = usePortfolj();
  const { valtProjekt: pid, skrivUt, visaToast, postFokus } = useUi();
  const [oppenRond, setOppenRond] = useState(null);

  /* Översiktens snabbåtgärd skapar ronden och pekar ut den här. Justering
     under render, som i ÄTA och Dagbok, så att panelen är öppen direkt. */
  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "hseq" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setOppenRond(postFokus.id);
  }

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const dagar = dagarSedanRond(state, pid);
  const amp = ampAktuell(state, pid);
  const avv = oppnaRondavvikelser(state, pid);
  const inc = state.hseqIncidenter.filter((i) => i.projektId === pid);
  const incSen = inc.filter((i) => incidentLage(i)?.varning);

  const ronder = state.hseqRonder
    .filter((r) => r.projektId === pid)
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));

  const id06 = state.hseqId06
    .filter((x) => x.projektId === pid)
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
  const id06Brist = id06.filter((x) => !x.ok).length;

  const rond = ronder.find((x) => x.id === oppenRond) || null;

  /* ---------- Åtgärder ---------- */

  const nyRond = () => {
    const rond = nySkyddsrond(pid, { utfordAv: hamtaNamn() || "" });
    laggTill("hseqRonder", rond);
    setOppenRond(rond.id);
  };

  const uppdRond = (id, falt, varde) => uppd("hseqRonder", id, falt, varde);

  // Checklistan är nästlad — skrivs som ett helt objekt via generiska UPPDATERA.
  const uppdRondpunkt = (r, n, varde) =>
    uppd("hseqRonder", r.id, "checklista", { ...(r.checklista || {}), [n]: varde });

  const nyRondavvikelse = (r) =>
    uppd("hseqRonder", r.id, "avvikelser", [
      ...(r.avvikelser || []),
      { id: nyttId("av"), text: "", niva: "medium", ansvarig: "", senast: "", status: "oppen" },
    ]);

  const uppdAvvikelse = (avId, falt, varde) =>
    dispatch({ type: "UPPD_RONDAVVIKELSE", id: avId, falt, varde });

  const nyIncident = () =>
    laggTill("hseqIncidenter", {
      id: nyttId("inc"),
      projektId: pid,
      typ: "tillbud",
      datum: idag(),
      tid: "",
      beskrivning: "",
      rapporterad: false,
      rapportDatum: "",
      enia: "",
    });

  /* Rapportdatumet sätts av kryssrutan, inte för hand — det är det datum
     24-timmarsgrinden mäter mot. */
  const uppdIncident = (id, falt, varde) => {
    uppd("hseqIncidenter", id, falt, varde);
    if (falt === "rapporterad") uppd("hseqIncidenter", id, "rapportDatum", varde ? idag() : "");
  };

  const nyId06 = () =>
    laggTill("hseqId06", { id: nyttId("id"), projektId: pid, datum: idag(), notering: "", ok: true });

  const revideraAmp = () => {
    const ver = amp ? (Number(String(amp.version).replace(/[^\d.]/g, "")) || 1) + 1 : 1;
    laggTill("hseqAmp", { id: nyttId("amp"), projektId: pid, version: "rev " + ver, datum: idag() });
    visaToast(`Arbetsmiljöplanen är nu rev ${ver}`);
  };

  return (
    <>
      <Projektvaljare />

      <div className="grid g4">
        <Kpi
          label="Dagar sedan skyddsrond"
          varde={dagar === null ? "—" : dagar}
          hint={rondHint(dagar)}
          klass={rondKlass(dagar)}
        />
        <Kpi
          label="Arbetsmiljöplan"
          varde={amp ? amp.version : "saknas"}
          hint={amp ? "reviderad " + amp.datum : "upprätta AMP"}
          klass={amp ? "" : "bad"}
        />
        <Kpi
          label="Öppna rondavvikelser"
          varde={avv.length}
          hint={`${avv.filter((a) => a.niva === "akut").length} akuta`}
          klass={avv.length ? "warn" : ""}
        />
        <Kpi
          label="Incidenter utan rapport"
          varde={incSen.length}
          hint="24-timmarskravet"
          klass={incSen.length ? "bad" : ""}
        />
      </div>

      {dagar !== null && dagar >= 14 ? (
        <Note niva="bad">
          <b>Skyddsronden är försenad — {dagar} dagar sedan senaste.</b> Kravet är minst varannan vecka
          och ronden ska dokumenteras i ENIA. Brott mot arbetsmiljöplanen är vitesgrundande (
          {fmtSEK(HSEQ_VITE)} per tillfälle enligt kontraktet).
        </Note>
      ) : null}

      {id06Brist ? (
        <Note>
          <b>
            {id06Brist} ID06-stickprov med anmärkning.
          </b>{" "}
          Saknad personalliggare eller ID06 riskerar vite {fmtSEK(HSEQ_VITE)} per tillfälle.
        </Note>
      ) : null}

      <div className="grid g2" style={{ marginTop: 16 }}>
        <Card>
          <h3>Skyddsronder</h3>
          <div className="lead">BAS-U ansvarar för samordningen. Ronden dokumenteras i ENIA.</div>
          <Tabellyta etikett="Skyddsronder">
            <table>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 110 }}>
                    Datum
                  </th>
                  <th scope="col">Utförd av</th>
                  <th scope="col" className="num" style={{ width: 90 }}>
                    Punkter
                  </th>
                  <th scope="col" className="num" style={{ width: 80 }}>
                    Avvik.
                  </th>
                  <th scope="col" style={{ width: 80 }} />
                </tr>
              </thead>
              <tbody>
                {ronder.length ? (
                  ronder.map((x) => {
                    const klara = RONDPUNKTER.filter(([n]) => x.checklista && x.checklista[n]).length;
                    return (
                      <tr key={x.id}>
                        <td data-label="Datum">{x.datum}</td>
                        <td data-label="Utförd av">{x.utfordAv || "—"}</td>
                        <td data-label="Punkter" className="num">
                          {klara}/{RONDPUNKTER.length}
                        </td>
                        <td data-label="Avvikelser" className="num">
                          {(x.avvikelser || []).length}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn sec mini"
                            aria-expanded={oppenRond === x.id}
                            onClick={() => setOppenRond(oppenRond === x.id ? null : x.id)}
                          >
                            Öppna
                            <span className="sr-only"> skyddsronden {x.datum}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>Ingen rond registrerad.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Tabellyta>
          <div className="rowbtns">
            <button type="button" className="btn" onClick={nyRond}>
              + Ny skyddsrond
            </button>
          </div>
        </Card>

        <Card>
          <h3>Arbetsmiljöplan och ID06</h3>
          <div className="lead">
            AMP är ett levande dokument. ID06 och personalliggare kontrolleras med stickprov.
          </div>
          <div className="f">
            <span className="faltrubrik">Aktuell AMP</span>
            <div style={{ fontSize: 13 }}>
              {amp ? `${amp.version} — reviderad ${amp.datum}` : <b>Ingen AMP registrerad.</b>}
            </div>
          </div>
          <div className="rowbtns" style={{ marginTop: 8 }}>
            <button type="button" className="btn sec" onClick={revideraAmp}>
              Markera AMP som reviderad
            </button>
          </div>

          <h4 className="mrub" style={{ marginTop: 18 }}>
            ID06-stickprov
          </h4>
          <Tabellyta etikett="ID06-stickprov">
            <table>
              <thead>
                <tr>
                  <th scope="col" style={{ width: 110 }}>
                    Datum
                  </th>
                  <th scope="col">Notering</th>
                  <th scope="col" style={{ width: 110 }}>
                    Utfall
                  </th>
                </tr>
              </thead>
              <tbody>
                {id06.length ? (
                  id06.slice(0, 6).map((x) => (
                    <tr key={x.id}>
                      <td data-label="Datum">{x.datum}</td>
                      <td data-label="Notering">
                        <Falt
                          varde={x.notering}
                          etikett={`Notering för stickprov ${x.datum}`}
                          onCommit={(v) => uppd("hseqId06", x.id, "notering", v)}
                        />
                      </td>
                      <td data-label="Utfall">
                        <select
                          aria-label={`Utfall för stickprov ${x.datum}`}
                          value={x.ok ? "ja" : "nej"}
                          onChange={(e) => uppd("hseqId06", x.id, "ok", e.target.value === "ja")}
                        >
                          <option value="ja">Utan anmärkning</option>
                          <option value="nej">Anmärkning</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>Inga stickprov loggade.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Tabellyta>
          <div className="rowbtns">
            <button type="button" className="btn sec" onClick={nyId06}>
              + Logga stickprov
            </button>
          </div>
        </Card>
      </div>

      <Card klass="mt-4">
        <h3>Incidenter och tillbud</h3>
        <div className="lead">
          Rapport till beställare och Arbetsmiljöverket inom 24 timmar. Registrera även i ENIA.
        </div>
        {inc.length ? (
          inc.map((i) => <Incident key={i.id} i={i} onUppd={uppdIncident} />)
        ) : (
          <p className="lead">Inga incidenter registrerade.</p>
        )}
        <div className="rowbtns">
          <button type="button" className="btn" onClick={nyIncident}>
            + Registrera incident
          </button>
        </div>
      </Card>

      {rond ? (
        <Rondpanel
          rond={rond}
          projekt={p}
          onStang={() => setOppenRond(null)}
          onUppd={uppdRond}
          onPunkt={uppdRondpunkt}
          onAvvikelse={uppdAvvikelse}
          onNyAvvikelse={nyRondavvikelse}
          onSkrivUt={(r) => skrivUt(<Skyddsrondsprotokoll rond={r} projekt={p} />)}
        />
      ) : null}
    </>
  );
}
