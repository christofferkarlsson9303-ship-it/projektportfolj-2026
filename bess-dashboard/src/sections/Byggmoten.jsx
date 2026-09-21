import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Note, SelStatus } from "../components/ui/Primitiver.jsx";
import { Falt, DatumFalt } from "../components/ui/Falt.jsx";
import { MOTESSTATUS, PARAGRAFER, PUNKTROLL } from "../data/konstanter.js";
import { idag } from "../lib/datum.js";
import { motesFlagga, projekt } from "../lib/berakningar.js";

/* Byggmöten.

   Protokollet förs i en fast paragrafstruktur (§1–§7). Poängen med modulen är
   inte att skriva protokoll snyggt, utan att fånga det som annars faller bort:
   ÄTA och hinder som behandlas muntligt under §4 och §5 men aldrig registreras
   formellt kan preskriberas enligt ABT 06 kap. 2 § 7. Därför flaggas varje
   sådan punkt tills den har ett kopplat ärende. */

const statusNamn = (v) => (MOTESSTATUS.find(([k]) => k === v) || [undefined, "—"])[1];

/* ---------- A4-protokoll ---------- */

function Protokoll({ m, p, ur }) {
  const atgarder = (m.punkter || []).filter((pt) => pt.status === "oppen");
  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;

  return (
    <>
      <div className="raphead">
        <h1>Byggmötesprotokoll {m.nr}</h1>
        <div className="s">
          {projektNamn} · {p.ort || ""} · {m.datum || ""} · ONE Nordic AB · one-nordic.se
        </div>
      </div>

      <table>
        <tbody>
          <tr>
            <th>Projekt</th>
            <td>{projektNamn}</td>
            <th>Möte</th>
            <td>{m.nr}</td>
          </tr>
          <tr>
            <th>Datum</th>
            <td>{m.datum || "—"}</td>
            <th>Plats/kanal</th>
            <td>{m.plats || "—"}</td>
          </tr>
          <tr>
            <th>Nästa möte</th>
            <td colSpan={3}>{m.nasta || "—"}</td>
          </tr>
          <tr>
            <th>Närvarande</th>
            <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
              {m.deltagare || "—"}
            </td>
          </tr>
        </tbody>
      </table>

      {PARAGRAFER.map(([nr, rubrik]) => {
        const punkter = (m.punkter || []).filter((pt) => pt.para === nr);
        return (
          <div key={nr}>
            <h2>
              §{nr} {rubrik}
            </h2>
            {punkter.length ? (
              <table>
                <tbody>
                  <tr>
                    <th style={{ width: "auto" }}>Punkt</th>
                    <th style={{ width: 90 }}>Ansvarig</th>
                    <th style={{ width: 80 }}>Status</th>
                    <th style={{ width: 80 }}>Ärende</th>
                  </tr>
                  {punkter.map((pt) => {
                    const a = pt.urId ? ur.find((u) => u.id === pt.urId) : null;
                    return (
                      <tr key={pt.id}>
                        <td>{pt.text || ""}</td>
                        <td>{pt.ansvarig || ""}</td>
                        <td>{pt.status === "oppen" ? "Öppen" : "Avslutad"}</td>
                        <td>{a ? a.nr : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="box">Inget att notera.</div>
            )}
          </div>
        );
      })}

      <h2>Åtgärdslista — öppna punkter</h2>
      <table>
        <tbody>
          <tr>
            <th style={{ width: 36 }}>#</th>
            <th style={{ width: "auto" }}>Åtgärd</th>
            <th style={{ width: 90 }}>Ansvarig</th>
            <th style={{ width: 60 }}>§</th>
          </tr>
          {atgarder.length ? (
            atgarder.map((pt, i) => (
              <tr key={pt.id}>
                <td>{i + 1}</td>
                <td>{pt.text || ""}</td>
                <td>{pt.ansvarig || ""}</td>
                <td>§{pt.para}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>Inga öppna punkter.</td>
            </tr>
          )}
        </tbody>
      </table>

      <h2>Justering</h2>
      <table>
        <tbody>
          <tr>
            <th style={{ width: 130 }}>För entreprenören</th>
            <td style={{ height: 44 }} />
            <th style={{ width: 130 }}>För beställaren</th>
            <td />
          </tr>
          <tr>
            <th>Namnförtydligande</th>
            <td style={{ height: 30 }} />
            <th>Namnförtydligande</th>
            <td />
          </tr>
        </tbody>
      </table>

      <div className="fot">
        Protokollet justeras av båda parter. Hinder och ÄTA som behandlats ska vara protokollförda —
        annars kan rätten till ersättning och tidsförlängning gå förlorad.
        <br />
        {m.nr} · utskrivet {idag()} · ONE Nordic AB · one-nordic.se
      </div>
    </>
  );
}

/* ---------- En punkt i protokollet ---------- */

function Motespunkt({ m, pt }) {
  const { state, dispatch, laggTill } = usePortfolj();
  const { visaToast, oppnaPost } = useUi();

  const kravAtaKoppling = pt.para === "4" || pt.para === "5";
  const saknar = kravAtaKoppling && !pt.urId && pt.text;
  const arende = pt.urId ? state.ur.find((u) => u.id === pt.urId) : null;

  const satt = (falt, varde) =>
    dispatch({ type: "UPPD_MOTESPUNKT", moteId: m.id, ptId: pt.id, falt, varde });

  /* Skapar ärendet ur punkten och kopplar ihop dem. Händelsedatum blir mötets
     datum — det är då omständigheten blev känd, och det startar 24-timmarsfristen. */
  const skapaArende = () => {
    if (!pt.text) {
      visaToast("Skriv punktens text först.", "warn");
      return;
    }
    const antal = state.ur.filter((u) => u.projektId === m.projektId).length + 1;
    const id = "u" + Date.now();
    laggTill("ur", {
      id,
      projektId: m.projektId,
      nr: "UR" + String(antal).padStart(3, "0"),
      benamning: pt.text,
      status: "oppen",
      klass: pt.para === "5" ? "hinder" : "ata",
      handelseDatum: m.datum || idag(),
      underrattelseDatum: "",
      prisgrund: "lopande",
      belopp: null,
      godkantDatum: "",
      fakturaDatum: "",
      arbeteStartat: false,
      orsak: "",
      kalla: `Byggmöte ${m.nr} §${pt.para}`,
    });
    satt("urId", id);
    visaToast(`Ärende skapat ur ${m.nr} §${pt.para}`);
  };

  return (
    <div className={`punkt${saknar ? " saknar" : ""}`}>
      <div className="punkttext">
        <Falt
          flerrad
          rows={2}
          varde={pt.text || ""}
          placeholder="Vad togs upp, vad beslutades"
          etikett={`Punkt under §${pt.para}`}
          onCommit={(v) => satt("text", v)}
        />
        {pt.arv ? <span className="klasstag">Innestående punkt</span> : null}
      </div>

      <div className="punktmeta">
        <select
          value={pt.ansvarig || "PL"}
          onChange={(e) => satt("ansvarig", e.target.value)}
          aria-label="Ansvarig roll"
        >
          {PUNKTROLL.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={pt.status || "oppen"}
          onChange={(e) => satt("status", e.target.value)}
          aria-label="Punktens status"
        >
          <option value="oppen">Öppen</option>
          <option value="avslutad">Avslutad</option>
        </select>

        {arende ? (
          <button
            type="button"
            className="klasstag k-ata"
            style={{ border: 0, cursor: "pointer" }}
            onClick={() => oppnaPost("ata", arende.id)}
          >
            {arende.nr}
            <span className="sr-only"> — öppna ärendet</span>
          </button>
        ) : kravAtaKoppling ? (
          <>
            <button type="button" className="btn sec mini" onClick={skapaArende}>
              + Skapa ÄTA/hinder
            </button>
            <select
              value=""
              onChange={(e) => e.target.value && satt("urId", e.target.value)}
              aria-label="Koppla till befintligt ärende"
            >
              <option value="">Koppla befintlig…</option>
              {state.ur
                .filter((u) => u.projektId === m.projektId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nr}
                  </option>
                ))}
            </select>
          </>
        ) : null}

        <button
          type="button"
          className="btn sec mini"
          onClick={() => dispatch({ type: "TA_BORT_MOTESPUNKT", moteId: m.id, ptId: pt.id })}
          aria-label={`Ta bort punkten under §${pt.para}`}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {saknar ? (
        <div className="punktvarning">
          Diskuterat på byggmöte men saknar formell registrering och underrättelse — risk för preskription
          (ABT 06 kap. 2 § 7).
        </div>
      ) : null}
    </div>
  );
}

/* ---------- Protokollformuläret ---------- */

function Moteformular({ m, p }) {
  const { state, dispatch } = usePortfolj();
  const { skrivUt } = useUi();

  const fl = motesFlagga(m);
  const satt = (falt, varde) => dispatch({ type: "UPPD_MOTE", id: m.id, falt, varde });

  return (
    <section className="card" role="region" aria-label={`Protokoll ${m.nr}`} style={{ marginTop: 16 }}>
      <div className="mhead">
        <h3>{m.nr}</h3>
        <div className="mhead-h">
          <SelStatus
            alternativ={MOTESSTATUS}
            varde={m.status}
            etikett={`Status för ${m.nr}`}
            onChange={(v) => satt("status", v)}
            style={{ width: "auto" }}
          />
          <button
            type="button"
            className="btn sec mini"
            onClick={() => skrivUt(<Protokoll m={m} p={p} ur={state.ur} />)}
          >
            Generera protokoll (A4)
          </button>
        </div>
      </div>

      <div className="frow c3" style={{ marginTop: 14 }}>
        <div className="f">
          <label htmlFor={`datum-${m.id}`}>Datum</label>
          <DatumFalt
            id={`datum-${m.id}`}
            varde={m.datum}
            etikett="Mötesdatum"
            onCommit={(v) => satt("datum", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`plats-${m.id}`}>Plats eller kanal</label>
          <Falt
            id={`plats-${m.id}`}
            varde={m.plats || ""}
            placeholder="Ex. Site Växjö / Teams"
            etikett="Plats eller kanal"
            onCommit={(v) => satt("plats", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`nasta-${m.id}`}>Nästa möte</label>
          <DatumFalt
            id={`nasta-${m.id}`}
            varde={m.nasta}
            etikett="Datum för nästa möte"
            onCommit={(v) => satt("nasta", v)}
          />
        </div>
      </div>

      <div className="f">
        <label htmlFor={`delt-${m.id}`}>Närvarande</label>
        <Falt
          id={`delt-${m.id}`}
          flerrad
          varde={m.deltagare || ""}
          placeholder="Namn och roll, en per rad"
          etikett="Närvarande"
          onCommit={(v) => satt("deltagare", v)}
        />
      </div>

      {fl.length ? (
        <Note niva="bad">
          <b>
            {fl.length} punkt{fl.length > 1 ? "er" : ""} under §4/§5 saknar registrerat ärende.
          </b>{" "}
          ÄTA och hinder som bara behandlas muntligt riskerar preskription enligt ABT 06 kap. 2 § 7 — skapa
          ärendet och skicka underrättelse.
        </Note>
      ) : null}

      {PARAGRAFER.map(([nr, rubrik]) => {
        const punkter = (m.punkter || []).filter((pt) => pt.para === nr);
        return (
          <div className="para" key={nr}>
            <div className="parahead">
              <b>§{nr}</b> {rubrik}
              <button
                type="button"
                className="btn sec mini"
                onClick={() =>
                  dispatch({
                    type: "NY_MOTESPUNKT",
                    moteId: m.id,
                    punkt: {
                      id: "pt" + Date.now(),
                      para: nr,
                      text: "",
                      ansvarig: "PL",
                      status: "oppen",
                      urId: "",
                    },
                  })
                }
              >
                + Punkt
                <span className="sr-only"> under §{nr}</span>
              </button>
            </div>
            {punkter.length ? (
              punkter.map((pt) => <Motespunkt key={pt.id} m={m} pt={pt} />)
            ) : (
              <div className="lead" style={{ padding: "4px 0 8px" }}>
                Inga punkter.
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ---------- Sektionen ---------- */

export function Byggmoten() {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt: pid, postFokus } = useUi();
  const [oppet, setOppet] = useState(null);

  const p = projekt(state, pid);

  const moten = useMemo(
    () =>
      (state.byggmoten || [])
        .filter((m) => m.projektId === pid)
        .sort((a, b) => String(b.datum).localeCompare(String(a.datum))),
    [state.byggmoten, pid]
  );

  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "moten" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setOppet(postFokus.id);
  }

  // Utan aktivt val visas senaste mötet — det är nästan alltid det man vill se.
  const m = moten.find((x) => x.id === oppet) || moten[0] || null;

  if (!p) return null;

  /* Nytt möte ärver öppna punkter från föregående — det är så en åtgärdslista
     faktiskt förs vidare mellan möten i stället för att skrivas om för hand. */
  const nyttMote = () => {
    const nr = "BM-" + String(moten.length + 1).padStart(2, "0");
    const id = "bm" + Date.now();
    const tidigare = moten[0];
    const arv = (tidigare ? (tidigare.punkter || []).filter((pt) => pt.status === "oppen") : []).map(
      (pt) => ({
        ...pt,
        id: "pt" + Date.now() + Math.random().toString(36).slice(2, 6),
        arv: true,
      })
    );
    laggTill("byggmoten", {
      id,
      projektId: pid,
      nr,
      datum: idag(),
      plats: "",
      nasta: "",
      deltagare: "",
      status: "utkast",
      punkter: arv,
    });
    setOppet(id);
  };

  return (
    <>
      <Projektvaljare />

      <div className="card">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Byggmöten — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Protokollet förs i standardiserad paragrafstruktur. Punkter under §4 och §5 som saknar
              registrerat ärende flaggas — muntligt behandlade ÄTA och hinder riskerar annars att
              preskriberas enligt ABT 06 kap. 2 § 7.
            </div>
          </div>
          <div className="kortverktyg">
            <Tathetsvaljare />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <DataTable
            etikett="Byggmöten"
            exportNamn="Byggmoten"
            rader={moten}
            tomText="Inga byggmöten registrerade."
            radKlass={(x) => (motesFlagga(x).length ? "rad-sen" : "")}
            verktyg={
              <button type="button" className="btn mini" onClick={nyttMote}>
                + Nytt byggmöte
              </button>
            }
            kolumner={[
              {
                nyckel: "nr",
                rubrik: "Möte",
                bredd: 130,
                render: (x) => (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 font-bold text-one-bla underline decoration-dotted"
                    onClick={() => setOppet(x.id)}
                    aria-current={m && x.id === m.id ? "true" : undefined}
                  >
                    {x.nr}
                    <span className="sr-only"> — öppna protokollet</span>
                  </button>
                ),
              },
              { nyckel: "datum", rubrik: "Datum", bredd: 130 },
              { nyckel: "plats", rubrik: "Plats" },
              {
                nyckel: "antal",
                rubrik: "Punkter",
                bredd: 100,
                typ: "num",
                sortVarde: (x) => (x.punkter || []).length,
                textVarde: (x) => String((x.punkter || []).length),
                exportVarde: (x) => (x.punkter || []).length,
                render: (x) => (x.punkter || []).length,
              },
              {
                nyckel: "oregistrerade",
                rubrik: "Oregistrerade",
                bredd: 140,
                sortVarde: (x) => motesFlagga(x).length,
                textVarde: (x) => String(motesFlagga(x).length),
                exportVarde: (x) => motesFlagga(x).length,
                render: (x) => {
                  const n = motesFlagga(x).length;
                  if (!n) return <span className="text-ink-faint">—</span>;
                  return (
                    <span className="pill p-bad" title="Punkter under §4/§5 utan registrerat ärende">
                      {n}
                      <span className="sr-only"> punkter under §4 eller §5 saknar ärende</span>
                    </span>
                  );
                },
              },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 130,
                filter: true,
                filterEtikett: statusNamn,
                textVarde: (x) => statusNamn(x.status),
                render: (x) => statusNamn(x.status),
              },
            ]}
          />
        </div>
      </div>

      {m ? <Moteformular m={m} p={p} /> : null}
    </>
  );
}
