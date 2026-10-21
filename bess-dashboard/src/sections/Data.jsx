import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileUp, FolderSync } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Callout, Card, DataList, Overline, StatTile, StatusBadge } from "../components/ds/index.js";
import { CSV_TABELLER } from "../data/konstanter.js";
import { KONFIGURERAD } from "../lib/supabase.js";
import { exporteraJson, exporteraLista, laddaNer } from "../lib/export.js";
import { aterstallBilagor, bilagaSammanfattning, bilagekallor, byggSakerhetskopia, lasSakerhetskopia } from "../lib/sakerhetskopia.js";
import { skapaRitningsArkiv } from "../state/ritningsArkiv.js";
import { skapaIfcCache } from "../lib/ifcCache.js";
import { idag } from "../lib/datum.js";
import { lasXlsx } from "../lib/xlsx.js";
import {
  datumUrFilnamn,
  filtyp,
  forslagBackup,
  forslagCsv,
  forslagProtokoll,
  forslagUrLogg,
  kanTillampas,
} from "../lib/importera.js";
import { arEjAktiverat, perProjekt, skapaArkiv } from "../state/protokoll-arkiv.js";
import { lasProtokollText } from "../lib/protokolltext.js";
import { tolkaProtokoll } from "../lib/protokolltolkning.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* Data och backup.

   Tre saker: var datan ligger, att få ut den (säkerhetskopia och CSV) och
   att få in den. Importen tar JSON-säkerhetskopior, CSV från appens egen
   export, UR-loggar i Excel och mötesprotokoll. Varje fil blir först ett
   förslag som visar exakt vad som läggs till och ändras — ingenting skrivs
   förrän användaren tillämpar det, och en import tar aldrig bort något.

   Mötesprotokoll hamnar i protokollarkivet (lib/protokoll-arkiv.js). Det
   med högst mötesnummer är MASTER för projektet, övriga arkiveras. Samma
   arkiv är målet för Make-flödet från Google Drive. */

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
  plats: "Plats",
  nasta: "Nästa möte",
  deltagare: "Närvarande",
  punkter: "Mötespunkter",
};

const EJ_AKTIVERAT =
  "Protokollarkivet är inte aktiverat i databasen ännu. Migreringen supabase/migrations/20260924114412_protokoll_arkiv.sql behöver köras innan protokoll kan laddas upp.";

const visaVarde = (v) =>
  Array.isArray(v) ? (v.length ? `${v.length} st` : "—") : v === null || v === undefined || v === "" ? "—" : String(v);
const kB = (n) => (n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " kB");

/** Namn som tolkningen ska känna igen som personer: medarbetare och kontakter. */
function kandaPersoner(state) {
  return [
    ...(state.medarbetare || []).map((m) => ({ namn: m.namn, var: true })),
    ...(state.kontakter || []).map((k) => ({ namn: k.namn, var: /one nordic/i.test(k.org || "") })),
  ];
}

/** Läser en fil till ett förslag. Filen själv följer med för protokoll. */
async function tolkaFil(state, fil) {
  const typ = filtyp(fil.name);
  if (typ === "json") return forslagBackup(state, await fil.text(), { filnamn: fil.name });
  if (typ === "zip") {
    /* Fullständig säkerhetskopia (F06): state + bilagor, kontrollsummor prövas först. */
    try {
      const las = await lasSakerhetskopia(await fil.arrayBuffer());
      const f = forslagBackup(state, las.stateText, { filnamn: fil.name });
      return {
        ...f,
        titel: "Fullständig säkerhetskopia → portföljen och bilagorna",
        varningar: [...(f.varningar || []), ...las.fel],
        info: [...(f.info || []), ...bilagaSammanfattning(las.manifest), "Bilagor som redan finns skrivs inte över."],
        bilagor: las.filer,
      };
    } catch (e) {
      return { typ: "okand", titel: "Kan inte läsas in", filnamn: fil.name, nya: [], uppdateringar: [], varningar: [e.message || String(e)], info: [], fel: true };
    }
  }
  if (typ === "csv") return forslagCsv(state, await fil.text(), { filnamn: fil.name });
  if (typ === "xlsx") {
    try {
      return forslagUrLogg(state, await lasXlsx(await fil.arrayBuffer()), { filnamn: fil.name });
    } catch (e) {
      return { ...forslagUrLogg(state, { blad: [] }, { filnamn: fil.name }), varningar: [e.message] };
    }
  }
  if (typ === "protokoll") {
    const datum =
      datumUrFilnamn(fil.name) || (fil.lastModified ? new Date(fil.lastModified).toISOString().slice(0, 10) : "");
    // Texten läses lokalt i webbläsaren. Går den inte att läsa arkiveras
    // protokollet som förut, utan punkter.
    let tolkning = null;
    let lasfel = "";
    try {
      const text = await lasProtokollText(fil);
      if (text) tolkning = tolkaProtokoll(text, { filnamn: fil.name, personer: kandaPersoner(state) });
    } catch (e) {
      lasfel = `Texten i ${fil.name} kunde inte läsas (${e.message || e}). Protokollet arkiveras utan punkter.`;
    }
    const f = forslagProtokoll(state, { filnamn: fil.name, datum, tolkning });
    return lasfel ? { ...f, varningar: [lasfel, ...f.varningar] } : f;
  }
  return {
    typ: "okand",
    titel: "Kan inte läsas in",
    filnamn: fil.name,
    nya: [],
    uppdateringar: [],
    varningar: ["Filtypen stöds inte. Använd .zip, .json, .csv, .xlsx, .pdf eller .docx."],
    info: [],
    fel: true,
  };
}

/* ---------- Ett importförslag ---------- */

const NAR = { datum: "datum i protokollet", vecka: "veckan i protokollet", nasta: "till nästa möte" };

/** Åtgärderna ur ett tolkat protokoll — kryssa i det som ska bli öppna punkter. */
function Atgardslista({ f, onAtgarder }) {
  const atg = f.atgarder || [];
  const valda = atg.filter((a) => a.vald).length;
  const rubrikId = `atg-${f.nyckel}`;
  return (
    <section aria-labelledby={rubrikId} className="flex flex-col gap-2 rounded-lg border border-solid border-hairline p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h4 id={rubrikId} className="m-0 text-[14px] font-bold text-ink">
          Åtgärder → öppna punkter
        </h4>
        <span className="text-[12.5px] text-ink-soft" role="status">
          {valda} av {atg.filter((a) => !a.finns).length} valda
        </span>
        <span className="ml-auto flex flex-wrap gap-1.5">
          <button type="button" className="btn sec mini" onClick={() => onAtgarder((a) => a.var !== false)}>
            Våra
          </button>
          <button type="button" className="btn sec mini" onClick={() => onAtgarder(() => true)}>
            Alla
          </button>
          <button type="button" className="btn sec mini" onClick={() => onAtgarder(() => false)}>
            Ingen
          </button>
        </span>
      </div>
      <ul className="m-0 list-none p-0">
        {atg.map((a) => (
          <li key={a.id} className="border-0 border-t border-solid border-hairline py-2 first:border-t-0">
            <label className={`flex items-start gap-3 ${a.finns ? "opacity-60" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0"
                checked={!!a.vald}
                disabled={a.finns}
                onChange={(e) => onAtgarder((x) => (x.id === a.id ? e.target.checked : !!x.vald))}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-snug text-ink">
                  {a.text}
                  {a.fraga ? <StatusBadge ton="info" label="Fråga" className="ml-2" /> : null}
                  {a.finns ? <StatusBadge ton="neutral" label="Finns redan" className="ml-2" /> : null}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink-soft">
                  {a.ansvarig ? a.ansvarig : "Ansvarig saknas"}
                  {a.var === false ? " (inte One Nordic)" : ""}
                  {a.forfaller ? ` · senast ${a.forfaller}` : ""}
                  {a.forfallerKalla ? ` (${NAR[a.forfallerKalla]})` : ""}
                  {" · "}
                  {a.avsnitt} {a.rubrik}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Forslagskort({ f, projekt, onProjekt, onAtgarder, onTillampa, onAvvisa, arbetar }) {
  const [visaAlla, setVisaAlla] = useState(false);
  const behoverProjekt = f.typ === "urlogg" || f.typ === "protokoll";
  const rader = [...f.nya.map((n) => ({ typ: "ny", n })), ...f.uppdateringar.map((u) => ({ typ: "upd", u }))];
  const synliga = visaAlla ? rader : rader.slice(0, 6);

  return (
    <article
      aria-label={`Import av ${f.filnamn}`}
      className={`flex min-w-0 flex-col gap-3 rounded-lg border border-l-[3px] border-solid border-hairline-stark bg-surface p-4 ${
        f.fel ? "border-l-rod" : "border-l-one-bla"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="m-0 font-head text-[15px] font-bold text-ink">{f.titel}</p>
          <p className="m-0 break-all text-[12.5px] text-ink-soft">{f.filnamn}</p>
        </div>
        {!f.fel ? (
          <div className="flex flex-wrap gap-1.5">
            {f.typ === "backup" ? (
              <StatusBadge ton="neutral" label="Hela portföljen" />
            ) : (
              <>
                <StatusBadge ton="ok" label={`${f.nya.length} nya`} />
                <StatusBadge ton="info" label={`${f.uppdateringar.length} ändrade`} />
                {f.oforandrade ? <StatusBadge ton="neutral" label={`${f.oforandrade} oförändrade`} /> : null}
              </>
            )}
          </div>
        ) : null}
      </header>

      {behoverProjekt && !f.fel ? (
        <div className="f mb-0 max-w-[340px]">
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
        <Callout key={v} ton="warn">
          {v}
        </Callout>
      ))}
      {f.info.map((v) => (
        <p key={v} className="m-0 rounded-lg bg-sunken px-3 py-2 text-[13px] leading-snug text-ink-soft">
          {v}
        </p>
      ))}

      {f.typ === "protokoll" && f.atgarder?.length && f.projektId ? <Atgardslista f={f} onAtgarder={onAtgarder} /> : null}

      {f.typ === "backup" && f.tabeller ? (
        <DataTable
          etikett={`Tabeller i ${f.filnamn}`}
          sokbar={false}
          getId={(t) => t.lista}
          rader={f.tabeller}
          kolumner={[
            {
              nyckel: "lista",
              rubrik: "Tabell",
              textVarde: (t) => LISTNAMN[t.lista] || t.lista,
              render: (t) => LISTNAMN[t.lista] || t.lista,
            },
            { nyckel: "nu", rubrik: "Nu", typ: "num", bredd: 90 },
            {
              nyckel: "efter",
              rubrik: "Efter",
              typ: "num",
              bredd: 90,
              render: (t) =>
                t.efter < t.nu ? (
                  <b className="text-bad-ink">
                    {t.efter}
                    <span className="sr-only"> — färre än nu</span>
                  </b>
                ) : (
                  t.efter
                ),
            },
          ]}
        />
      ) : null}

      {rader.length ? (
        <ul aria-label={`Ändringar i ${f.filnamn}`} className="m-0 list-none p-0 text-[13px]">
          {synliga.map((r) =>
            r.typ === "ny" ? (
              <li key={"n" + r.n.id} className="flex flex-wrap items-center gap-2 border-0 border-t border-solid border-hairline py-2 first:border-t-0">
                <StatusBadge ton="ok" label="Ny" />
                <b className="text-ink">{r.n.nr || r.n.titel || r.n.id}</b> {r.n.benamning || r.n.protokollFil || ""}
              </li>
            ) : (
              <li key={"u" + r.u.id} className="border-0 border-t border-solid border-hairline py-2 first:border-t-0">
                <span className="flex flex-wrap items-center gap-2">
                  <StatusBadge ton="info" label="Ändras" />
                  <b className="text-ink">{r.u.etikett}</b>
                </span>
                <dl className="m-0 mt-1.5 grid grid-cols-[minmax(90px,max-content)_minmax(0,1fr)] gap-x-3 gap-y-1">
                  {Object.keys(r.u.efter).map((k) => (
                    <div key={k} className="contents">
                      <dt className="text-xs text-ink-soft">{FALTNAMN[k] || k}</dt>
                      <dd className="m-0 whitespace-pre-line text-[12.5px] text-ink">
                        <s className="text-ink-faint">{visaVarde(r.u.fore[k])}</s> → {visaVarde(r.u.efter[k])}
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
        <div>
          <button type="button" className="btn sec mini" onClick={() => setVisaAlla((v) => !v)}>
            {visaAlla ? "Visa färre" : `Visa alla ${rader.length}`}
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
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
    <Card
      id="data-protokoll"
      title="Mötesprotokoll"
      subtitle="Protokollet med högst mötesnummer är MASTER — den gällande versionen för projektet. Ett äldre möte som laddas upp i efterhand arkiveras direkt."
    >
      {status ? <Callout ton="warn">{status}</Callout> : null}

      {!rader.length && !status ? (
        <p className="m-0 text-[13px] text-ink-soft">Inga protokoll inlästa ännu. Släpp en PDF eller Word-fil ovan.</p>
      ) : null}

      {[...grupper.entries()].map(([pid, lista]) => (
        <section key={pid || "okopplat"} aria-label={`Protokoll för ${namnFor(pid)}`} className="flex flex-col gap-2">
          <Overline>{namnFor(pid)}</Overline>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {lista.map((r) => {
              const master = r.status === "master";
              return (
                <li
                  key={r.id}
                  data-status={r.status}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-solid px-3 py-2.5 ${
                    master ? "border-ok-ink bg-ok-bg" : "border-hairline bg-surface"
                  }`}
                >
                  <StatusBadge ton={master ? "ok" : "neutral"} label={master ? "MASTER" : "Arkiverad"} />
                  <span className={`min-w-0 flex-1 break-words text-[13.5px] ${master ? "text-ink" : "text-ink-soft"}`}>
                    {r.moteNr ? <b>{r.moteNr} · </b> : null}
                    {r.filnamn}
                  </span>
                  <span className="whitespace-nowrap text-xs text-ink-soft">
                    {(r.inlast || "").slice(0, 10)} · {r.kalla === "drive" ? "Google Drive" : "Manuell"}
                    {r.storlek ? ` · ${kB(r.storlek)}` : ""}
                  </span>
                  <button type="button" className="btn sec mini" onClick={() => onOppna(r)}>
                    Öppna
                    <span className="sr-only"> {r.filnamn}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Card>
  );
}

/* ---------- Vyn ---------- */

export function Data() {
  /* Arkiv, export och import gäller hela datan, också förlorade anbud. */
  const { heltState: state, dispatch, conn } = usePortfolj();
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
          else ny = forslagProtokoll(state, { filnamn: f.filnamn, projektId: f.projektId, datum: f.nya[0]?.datum || "", tolkning: f.tolkning });
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
        visaToast(
          rad.status === "master"
            ? `${rad.filnamn} är MASTER för projektet`
            : `${rad.filnamn} arkiverades — projektet har redan ett protokoll med högre mötesnummer`
        );
      } else {
        dispatch({ type: "IMPORTERA", forslag: f });
        if (f.bilagor?.length) {
          const res = await aterstallBilagor(f.bilagor, {
            ritningsArkiv: skapaRitningsArkiv,
            ifcCache: skapaIfcCache(),
            protokollArkiv: arkiv,
            befintligaProtokoll: protokoll,
          });
          await laddaArkiv();
          visaToast(
            `Portföljen återställd. Bilagor: ${res.aterlagda} återlagda, ${res.hoppade.length} fanns redan${res.fel.length ? `, ${res.fel.length} misslyckades (${res.fel[0]})` : ""}`,
            res.fel.length ? "warn" : ""
          );
        } else {
          visaToast(f.typ === "backup" ? "Portföljen återställd från säkerhetskopian" : "Importen är tillämpad och loggad");
        }
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

  const [packar, setPackar] = useState(false);
  const sparaFullstandig = async () => {
    setPackar(true);
    try {
      const kallor = bilagekallor(state, { ritningsArkiv: skapaRitningsArkiv, ifcCache: skapaIfcCache(), protokoll, protokollArkiv: arkiv });
      const { data, manifest } = await byggSakerhetskopia({ state, av: hamtaNamn(), kallor });
      const r = await laddaNer(`Projektportfolj_sakerhetskopia_${idag()}.zip`, data, "application/zip");
      if (r.ok && manifest.saknas.length) visaToast(`${r.txt}. ${manifest.saknas.length} bilagor kunde inte hämtas – se manifest.json`, "warn");
      else if (!r.tyst) visaToast(r.txt, r.typ || (r.ok ? "" : "bad"));
    } catch (e) {
      visaToast(`Säkerhetskopian kunde inte skapas: ${e.message || e}`, "bad");
    } finally {
      setPackar(false);
    }
  };

  const tabeller = CSV_TABELLER.map(([k, namn]) => ({ id: k, namn, rader: (state[k] || []).length }));

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <StatTile
          label="Lagring"
          value={delad ? "Delad databas" : "Lokalt läge"}
          ton={delad ? "" : "warn"}
          hint={delad ? "Supabase — syns för alla inloggade" : "sparas bara i den här webbläsaren"}
        />
        <StatTile label="Rader totalt" value={totalt} hint={`${listor.length} tabeller · ca ${storlek} kB`} />
        <StatTile
          label="Mötesprotokoll"
          value={protokoll.length}
          hint={`${masters} MASTER · ${protokoll.length - masters} arkiverade`}
        />
        <StatTile label="Drive-synk" value="Planerad" ton="warn" hint="Make-flödet är inte aktivt ännu" />
      </div>

      <Card
        id="data-import"
        title="Läs in filer"
        subtitle="Släpp en eller flera filer. Varje fil visas som ett förslag — inget ändras förrän du tillämpar det, och importen tar aldrig bort något."
      >
        <div
          className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center text-[13px] text-ink-soft transition-colors ${
            drar ? "border-one-bla bg-info-bg" : "border-hairline-stark bg-ground"
          }`}
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
          <FileUp size={26} aria-hidden="true" className="text-info-ink" />
          <p className="m-0">
            <b className="text-ink">Släpp filer här</b> eller{" "}
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-info-ink underline"
              onClick={() => filRef.current?.click()}
            >
              välj från datorn
            </button>
          </p>
          <ul aria-label="Filtyper som kan läsas in" className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1.5 p-0 text-xs">
            <li>
              <b className="font-mono text-info-ink">.xlsx</b> UR-logg → ÄTA och hinder
            </li>
            <li>
              <b className="font-mono text-info-ink">.pdf / .docx</b> Mötesprotokoll → Byggmöten, MASTER om mötesnumret är högst
            </li>
            <li>
              <b className="font-mono text-info-ink">.csv</b> Tabell från appens egen export → samma flik
            </li>
            <li>
              <b className="font-mono text-info-ink">.zip</b> Fullständig säkerhetskopia → portföljen och bilagorna
            </li>
            <li>
              <b className="font-mono text-info-ink">.json</b> Dataexport → hela portföljen (utan bilagor)
            </li>
          </ul>
          <input
            ref={filRef}
            type="file"
            multiple
            className="sr-only"
            aria-label="Välj filer att läsa in"
            accept=".zip,.json,.csv,.xlsx,.xlsm,.pdf,.doc,.docx,.odt"
            onChange={(e) => {
              lasIn([...e.target.files]);
              e.target.value = "";
            }}
          />
        </div>

        {forslag.length ? (
          <div className="flex flex-col gap-4">
            {forslag.map((f) => (
              <Forslagskort
                key={f.nyckel}
                f={f}
                projekt={state.projekt}
                arbetar={arbetar === f.nyckel}
                onProjekt={(pid) => sattProjekt(f.nyckel, pid)}
                onAtgarder={(fn) =>
                  setForslag((fore) => fore.map((x) => (x.nyckel === f.nyckel ? { ...x, atgarder: x.atgarder.map((a) => (a.finns ? a : { ...a, vald: fn(a) })) } : x)))
                }
                onTillampa={() => tillampa(f)}
                onAvvisa={() => setForslag((fore) => fore.filter((x) => x.nyckel !== f.nyckel))}
              />
            ))}
          </div>
        ) : null}
      </Card>

      <Protokollarkiv rader={protokoll} projekt={state.projekt} status={arkivStatus} onOppna={oppnaProtokoll} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card
          id="data-backup"
          title="Säkerhetskopia"
          subtitle={`Hela portföljen i en fil — ${totalt} rader, ca ${storlek} kB. Ta en kopia före större ändringar och inför varje milstolpe. Filen läses tillbaka genom att släppa den i rutan ovan.`}
        >
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" disabled={packar} onClick={sparaFullstandig}>
              {packar ? "Packar …" : "Fullständig säkerhetskopia (ZIP)"}
            </button>
            <button type="button" className="btn sec" onClick={() => spara(exporteraJson(state, hamtaNamn()))}>
              Dataexport (utan bilagor, JSON)
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            ZIP-filen innehåller portföljen, ritningsfilerna, IFC-geometrin som finns i den här webbläsaren och
            protokollfilerna, med kontrollsumma per fil. JSON-exporten saknar alla bilagor: ritningar, IFC och protokoll.
          </p>
        </Card>

        <Card id="data-lagring" title="Var ligger datan?">
          <DataList
            items={[
              {
                label: "Delad databas",
                value: "Supabase",
                badge: delad ? <StatusBadge ton="ok" label="Aktiv" /> : <StatusBadge ton="warn" label="Lokalt läge" />,
                detail:
                  "Allt sparas automatiskt ungefär en sekund efter varje ändring och syns för alla inloggade. Kontraktsvärde och betalplan ligger i ett eget dokument som bara administratören kan ändra, och ändringsloggen i en egen tabell som bara går att lägga till i.",
              },
              {
                label: "Protokollarkivet",
                value: "Privat filarkiv",
                detail: "Mötesprotokoll sparas som filer i ett privat arkiv, med MASTER/arkiverad per projekt.",
              },
              {
                label: "Google Drive",
                value: (
                  <span className="inline-flex items-center gap-1.5">
                    <FolderSync size={14} aria-hidden="true" /> Google Drive via Make — planerad
                  </span>
                ),
                badge: <StatusBadge ton="warn" label="Ej aktivt" />,
                detail:
                  "Filer i mapparna 01. Växjö, 02. Alvesta och Möten ska läsas in automatiskt till protokollarkivet. Flödet är inte aktivt ännu; tills dess läses filerna in här.",
              },
            ]}
          />
        </Card>
      </div>

      <Card
        id="data-tabeller"
        title="Tabeller"
        subtitle="Ta ut en tabell som CSV för Excel. Redigerad fil kan läsas tillbaka ovan — raderna matchas på kolumnen id."
      >
        <DataTable
          etikett="Tabeller i portföljen"
          sokbar={false}
          rader={tabeller}
          kolumner={[
            { nyckel: "namn", rubrik: "Tabell" },
            { nyckel: "rader", rubrik: "Rader", typ: "num", bredd: 90, summera: true },
            {
              nyckel: "export",
              rubrik: "Export",
              bredd: 110,
              sorterbar: false,
              render: (t) =>
                t.rader ? (
                  <button
                    type="button"
                    className="btn sec mini"
                    onClick={() => spara(exporteraLista(t.namn, state[t.id]))}
                  >
                    CSV<span className="sr-only"> för {t.namn}</span>
                  </button>
                ) : (
                  <span className="text-ink-faint">—</span>
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
