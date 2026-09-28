import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Callout, Card, CheckList, DataList, Overline, StatTile, StatusBadge, TableRegion } from "../components/ds/index.js";
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

   Ronden öppnas i en slide-over så att listan över ronder ligger kvar.
   Allt står på designsystemet: grindarna som StatTile, ronder, AMP/ID06 och
   incidenter som kort, rondens checklista som CheckList. */

const nyttId = (prefix) => prefix + Date.now();

function Incident({ i, onUppd }) {
  const lage = incidentLage(i);

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg border border-solid border-hairline bg-sunken p-3 md:p-4 ${
        lage?.varning ? "border-l-[3px] border-l-rod" : ""
      }`}
    >
      <div>
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

        <div className="f mb-0">
          <label htmlFor={`ibesk-${i.id}`}>Beskrivning</label>
          <Falt
            id={`ibesk-${i.id}`}
            varde={i.beskrivning}
            etikett="Beskrivning av incidenten"
            flerrad
            onCommit={(v) => onUppd(i.id, "beskrivning", v)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="cbrow p-0">
          <input
            id={`irap-${i.id}`}
            type="checkbox"
            checked={!!i.rapporterad}
            onChange={(e) => onUppd(i.id, "rapporterad", e.target.checked)}
          />
          <label htmlFor={`irap-${i.id}`}>Rapport skickad till beställare och Arbetsmiljöverket</label>
        </div>
        {lage ? <StatusBadge ton={lage.varning ? "bad" : lage.ok ? "ok" : "neutral"} label={lage.txt} wrap /> : null}
      </div>
    </li>
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

      <div className="flex flex-col gap-2">
        <Overline>Checklista — elkraft och BESS</Overline>
        <CheckList
          label="Checklista — elkraft och BESS"
          items={RONDPUNKTER.map(([n, txt]) => ({ id: n, label: txt, checked: !!checklista[n] }))}
          onChange={(n, varde) => onPunkt(rond, n, varde)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Overline>Avvikelser</Overline>
        <TableRegion label={`Avvikelser i skyddsronden ${rond.datum}`}>
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
        </TableRegion>
        <div>
          <button type="button" className="btn sec" onClick={() => onNyAvvikelse(rond)}>
            + Avvikelse
          </button>
        </div>
      </div>

      <Callout className="mt-4">
        Ronden ska dokumenteras i ENIA. Protokollet ovan är underlaget — ENIA är registret.{" "}
        {projekt?.namn}
      </Callout>
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

  const akuta = avv.filter((a) => a.niva === "akut").length;

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Dagar sedan skyddsrond"
            value={dagar === null ? "—" : dagar}
            hint={rondHint(dagar)}
            ton={rondKlass(dagar)}
          />
          <StatTile
            label="Arbetsmiljöplan"
            value={amp ? amp.version : "saknas"}
            hint={amp ? "reviderad " + amp.datum : "upprätta AMP"}
            ton={amp ? "" : "bad"}
          />
          <StatTile
            label="Öppna rondavvikelser"
            value={avv.length}
            hint={`${akuta} akuta`}
            ton={avv.length ? "warn" : ""}
          />
          <StatTile
            label="Incidenter utan rapport"
            value={incSen.length}
            hint="24-timmarskravet"
            ton={incSen.length ? "bad" : ""}
          />
        </div>

        {dagar !== null && dagar >= 14 ? (
          <Callout ton="bad">
            <b>Skyddsronden är försenad — {dagar} dagar sedan senaste.</b> Kravet är minst varannan vecka
            och ronden ska dokumenteras i ENIA. Brott mot arbetsmiljöplanen är vitesgrundande (
            {fmtSEK(HSEQ_VITE)} per tillfälle enligt kontraktet).
          </Callout>
        ) : null}

        {id06Brist ? (
          <Callout ton="warn">
            <b>{id06Brist} ID06-stickprov med anmärkning.</b> Saknad personalliggare eller ID06 riskerar vite{" "}
            {fmtSEK(HSEQ_VITE)} per tillfälle.
          </Callout>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card
            id="hseq-ronder"
            title={`Skyddsronder — ${(p.nr ? p.nr + " " : "") + p.namn}`}
            subtitle="BAS-U ansvarar för samordningen. Ronden dokumenteras i ENIA."
            action={
              <button type="button" className="btn mini" onClick={nyRond}>
                + Ny skyddsrond
              </button>
            }
          >
            <TableRegion label="Skyddsronder">
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
            </TableRegion>
          </Card>

          <Card
            id="hseq-amp"
            title="Arbetsmiljöplan och ID06"
            subtitle="AMP är ett levande dokument. ID06 och personalliggare kontrolleras med stickprov."
            badge={amp ? <StatusBadge ton="ok" label={amp.version} /> : <StatusBadge ton="bad" label="AMP saknas" />}
          >
            <DataList
              items={[
                {
                  label: "Aktuell AMP",
                  value: amp ? amp.version : "Ingen AMP registrerad",
                  detail: amp ? `reviderad ${amp.datum}` : "upprätta arbetsmiljöplanen innan arbetet startar",
                },
              ]}
            />
            <div>
              <button type="button" className="btn sec" onClick={revideraAmp}>
                Markera AMP som reviderad
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <Overline>ID06-stickprov</Overline>
              <TableRegion label="ID06-stickprov">
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
              </TableRegion>
              <div>
                <button type="button" className="btn sec" onClick={nyId06}>
                  + Logga stickprov
                </button>
              </div>
            </div>
          </Card>
        </div>

        <Card
          id="hseq-incidenter"
          title="Incidenter och tillbud"
          subtitle="Rapport till beställare och Arbetsmiljöverket inom 24 timmar. Registrera även i ENIA."
          badge={incSen.length ? <StatusBadge ton="bad" label={`${incSen.length} utan rapport`} /> : null}
          action={
            <button type="button" className="btn mini" onClick={nyIncident}>
              + Registrera incident
            </button>
          }
        >
          {inc.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {inc.map((i) => (
                <Incident key={i.id} i={i} onUppd={uppdIncident} />
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">Inga incidenter registrerade.</p>
          )}
        </Card>
      </div>

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
