import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, FolderSync } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Card, Kpi, Note } from "../components/ui/Primitiver.jsx";
import { CSV_TABELLER } from "../data/konstanter.js";
import { KONFIGURERAD } from "../lib/supabase.js";
import { exporteraJson, exporteraLista } from "../lib/export.js";
import { lasXlsx } from "../lib/xlsx.js";
import {
  filtyp,
  forslagBackup,
  forslagCsv,
  forslagProtokoll,
  forslagUrLogg,
  kanTillampas,
} from "../lib/importera.js";
import { arEjAktiverat, perProjekt, skapaArkiv } from "../state/protokoll-arkiv.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* Data och backup.

   Tre saker: var datan ligger, att få ut den (säkerhetskopia och CSV) och
   att få in den. Importen tar JSON-säkerhetskopior, CSV från appens egen
   export, UR-loggar i Excel och mötesprotokoll. Varje fil blir först ett
   förslag som visar exakt vad som läggs till och ändras — ingenting skrivs
   förrän användaren tillämpar det, och en import tar aldrig bort något.

   Mötesprotokoll hamnar i protokollarkivet (lib/protokoll-arkiv.js). Det
   senast inlästa blir MASTER för projektet, äldre arkiveras. Samma arkiv är
   målet för det planerade Make-flödet från Google Drive. */

const LISTNAMN = Object.fromEntries(CSV_TABELLER);
const FALTNAMN = {
  benamning: "Benämning",
  beskrivning: "Beskrivning",
  handelseDatum: "Datum skapad",
  skapadAv: "Skapad av",
  stangdDatum: "Datum stängd",
  paverkan: "Påverkan",
  belopp: "Kostnad",
  loggKommentar: "Kommentar",
  status: "Status",
  protokollFil: "Protokoll",
};

const EJ_AKTIVERAT =
  "Protokollarkivet är inte aktiverat i databasen ännu. Migreringen supabase/migrations/20260924114412_protokoll_arkiv.sql behöver köras innan protokoll kan laddas upp.";

const visaVarde = (v) => (v === null || v === undefined || v === "" ? "—" : String(v));
const kB = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " kB");

/** Läser en fil till ett förslag. Filen själv följer med för protokoll. */
async function tolkaFil(state, fil) {
  const typ = filtyp(fil.name);
  if (typ === "json") return forslagBackup(state, await fil.text(), { filnamn: fil.name });
  if (typ === "csv") return forslagCsv(state, await fil.text(), { filnamn: fil.name });
  if (typ === "xlsx") {
    try {
      return forslagUrLogg(state, await lasXlsx(await fil.arrayBuffer()), { filnamn: fil.name });
    } catch (e) {
      return { ...forslagUrLogg(state, { blad: [] }, { filnamn: fil.name }), varningar: [e.message] };
    }
  }
  if (typ === "protokoll") {
    const datum = fil.lastModified ? new Date(fil.lastModified).toISOString().slice(0, 10) : "";
    return forslagProtokoll(state, { filnamn: fil.name, datum });
  }
  return {
    typ: "okand",
    titel: "Kan inte läsas in",
    filnamn: fil.name,
    nya: [],
    uppdateringar: [],
    varningar: ["Filtypen stöds inte. Använd .json, .csv, .xlsx, .pdf eller .docx."],
    info: [],
    fel: true,
  };
}

/* ---------- Ett importförslag ---------- */

function Forslagskort({ f, projekt, onProjekt, onTillampa, onAvvisa, arbetar }) {
  const [visaAlla, setVisaAlla] = useState(false);
  const behoverProjekt = f.typ === "urlogg" || f.typ === "protokoll";
  const rader = [...f.nya.map((n) => ({ typ: "ny", n })), ...f.uppdateringar.map((u) => ({ typ: "upd", u }))];
  const synliga = visaAlla ? rader : rader.slice(0, 6);

  return (
    <article className={`importkort${f.fel ? " fel" : ""}`} aria-label={`Import av ${f.filnamn}`}>
      <header className="importkort-topp">
        <div style={{ minWidth: 0 }}>
          <div className="importkort-titel">{f.titel}</div>
          <div className="importkort-fil">{f.filnamn}</div>
        </div>
        {!f.fel ? (
          <div className="importkort-siffror">
            {f.typ === "backup" ? (
              <span>Hela portföljen</span>
            ) : (
              <>
                <span className="ny">{f.nya.length} nya</span>
                <span className="upd">{f.uppdateringar.length} ändrade</span>
                {f.oforandrade ? <span>{f.oforandrade} oförändrade</span> : null}
              </>
            )}
          </div>
        ) : null}
      </header>

      {behoverProjekt && !f.fel ? (
        <div className="f importkort-projekt">
          <label htmlFor={`imp-proj-${f.nyckel}`}>Projekt</label>
          <select id={`imp-proj-${f.nyckel}`} value={f.projektId || ""} onChange={(e) => onProjekt(e.target.value)}>
            <option value="">Välj projekt…</option>
            {projekt.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.nr ? p.nr + " " : "") + p.namn}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {f.varningar.map((v) => (
        <div key={v} className="importkort-varning">
          {v}
        </div>
      ))}
      {f.info.map((v) => (
        <div key={v} className="importkort-info">
          {v}
        </div>
      ))}

      {f.typ === "backup" && f.tabeller ? (
        <table className="importkort-tabell">
          <thead>
            <tr>
              <th scope="col">Tabell</th>
              <th scope="col" className="num">
                Nu
              </th>
              <th scope="col" className="num">
                Efter
              </th>
            </tr>
          </thead>
          <tbody>
            {f.tabeller.map((t) => (
              <tr key={t.lista}>
                <td>{LISTNAMN[t.lista] || t.lista}</td>
                <td className="num">{t.nu}</td>
                <td className={`num${t.efter < t.nu ? " minskar" : ""}`}>{t.efter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {rader.length ? (
        <ul className="importkort-lista">
          {synliga.map((r) =>
            r.typ === "ny" ? (
              <li key={"n" + r.n.id}>
                <span className="importkort-tagg ny">Ny</span>
                <b>{r.n.nr || r.n.titel || r.n.id}</b> {r.n.benamning || r.n.protokollFil || ""}
              </li>
            ) : (
              <li key={"u" + r.u.id}>
                <span className="importkort-tagg upd">Ändras</span>
                <b>{r.u.etikett}</b>
                <dl className="importkort-diff">
                  {Object.keys(r.u.efter).map((k) => (
                    <div key={k}>
                      <dt>{FALTNAMN[k] || k}</dt>
                      <dd>
                        <s>{visaVarde(r.u.fore[k])}</s> → {visaVarde(r.u.efter[k])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            )
          )}
        </ul>
      ) : null}
      {rader.length > 6 ? (
        <button type="button" className="btn sec mini" onClick={() => setVisaAlla((v) => !v)}>
          {visaAlla ? "Visa färre" : `Visa alla ${rader.length}`}
        </button>
      ) : null}

      <div className="rowbtns">
        {!f.fel ? (
          <button
            type="button"
            className={`btn${f.typ === "backup" ? " fara" : ""}`}
            disabled={!kanTillampas(f) || arbetar}
            onClick={onTillampa}
          >
            {arbetar ? "Tillämpar…" : f.typ === "backup" ? "Återställ portföljen" : "Tillämpa"}
          </button>
        ) : null}
        <button type="button" className="btn sec" onClick={onAvvisa}>
          {f.fel ? "Stäng" : "Avvisa"}
        </button>
      </div>
    </article>
  );
}

/* ---------- Protokollarkivet ---------- */

function Protokollarkiv({ rader, projekt, status, onOppna }) {
  const grupper = perProjekt(rader);
  const namnFor = (pid) => {
    const p = projekt.find((x) => x.id === pid);
    return p ? (p.nr ? p.nr + " " : "") + p.namn : "Ej kopplat till projekt";
  };

  return (
    <Card klass="data-sektion">
      <div className="kortrad">
        <div>
          <h3>Mötesprotokoll</h3>
          <div className="lead" style={{ margin: "4px 0 0" }}>
            Det senast inlästa protokollet är MASTER — den gällande versionen för projektet. Äldre arkiveras.
          </div>
        </div>
      </div>

      {status ? <Note style={{ marginTop: 12 }}>{status}</Note> : null}

      {!rader.length && !status ? (
        <p className="lead" style={{ margin: "12px 0 0" }}>
          Inga protokoll inlästa ännu. Släpp en PDF eller Word-fil ovan.
        </p>
      ) : null}

      {[...grupper.entries()].map(([pid, lista]) => (
        <section key={pid || "okopplat"} className="protokoll-grupp" aria-label={`Protokoll för ${namnFor(pid)}`}>
          <h4>{namnFor(pid)}</h4>
          <ul className="protokoll-lista">
            {lista.map((r) => (
              <li key={r.id} className={r.status}>
                <span className={`protokoll-status ${r.status}`}>{r.status === "master" ? "MASTER" : "Arkiverad"}</span>
                <span className="protokoll-namn">
                  {r.moteNr ? <b>{r.moteNr} · </b> : null}
                  {r.filnamn}
                </span>
                <span className="protokoll-meta">
                  {(r.inlast || "").slice(0, 10)} · {r.kalla === "drive" ? "Google Drive" : "Manuell"}
                  {r.storlek ? ` · ${kB(r.storlek)}` : ""}
                </span>
                <button type="button" className="btn sec mini" onClick={() => onOppna(r)}>
                  Öppna
                  <span className="sr-only"> {r.filnamn}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Card>
  );
}

/* ---------- Vyn ---------- */

export function Data() {
  const { state, dispatch, conn } = usePortfolj();
  const { bekrafta, visaToast } = useUi();
  const [forslag, setForslag] = useState([]); // [{...forslag, nyckel, fil}]
  const [arbetar, setArbetar] = useState(null);
  const [drar, setDrar] = useState(false);
  const [protokoll, setProtokoll] = useState([]);
  const [arkivStatus, setArkivStatus] = useState("");
  const filRef = useRef(null);
  const arkiv = useMemo(() => skapaArkiv(), []);

  const laddaArkiv = useCallback(async () => {
    try {
      setProtokoll(await arkiv.lista());
      setArkivStatus("");
    } catch (e) {
      setProtokoll([]);
      setArkivStatus(
        arEjAktiverat(e)
          ? EJ_AKTIVERAT
          : `Protokollarkivet kunde inte läsas (${e.message || e}).`
      );
    }
  }, [arkiv]);

  // Arkivet ligger utanför React-state och läses in när vyn öppnas.
  useEffect(() => {
    let aktiv = true;
    arkiv.lista().then(
      (rader) => aktiv && setProtokoll(rader),
      (e) => aktiv && setArkivStatus(arEjAktiverat(e) ? EJ_AKTIVERAT : `Protokollarkivet kunde inte läsas (${e.message || e}).`)
    );
    return () => {
      aktiv = false;
    };
  }, [arkiv]);

  const listor = Object.keys(state).filter((k) => Array.isArray(state[k]));
  const totalt = listor.reduce((s, k) => s + state[k].length, 0);
  const storlek = Math.round(JSON.stringify(state).length / 1024);
  const delad = KONFIGURERAD && conn?.kl !== "err";
  const masters = protokoll.filter((r) => r.status === "master").length;

  const lasIn = async (filer) => {
    const nya = [];
    for (const fil of filer) {
      const f = await tolkaFil(state, fil);
      nya.push({ ...f, nyckel: `${fil.name}-${fil.lastModified}-${Math.random()}`, fil });
    }
    setForslag((fore) => [...nya, ...fore]);
  };

  const sattProjekt = (nyckel, pid) =>
    setForslag((fore) =>
      fore.map((f) => {
        if (f.nyckel !== nyckel) return f;
        // Bygg om förslaget mot rätt projekt — matchningen mot befintliga poster beror på det.
        return { ...f, projektId: pid || null, _omtolka: true };
      })
    );

  // Förslag vars projekt valts om tolkas om i sin helhet.
  useEffect(() => {
    const omtolka = forslag.filter((f) => f._omtolka);
    if (!omtolka.length) return;
    (async () => {
      const klara = await Promise.all(
        omtolka.map(async (f) => {
          let ny;
          if (f.typ === "urlogg") ny = forslagUrLogg(state, await lasXlsx(await f.fil.arrayBuffer()), { filnamn: f.filnamn, projektId: f.projektId });
          else ny = forslagProtokoll(state, { filnamn: f.filnamn, projektId: f.projektId, datum: f.nya[0]?.datum || "" });
          if (!f.projektId) ny = { ...ny, projektId: null };
          return { ...ny, nyckel: f.nyckel, fil: f.fil };
        })
      );
      setForslag((fore) => fore.map((f) => klara.find((k) => k.nyckel === f.nyckel) || f));
    })();
  }, [forslag, state]);

  const tillampa = async (f) => {
    if (f.typ === "backup") {
      const ja = await bekrafta(
        "All arbetsdata i portföljen ersätts med innehållet i säkerhetskopian. Kontraktsvärde, betalplan och ändringslogg behålls. Det går inte att ångra.",
        { titel: "Återställ från säkerhetskopia?", ok: "Återställ", fara: true }
      );
      if (!ja) return;
    }
    setArbetar(f.nyckel);
    try {
      if (f.typ === "protokoll") {
        const rad = await arkiv.ladda(f.fil, { projektId: f.projektId, moteNr: f.moteNr });
        await laddaArkiv();
        if (f.nya.length || f.uppdateringar.length) dispatch({ type: "IMPORTERA", forslag: f });
        visaToast(`${rad.filnamn} är MASTER för projektet`);
      } else {
        dispatch({ type: "IMPORTERA", forslag: f });
        visaToast(f.typ === "backup" ? "Portföljen återställd från säkerhetskopian" : "Importen är tillämpad och loggad");
      }
      setForslag((fore) => fore.filter((x) => x.nyckel !== f.nyckel));
    } catch (e) {
      visaToast(
        arEjAktiverat(e)
          ? "Protokollarkivet är inte aktiverat i databasen ännu"
          : `Kunde inte läsa in ${f.filnamn}: ${e.message || e}`,
        "bad"
      );
    } finally {
      setArbetar(null);
    }
  };

  const oppnaProtokoll = async (r) => {
    try {
      const url = await arkiv.oppna(r);
      if (url) window.open(url, "_blank", "noopener");
      else visaToast("Filen finns inte i arkivet", "warn");
    } catch (e) {
      visaToast(`Kunde inte öppna protokollet: ${e.message || e}`, "bad");
    }
  };

  const spara = async (p) => {
    const r = await p;
    if (r && !r.tyst) visaToast(r.txt, r.typ || (r.ok ? "" : "bad"));
  };

  return (
    <>
      <div className="grid g4">
        <Kpi
          label="Lagring"
          varde={delad ? "Delad databas" : "Lokalt läge"}
          hint={delad ? "Supabase — syns för alla inloggade" : "sparas bara i den här webbläsaren"}
          klass={delad ? "" : "warn"}
        />
        <Kpi label="Rader totalt" varde={totalt} hint={`${listor.length} tabeller · ca ${storlek} kB`} />
        <Kpi label="Mötesprotokoll" varde={protokoll.length} hint={`${masters} MASTER · ${protokoll.length - masters} arkiverade`} />
        <Kpi label="Drive-synk" varde="Planerad" hint="Make-flödet är inte aktivt ännu" klass="warn" />
      </div>

      <Card klass="data-sektion">
        <h3>Läs in filer</h3>
        <div className="lead">
          Släpp en eller flera filer. Varje fil visas som ett förslag — inget ändras förrän du tillämpar det, och
          importen tar aldrig bort något.
        </div>

        <div
          className={`dropzon${drar ? " aktiv" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDrar(true);
          }}
          onDragLeave={() => setDrar(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrar(false);
            lasIn([...e.dataTransfer.files]);
          }}
        >
          <FileUp size={26} aria-hidden="true" />
          <div>
            <b>Släpp filer här</b> eller{" "}
            <button type="button" className="lanklik" onClick={() => filRef.current?.click()}>
              välj från datorn
            </button>
          </div>
          <ul className="dropzon-typer">
            <li>
              <b>.xlsx</b> UR-logg → ÄTA och hinder
            </li>
            <li>
              <b>.pdf / .docx</b> Mötesprotokoll → Byggmöten, blir MASTER
            </li>
            <li>
              <b>.csv</b> Tabell från appens egen export → samma flik
            </li>
            <li>
              <b>.json</b> Säkerhetskopia → hela portföljen
            </li>
          </ul>
          <input
            ref={filRef}
            type="file"
            multiple
            className="sr-only"
            aria-label="Välj filer att läsa in"
            accept=".json,.csv,.xlsx,.xlsm,.pdf,.doc,.docx,.odt"
            onChange={(e) => {
              lasIn([...e.target.files]);
              e.target.value = "";
            }}
          />
        </div>

        {forslag.length ? (
          <div className="importlista">
            {forslag.map((f) => (
              <Forslagskort
                key={f.nyckel}
                f={f}
                projekt={state.projekt}
                arbetar={arbetar === f.nyckel}
                onProjekt={(pid) => sattProjekt(f.nyckel, pid)}
                onTillampa={() => tillampa(f)}
                onAvvisa={() => setForslag((fore) => fore.filter((x) => x.nyckel !== f.nyckel))}
              />
            ))}
          </div>
        ) : null}
      </Card>

      <Protokollarkiv rader={protokoll} projekt={state.projekt} status={arkivStatus} onOppna={oppnaProtokoll} />

      <div className="grid g2 data-sektion">
        <Card>
          <h3>Säkerhetskopia</h3>
          <div className="lead">
            Hela portföljen i en fil — {totalt} rader, ca {storlek} kB. Ta en kopia före större ändringar och inför
            varje milstolpe. Filen läses tillbaka genom att släppa den i rutan ovan.
          </div>
          <div className="rowbtns">
            <button type="button" className="btn" onClick={() => spara(exporteraJson(state, hamtaNamn()))}>
              Ladda ner säkerhetskopia (JSON)
            </button>
          </div>
        </Card>

        <Card>
          <h3>Var ligger datan?</h3>
          <ul className="datalista">
            <li className={delad ? "ok" : ""}>
              <b>Delad databas (Supabase)</b>
              <span>
                Allt sparas automatiskt ungefär en sekund efter varje ändring och syns för alla inloggade. Kontraktsvärde
                och betalplan ligger i ett eget dokument som bara administratören kan ändra, och ändringsloggen i en egen
                tabell som bara går att lägga till i.
              </span>
            </li>
            <li>
              <b>Protokollarkivet</b>
              <span>Mötesprotokoll sparas som filer i ett privat arkiv, med MASTER/arkiverad per projekt.</span>
            </li>
            <li className="planerad">
              <b>
                <FolderSync size={14} aria-hidden="true" /> Google Drive via Make — planerad
              </b>
              <span>
                Filer i mapparna 01. Växjö, 02. Alvesta och Möten ska läsas in automatiskt till protokollarkivet. Flödet
                är inte aktivt ännu; tills dess läses filerna in här.
              </span>
            </li>
          </ul>
        </Card>
      </div>

      <Card klass="data-sektion">
        <h3>Tabeller</h3>
        <div className="lead">
          Ta ut en tabell som CSV för Excel. Redigerad fil kan läsas tillbaka ovan — raderna matchas på kolumnen id.
        </div>
        <div className="tscroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Tabell</th>
                <th scope="col" className="num" style={{ width: 90 }}>
                  Rader
                </th>
                <th scope="col" style={{ width: 110 }}>
                  Export
                </th>
              </tr>
            </thead>
            <tbody>
              {CSV_TABELLER.map(([k, namn]) => {
                const n = (state[k] || []).length;
                return (
                  <tr key={k}>
                    <td data-label="Tabell">{namn}</td>
                    <td data-label="Rader" className="num">
                      {n}
                    </td>
                    <td data-label="Export">
                      {n ? (
                        <button type="button" className="btn sec mini" onClick={() => spara(exporteraLista(namn, state[k]))}>
                          CSV<span className="sr-only"> för {namn}</span>
                        </button>
                      ) : (
                        <span className="lead" style={{ margin: 0 }}>
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
