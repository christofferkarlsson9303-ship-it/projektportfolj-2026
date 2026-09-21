import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Kpi, Note, Pill, SelStatus, Tabellyta } from "../components/ui/Primitiver.jsx";
import { Falt, DatumFalt, NumFalt, Kryss } from "../components/ui/Falt.jsx";
import { ATA_KLASS, ATA_STATUS, ORSAKER, PRISGRUND } from "../data/konstanter.js";
import { fmtSEK } from "../lib/format.js";
import { idag } from "../lib/datum.js";
import { ataSummering, prisGrind, projekt, underrattelseLage } from "../lib/berakningar.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

const klassNamn = (v) => {
  const rad = ATA_KLASS.find(([k]) => k === v);
  return rad ? rad[1].split(" —")[0] : "Ej klassificerad";
};

/* ---------- Grindarna ur ABT 06 ---------- */

function Grind({ lage, ikon }) {
  if (!lage) return null;
  const kl = lage.varning ? "bad" : lage.ok ? "ok" : "";
  return (
    <span className={`grind ${kl}`.trim()}>
      <span aria-hidden="true">{ikon} </span>
      {lage.txt}
    </span>
  );
}

/* ---------- Detaljformuläret ---------- */

function AtaFormular({ u, onStang }) {
  const { state, uppd, uppdStatus, uppdBool, taBort, laggTill } = usePortfolj();
  const { bekrafta, visaToast, oppnaPost } = useUi();

  const und = underrattelseLage(u);
  const pris = prisGrind(u);
  const dagbok = state.dagbok.filter((d) => d.ataRef === u.nr && d.projektId === u.projektId);
  const orsak = ORSAKER.find((o) => o[0] === u.orsak);

  const satt = (falt, varde) =>
    falt === "status" ? uppdStatus("ur", u.id, falt, varde) : uppd("ur", u.id, falt, varde);

  const taBortPost = async () => {
    const ja = await bekrafta("Posten och dess kalkyl tas bort. Åtgärden går inte att ångra.", {
      titel: "Ta bort UR/ÄTA-posten?",
      ok: "Ta bort",
      fara: true,
    });
    if (!ja) return;
    taBort("ur", u.id);
    onStang();
    visaToast("Posten borttagen", "warn");
  };

  /* Skapar raden här och låter Dagbok-vyn öppna den — ÄTA-numret följer med
     som referens, vilket är det som binder ihop underlaget vid fakturering. */
  const nyDagboksrad = () => {
    const id = "d" + Date.now();
    laggTill("dagbok", {
      id,
      projektId: u.projektId,
      ataRef: u.nr,
      titel: u.benamning || "",
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
    });
    oppnaPost("dagbok", id);
  };

  const nyUnderrattelse = () => {
    const p = state.projekt.find((x) => x.id === u.projektId);
    const nr = state.storningar.filter((s) => s.projektId === u.projektId).length + 1;
    const id = "s" + Date.now();
    laggTill("storningar", {
      id,
      projektId: u.projektId,
      nr: "ST" + String(nr).padStart(3, "0"),
      affarsId: "",
      aoNummer: p?.nr || "",
      projektNamn: p ? `${p.nr} ${p.namn}` : "",
      datum: idag(),
      upprattadAv: hamtaNamn() || "Christoffer Karlsson",
      projektledare: hamtaNamn() || "Christoffer Karlsson",
      projektchef: "",
      ataNummer: u.nr,
      till: "Ingrid Capacity",
      rutaA: `${u.nr} — ${u.benamning}`,
      rutaB: "",
      rutaC: "",
      rutaD: "",
      rutaE: "",
      rutaF: "",
      begarSynpunkter: false,
      innebarForsening: true,
      svarSenast: "",
      status: "utkast",
    });
    oppnaPost("storning", id);
  };

  return (
    // role="region" sätts explicit: Chrome exponerar inte ett <section> med
    // enbart aria-label som landmärke, så skärmläsaren hoppade över panelen.
    <section
      className="card mt-4"
      role="region"
      aria-label={`Ärende ${u.nr}`}
      style={{ borderColor: "var(--one-bla)" }}
    >
      <div className="kortrad">
        <div style={{ minWidth: 0 }}>
          <h3>
            {u.nr} — {u.benamning}
          </h3>
          <div className="lead" style={{ marginBottom: 0 }}>
            {klassNamn(u.klass)} · <Pill status={u.status} />
          </div>
        </div>
        <div className="kortverktyg">
          <button type="button" className="btn sec mini" onClick={onStang}>
            Stäng
          </button>
        </div>
      </div>

      <div className="atagrindar" style={{ padding: "12px 0" }}>
        <Grind lage={und} ikon="⏱" />
        <Grind lage={pris} ikon="🔒" />
      </div>

      <div className="frow c3">
        <div className="f">
          <label htmlFor={`nr-${u.id}`}>Nummer</label>
          <Falt id={`nr-${u.id}`} varde={u.nr} etikett="Ärendenummer" onCommit={(v) => satt("nr", v)} />
        </div>
        <div className="f">
          <label htmlFor={`kl-${u.id}`}>Klassificering (flöde 2.4)</label>
          <select id={`kl-${u.id}`} value={u.klass || ""} onChange={(e) => satt("klass", e.target.value)}>
            {ATA_KLASS.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor={`st-${u.id}`}>Status (ÄTA-loggen)</label>
          <SelStatus
            id={`st-${u.id}`}
            alternativ={ATA_STATUS}
            varde={u.status}
            etikett={`Status för ${u.nr}`}
            onChange={(v) => satt("status", v)}
          />
        </div>
      </div>

      <div className="f">
        <label htmlFor={`be-${u.id}`}>Benämning</label>
        <Falt
          id={`be-${u.id}`}
          varde={u.benamning}
          etikett="Benämning"
          onCommit={(v) => satt("benamning", v)}
        />
      </div>

      <div className="f">
        <label htmlFor={`or-${u.id}`}>Orsak enligt flödesschema 2.4</label>
        <select id={`or-${u.id}`} value={u.orsak || ""} onChange={(e) => satt("orsak", e.target.value)}>
          <option value="">— välj orsak —</option>
          {ORSAKER.map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
        {orsak ? (
          <div className="guide">
            {orsak[2] === "ingen" ? (
              "Störningen beror på ONE — ingen underrättelse ska skickas och ingen ersättning utgår."
            ) : (
              <>
                Orsaken pekar mot <b>{orsak[2] === "ata" ? "ÄTA" : "hinder"}</b>. Underrättelse om störning
                ska skickas oavsett.
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="frow c3">
        <div className="f">
          <label htmlFor={`hd-${u.id}`}>Händelsedatum</label>
          <DatumFalt
            id={`hd-${u.id}`}
            varde={u.handelseDatum}
            etikett="Händelsedatum"
            onCommit={(v) => satt("handelseDatum", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`ud-${u.id}`}>Underrättelse skickad</label>
          <DatumFalt
            id={`ud-${u.id}`}
            varde={u.underrattelseDatum}
            etikett="Datum då underrättelse skickades"
            onCommit={(v) => satt("underrattelseDatum", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`pg-${u.id}`}>Prissättningsgrund</label>
          <select
            id={`pg-${u.id}`}
            value={u.prisgrund || ""}
            onChange={(e) => satt("prisgrund", e.target.value)}
          >
            {PRISGRUND.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="frow c3">
        <div className="f">
          <label htmlFor={`bl-${u.id}`}>Belopp (kr)</label>
          <NumFalt
            id={`bl-${u.id}`}
            typ="number"
            varde={u.belopp}
            etikett="Belopp i kronor"
            onCommit={(v) => satt("belopp", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`gd-${u.id}`}>Skriftligt godkänt pris (datum)</label>
          <DatumFalt
            id={`gd-${u.id}`}
            varde={u.godkantDatum}
            etikett="Datum för skriftligt godkänt pris"
            onCommit={(v) => satt("godkantDatum", v)}
          />
        </div>
        <div className="f">
          <label htmlFor={`fd-${u.id}`}>Fakturerad (datum)</label>
          <DatumFalt
            id={`fd-${u.id}`}
            varde={u.fakturaDatum}
            etikett="Fakturadatum"
            onCommit={(v) => satt("fakturaDatum", v)}
          />
        </div>
      </div>

      <Kryss
        id={`ab-${u.id}`}
        checked={u.arbeteStartat}
        onChange={(v) => uppdBool("ur", u.id, "arbeteStartat", v)}
      >
        Arbetet är påbörjat på plats
      </Kryss>

      <Note>
        <b>Dagboksunderlag.</b>{" "}
        {dagbok.length
          ? `${dagbok.length} dagboksrad${dagbok.length > 1 ? "er" : ""} är kopplade till ${u.nr}.`
          : `Ingen dagboksrad är kopplad till ${u.nr} ännu. Utan dagbok blir ÄTA:t svårt att driva.`}{" "}
        Dagboken ska per ÄTA innehålla startdatum, omfattning, väder och temperatur, kostnad samt förväntad
        och faktisk tidsåtgång.
      </Note>

      <div className="rowbtns">
        <button type="button" className="btn sec" onClick={nyDagboksrad}>
          + Dagboksrad
        </button>
        <button type="button" className="btn sec" onClick={nyUnderrattelse}>
          + Underrättelse om störning
        </button>
        <button type="button" className="btn sec" onClick={taBortPost}>
          Ta bort
        </button>
        {/* Aviseringsdokumentet hör ihop med ÄTA-kalkylatorn (Bilaga 06.1) och
            porteras med den. Knappen visas avstängd i stället för att tyst saknas. */}
        <button type="button" className="btn sec" disabled title="Porteras tillsammans med ÄTA-kalkylatorn">
          Exportera avisering (PDF)
        </button>
      </div>
    </section>
  );
}

/* ---------- Sektionen ---------- */

const PROCESSEN = [
  ["1. Identifiera", "Ingår detta i kontraktet? Tveksamt fall — öppna posten direkt.", "Direkt vid ny omständighet"],
  ["2. Underrätta", "Underrättelse om störning med AffärsID och AO-nummer.", "Max 24 timmar"],
  ["3. Dokumentera", "Dagbok med timmar per resurs, foton, vad och varför.", "Varje dag arbetet pågår"],
  ["4. Prissätt", "Pris innan arbetet startar — skriftligt godkännande.", "Före start"],
  ["5. Underlag", "Vad, varför, belopp, beräkning. Dagboksutdrag och foton bifogas.", "När arbetet är utfört"],
  ["6. Följ upp", "Varje byggmöte. ÄTA som inte drivs aktivt förfaller.", "Löpande"],
  ["7. Reglera", "Fakturera med UR-nummer, uppdatera status, ta med i slutavräkning.", "Samma vecka"],
];

export function Ata() {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga, postFokus } = useUi();
  const [oppen, setOppen] = useState(null);

  /* Idag-vyn och andra sektioner kan peka ut ett enskilt ärende. Justering
     under render så att panelen är öppen redan i första målningen. */
  const [sedd, setSedd] = useState(null);
  if (postFokus?.vy === "ata" && postFokus.tid !== sedd) {
    setSedd(postFokus.tid);
    setOppen(postFokus.id);
  }

  const p = projekt(state, pid);

  const n = useMemo(() => {
    const rader = state.ur.filter((u) => u.projektId === pid);
    return {
      rader,
      s: ataSummering(state, pid),
      utan24: rader.filter((u) => underrattelseLage(u)?.varning),
      utanPris: rader.filter((u) => prisGrind(u)?.varning),
      ejFakt: rader.filter((u) => u.status === "godkand"),
    };
  }, [state, pid]);

  const valdPost = n.rader.find((u) => u.id === oppen) || null;

  if (!p) return null;

  const nyPost = async () => {
    const sv = await fraga({
      titel: "Ny ÄTA / UR-post",
      lead: "Händelsedatum sätts till idag — 24-timmarsfristen för underrättelse börjar räknas därifrån.",
      falt: [{ namn: "benamning", etikett: "Kort beskrivning av händelsen", typ: "textarea" }],
      ok: "Registrera",
    });
    if (!sv || !sv.benamning) return;

    const antal = state.ur.filter((u) => u.projektId === pid).length + 1;
    const id = "u" + Date.now();
    laggTill("ur", {
      id,
      projektId: pid,
      nr: "UR" + String(antal).padStart(3, "0"),
      benamning: sv.benamning,
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
      ansvarig: hamtaNamn() || "",
    });
    setOppen(id);
  };

  const larm = n.utan24.length + n.utanPris.length;

  return (
    <>
      <Projektvaljare />

      <div className="grid g4">
        <Kpi label="Poster i UR-serien" varde={n.s.antal} hint={`varav ${n.s.oppna} ej stängda`} />
        <Kpi label="Godkänt belopp" varde={fmtSEK(n.s.belopp)} hint="godkänt, fakturerat eller stängt" />
        <Kpi
          label="Godkänt ej fakturerat"
          varde={fmtSEK(n.s.ejFakt)}
          hint={n.ejFakt.length ? "fakturera samma vecka" : "inget väntar"}
          klass={n.ejFakt.length ? "warn" : ""}
        />
        <Kpi
          label="Grindar som larmar"
          varde={larm}
          hint="24-timmarsfrist och prisgodkännande"
          klass={larm ? "bad" : ""}
        />
      </div>

      {n.utan24.length ? (
        <Note niva="bad">
          <b>
            {n.utan24.length} post{n.utan24.length > 1 ? "er" : ""} saknar underrättelse mer än 24 timmar
            efter händelsen.
          </b>{" "}
          Utan underrättelse kan rätten till ersättning gå förlorad (ABT 06 kap. 2 § 7 och kap. 5 § 4).
          Skicka underrättelsen först — komplettera blanketten sedan.
        </Note>
      ) : null}

      {n.utanPris.length ? (
        <Note>
          <b>
            {n.utanPris.length} post{n.utanPris.length > 1 ? "er" : ""} har startat utan skriftligt godkänt
            pris.
          </b>{" "}
          Enligt processen ska priset vara godkänt före start. Dokumentera i dagboken varje dag arbetet
          pågår.
        </Note>
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>UR- och ÄTA-register — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Öppna en rad för hela ärendet. Prissättning mot beställaren enligt Bilaga 06.1 (ABT 06).
              Bilaga 3 gäller mot egna UE under ABT-U 07.
            </div>
          </div>
          <div className="kortverktyg">
            <Tathetsvaljare />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <DataTable
            etikett="UR- och ÄTA-register"
            exportNamn="ATA_register"
            rader={n.rader}
            tomText={`Inga poster registrerade för ${p.nr || p.namn}.`}
            radKlass={(u) => (underrattelseLage(u)?.varning || prisGrind(u)?.varning ? "rad-sen" : "")}
            verktyg={
              <button type="button" className="btn mini" onClick={nyPost}>
                + Ny UR/ÄTA-post
              </button>
            }
            kolumner={[
              {
                nyckel: "nr",
                rubrik: "Nr",
                bredd: 96,
                render: (u) => (
                  <button
                    type="button"
                    className="border-0 bg-transparent p-0 font-bold text-one-bla underline decoration-dotted"
                    onClick={() => setOppen(oppen === u.id ? null : u.id)}
                    aria-expanded={oppen === u.id}
                  >
                    {u.nr}
                    <span className="sr-only"> — öppna ärendet {u.benamning}</span>
                  </button>
                ),
              },
              { nyckel: "benamning", rubrik: "Benämning" },
              {
                nyckel: "klass",
                rubrik: "Klass",
                bredd: 150,
                filter: true,
                filterEtikett: klassNamn,
                textVarde: (u) => klassNamn(u.klass),
                render: (u) => (
                  <span className={`klasstag k-${u.klass || "oklar"}`}>{klassNamn(u.klass)}</span>
                ),
              },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 170,
                filter: true,
                render: (u) => <Pill status={u.status} />,
              },
              { nyckel: "belopp", rubrik: "Belopp", bredd: 130, typ: "sek", summera: true },
              {
                nyckel: "grindar",
                rubrik: "Grindar",
                bredd: 110,
                sorterbar: false,
                textVarde: (u) =>
                  [underrattelseLage(u)?.varning ? "24h" : "", prisGrind(u)?.varning ? "pris" : ""]
                    .filter(Boolean)
                    .join(" "),
                exportVarde: (u) =>
                  [underrattelseLage(u)?.varning ? "24h-frist" : "", prisGrind(u)?.varning ? "pris ej godkänt" : ""]
                    .filter(Boolean)
                    .join(", "),
                render: (u) => {
                  const a = underrattelseLage(u)?.varning;
                  const b = prisGrind(u)?.varning;
                  if (!a && !b) return <span className="text-ink-faint">—</span>;
                  return (
                    <span className="inline-flex gap-1.5">
                      {a ? (
                        <span className="grind bad" title={underrattelseLage(u).txt}>
                          <span aria-hidden="true">⏱</span>
                          <span className="sr-only">24-timmarsfristen överskriden</span>
                        </span>
                      ) : null}
                      {b ? (
                        <span className="grind bad" title={prisGrind(u).txt}>
                          <span aria-hidden="true">🔒</span>
                          <span className="sr-only">Arbete startat utan godkänt pris</span>
                        </span>
                      ) : null}
                    </span>
                  );
                },
              },
            ]}
          />
        </div>

        {valdPost ? <AtaFormular u={valdPost} onStang={() => setOppen(null)} /> : null}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Processen i sju steg</h3>
        <div className="lead">Så här ska varje post drivas — ur ÄTA-processen i projektmodellen.</div>
        <Tabellyta etikett="ÄTA-processen i sju steg">
          <table>
            <thead>
              <tr>
                <th scope="col" style={{ width: 150 }}>
                  Steg
                </th>
                <th scope="col">Åtgärd</th>
                <th scope="col" style={{ width: 180 }}>
                  När
                </th>
              </tr>
            </thead>
            <tbody>
              {PROCESSEN.map(([steg, atgard, nar]) => (
                <tr key={steg}>
                  <td data-label="Steg">
                    <b>{steg}</b>
                  </td>
                  <td data-label="Åtgärd">{atgard}</td>
                  <td data-label="När">{nar}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tabellyta>
      </div>
    </>
  );
}
