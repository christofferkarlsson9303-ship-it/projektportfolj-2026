import logotyp from "../../assets/one-nordic-logo.png";
import { trafikljus } from "../../lib/metodkoll.js";
import { Trafikljus } from "../projekt/Trafikljus.jsx";
import { ataSummering, slutdokIndex } from "../../lib/berakningar.js";
import { berakFlaggor } from "../../lib/flaggor.js";
import { dagarTill, idag } from "../../lib/datum.js";
import { fmtProcent, fmtSEK } from "../../lib/format.js";
import { bestallarrapportData, statusrad } from "../../lib/bestallarrapport.js";
import { Kraftkurva } from "../oversikt/Hero.jsx";
import { hamtaNamn } from "../../state/portfolj-reducer.js";

/* Statusrapport till beställaren — ett A4-underlag som går att ta med till
   byggmötet eller bifoga i mejl.

   Rapporten säger medvetet också det som är obekvämt: försenade milstolpar,
   öppna ÄTA och punkter som passerat sitt datum. En statusrapport som bara
   visar det som går bra är inte värd att skicka, och beställaren ser ändå
   verkligheten på plats.

   Med ett valt projekt kommer också fasstatus (bara påbörjade och klara faser,
   samma regel som projektstartens PDF), betalmilstolparna M1–M7 med fas,
   prognos mot kontraktet och anläggningsdata. Datan räknas i
   lib/bestallarrapport.js. */

const fasNamn = (f) => `Fas ${f.fas} · ${f.fasKort}`;

function Huvud({ projekt }) {
  const av = (hamtaNamn() || "").trim();
  return (
    <div className="raphead med-logo">
      <Kraftkurva className="rap-kurva" />
      <img src={logotyp} alt="" className="logo rap-text" />
      <div className="rap-text">
        <h1>Statusrapport</h1>
        <div className="s">
          {projekt ? `${projekt.nr ? projekt.nr + " " : ""}${projekt.namn}` : "Portföljen"} · Upprättad {idag()}
          {av ? ` av ${av}` : ""} · ONE Nordic AB
        </div>
      </div>
    </div>
  );
}

/** Trafikljusen till beställaren: tid, planerat arbete och milstolpar.
 *  Budgeten är intern och tas inte med. */
function Lage({ state, pid }) {
  return (
    <div className="rap-sektion">
      <div className="delrubrik">Läge enligt trafikljusmetoden</div>
      <Trafikljus ljus={trafikljus(state, pid)} delar={["tid", "arbete", "milstolpar"]} rubrik="Läge enligt trafikljusmetoden" />
      <p className="note">Grön: enligt plan. Gul: avvikelse som hanteras i projektet. Röd: allvarlig avvikelse som kräver beslut.</p>
    </div>
  );
}

function Faser({ d }) {
  return (
    <div className="rap-sektion">
      <div className="delrubrik">Projektets faser</div>
      <table>
        <thead>
          <tr>
            <th>Fas</th>
            <th>Namn</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {d.faser.map((f) => (
            <tr key={f.nr}>
              <td>
                {f.nr} av {d.antalFaser}
              </td>
              <td>{f.titel}</td>
              <td className={f.status === "klar" ? "fas-klar" : "fas-pagar"}>{f.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.aterstar.length ? (
        <p className="rap-not">
          Återstår: fas {d.aterstar[0]}
          {d.aterstar.length > 1 ? `–${d.aterstar.at(-1)}` : ""}. De tas med i rapporten när de påbörjas.
        </p>
      ) : null}
    </div>
  );
}

function Betalningar({ d }) {
  return (
    <div className="rap-sektion">
      <div className="delrubrik">Betalningsmilstolpar M1–M7</div>
      <table>
        <thead>
          <tr>
            <th>Milstolpe</th>
            <th>Fas</th>
            <th>Andel</th>
            <th>Plan / grind</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {d.milstolpar.map((m) => (
            <tr key={m.kod}>
              <td>
                {m.kod} · {m.namn}
              </td>
              <td>{fasNamn(m)}</td>
              <td>{m.andel} %</td>
              <td>{m.datum || "—"}</td>
              <td className={m.status === "fakturerad" ? "fas-klar" : m.status === "pagaende" ? "fas-pagar" : ""}>{m.text}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Prognos({ tid }) {
  if (!tid) {
    return (
      <div className="box">
        <b>Prognos saknas</b>
        Projektets startdatum eller färdigdatum saknas, så slutbesiktningen kan inte beräknas.
      </div>
    );
  }
  const sen = tid.forsening > 0;
  const mot = tid.forsening === null ? "—" : sen ? `${tid.forsening} dagar sent` : tid.forsening < 0 ? `${-tid.forsening} dagar före` : "I tid";
  return (
    <table className="rap-sektion">
      <tbody>
        <tr>
          <th>Beräknad slutbesiktning</th>
          <td className={sen ? "sen" : ""}>
            {tid.slutPrognos || "—"} · {mot}
          </td>
        </tr>
        <tr>
          <th>Kontraktets färdigdatum</th>
          <td>{tid.kontrakt || "—"}</td>
        </tr>
        <tr>
          <th>Styr slutdatumet</th>
          <td>{tid.styr.length ? tid.styr.map((m) => `${m.kort} (fas ${m.fas})`).join(", ") : "Inga återstående moment"}</td>
        </tr>
      </tbody>
    </table>
  );
}

function Anlaggning({ a }) {
  const effekt = a.mw ? `${a.mw} MW / ${a.mwh ?? "—"} MWh` : "Ej angiven";
  const site = a.siteMwh ? `${a.siteMw || "—"} MW / ${a.siteMwh} MWh enligt siten` : "";
  return (
    <div className="rap-sektion">
      <div className="delrubrik">Anläggning</div>
      <table>
        <tbody>
          <tr>
            <th>Effekt / energi</th>
            <td>
              {effekt}
              {site ? ` (${site})` : ""}
            </td>
          </tr>
          <tr>
            <th>MV-skid</th>
            <td>{statusrad(a.skid, "MV-skid")}</td>
          </tr>
          <tr>
            <th>Battericontainrar</th>
            <td>{statusrad(a.container, "containrar")}</td>
          </tr>
          <tr>
            <th>Nätanslutning</th>
            <td>
              {a.natagare || "Nätägare ej angiven"}
              {a.natkontakt ? ` · ${a.natkontakt}` : ""}
              {a.natmoment.map((m) => ` · ${m.kort}: ${m.text.toLowerCase()}${m.slut ? `, ${m.status === "klar" ? "klar" : "plan klar"} ${m.slut}` : ""}`).join("")}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Nyckeltal({ etiketter }) {
  return (
    <div className="rapgrid5">
      {etiketter.map(([namn, varde]) => (
        <div className="c" key={namn}>
          <b>{namn}</b>
          <div>{varde}</div>
        </div>
      ))}
    </div>
  );
}

export function Bestallarrapport({ state, pid }) {
  const projekt = state.projekt.find((p) => p.id === pid) || null;
  const horTill = (r) => !pid || r.projektId === pid;

  const milstolpar = state.milstolpar.filter(horTill);
  const forsenade = milstolpar.filter(
    (m) => m.datum && m.status !== "klar" && dagarTill(m.datum) < 0
  );
  const kommande = milstolpar
    .filter((m) => m.datum && m.status !== "klar" && dagarTill(m.datum) >= 0)
    .sort((a, b) => a.datum.localeCompare(b.datum))
    .slice(0, 6);

  const ata = pid ? ataSummering(state, pid) : null;
  const oppnaPunkter = state.punkter.filter((p) => horTill(p) && p.status === "oppen");
  const forfallna = oppnaPunkter.filter((p) => p.forfaller && dagarTill(p.forfaller) < 0);
  const risker = state.risker.filter((r) => horTill(r) && r.status !== "stangd");
  const slutdok = pid ? slutdokIndex(state, pid) : null;
  const hoga = berakFlaggor(state).filter((f) => f.niva === "hog" && (!pid || f.projektId === pid));
  const d = pid ? bestallarrapportData(state, pid) : null;

  return (
    <>
      <Huvud projekt={projekt} />

      <Nyckeltal
        etiketter={[
          ["Milstolpar kvar", String(milstolpar.filter((m) => m.status !== "klar").length)],
          ["Varav försenade", String(forsenade.length)],
          ["Öppna punkter", String(oppnaPunkter.length)],
          ["Öppna risker", String(risker.length)],
          ["Slutdokumentation", slutdok ? fmtProcent(slutdok.proc) : "—"],
        ]}
      />

      {pid ? <Lage state={state} pid={pid} /> : null}
      {d ? <Faser d={d} /> : null}
      {d ? <Anlaggning a={d.anlaggning} /> : null}

      {ata ? (
        <>
          <div className="delrubrik">Ekonomi och ÄTA</div>
          <table>
            <tbody>
              <tr>
                <th>Kontraktsvärde</th>
                <td>{fmtSEK(projekt?.kontraktsvarde)}</td>
                <th>Godkänd ÄTA</th>
                <td>{fmtSEK(ata.godkant)}</td>
              </tr>
              <tr>
                <th>Antal ÄTA</th>
                <td>
                  {ata.antal} varav {ata.oppna} öppna
                </td>
                <th>Godkänt men ej fakturerat</th>
                <td>{fmtSEK(ata.ejFakt)}</td>
              </tr>
            </tbody>
          </table>
        </>
      ) : null}

      {d ? <Betalningar d={d} /> : null}

      <div className="delrubrik">Tidplan</div>
      {d ? <Prognos tid={d.tid} /> : null}
      {forsenade.length ? (
        <table>
          <thead>
            <tr>
              <th>Försenad milstolpe</th>
              <th>Planerat datum</th>
              <th>Dagar över</th>
            </tr>
          </thead>
          <tbody>
            {forsenade.map((m) => (
              <tr key={m.id}>
                <td>{m.titel}</td>
                <td>{m.datum}</td>
                <td>{Math.abs(dagarTill(m.datum))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="box">
          <b>Inga försenade milstolpar</b>
          Samtliga milstolpar med passerat datum är klarmarkerade.
        </div>
      )}

      {kommande.length ? (
        <table>
          <thead>
            <tr>
              <th>Närmast kommande</th>
              <th>Datum</th>
              <th>Dagar kvar</th>
            </tr>
          </thead>
          <tbody>
            {kommande.map((m) => (
              <tr key={m.id}>
                <td>{m.titel}</td>
                <td>{m.datum}</td>
                <td>{dagarTill(m.datum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {forfallna.length ? (
        <>
          <div className="delrubrik">Punkter som passerat sitt datum</div>
          <table>
            <thead>
              <tr>
                <th>Punkt</th>
                <th>Skulle varit klar</th>
                <th>Ansvarig</th>
              </tr>
            </thead>
            <tbody>
              {forfallna.map((p) => (
                <tr key={p.id}>
                  <td>{p.titel}</td>
                  <td>{p.forfaller}</td>
                  <td>{p.ansvarig || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {hoga.length ? (
        <>
          <div className="delrubrik">Kräver beslut eller åtgärd</div>
          <table>
            <tbody>
              {hoga.slice(0, 12).map((f, i) => (
                <tr key={i}>
                  <td>{f.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      <div className="fot">
        Rapporten är genererad ur projektportföljen {idag()} och speglar läget vid utskriftstillfället.
        Belopp avseende ÄTA är de som registrerats i ÄTA-loggen och ersätter inte formell avräkning.
      </div>
    </>
  );
}
