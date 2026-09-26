import { useMemo } from "react";
import { FileDiff, HardHat, OctagonAlert, Wallet } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { fmtKompakt } from "../../lib/format.js";
import { RONDINTERVALL, ataLage, budgetLage, hseqLage } from "../../lib/oversikt.js";
import { kommandeHallpunkter, lagesbild, planAnkare } from "../../lib/epc.js";
import { datumKort } from "../../lib/datum.js";

/** Hur långt fram hållpunkterna räknas. */
const HP_FONSTER = 30;
import { Lank } from "./Ruta.jsx";

/* De fyra nyckeltalen: ÄTA/UR, hållpunkter, skyddsronder (BAS-U) och budget.

   Formen följer vad siffran är. Portföljen har ingen historik för
   fakturering, så i stället för påhittade trendlinjer visar korten läget nu:
   ärenden per steg i flödet, de närmaste hållpunkterna, dagar sedan rond mot
   intervallet och segment för andel av en helhet. M1–M7 står i Gantt-schemat.
   Status bärs alltid av både färg och text. */

const kortNamn = (p) => p.nr || p.ort || p.namn;

function Kpi({ i, ikon: Ikon, etikett, varde, enhet, under, ton = "", status, children, delar = [], fot, lank }) {
  const { visa } = useUi();
  return (
    <article className="ov-kpi" style={{ "--i": i }}>
      <div className="ov-kpi-topp">
        <div className="flex items-center gap-2.5">
          <span className={`ov-ikon ${ton === "bad" || ton === "warn" ? ton : ""}`.trim()} aria-hidden="true">
            <Ikon size={17} strokeWidth={2} />
          </span>
          <h3 className="ov-kpi-etikett">{etikett}</h3>
        </div>
        {status ? <span className={`ov-status ${ton}`.trim()}>{status}</span> : null}
      </div>

      <div className="ov-kpi-varde">
        {varde}
        {enhet ? <span className="ov-kpi-enhet">{enhet}</span> : null}
      </div>
      {under ? <p className="ov-kpi-under">{under}</p> : null}

      {children}

      {delar.length ? (
        <ul className="ov-delar">
          {delar.map((d) => (
            <li key={d.etikett} className={d.ton || undefined}>
              <span>{d.etikett}</span>
              <b>{d.varde}</b>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="ov-kpi-fot">
        <span>{fot}</span>
        {lank ? (
          <Lank onClick={() => visa(lank[1])} etikett={`Öppna ${lank[0]}`}>
            {lank[0]}
          </Lank>
        ) : null}
      </div>
    </article>
  );
}

/** Andel av en helhet: klart | pågår | kvar. Förklaringen bär siffrorna, så
 *  stapeln är dekor för skärmläsare. */
function Segment({ klar, pagar, klarText, pagarText }) {
  const kvar = Math.max(0, 100 - klar - pagar);
  return (
    <>
      <div className="ov-seg" aria-hidden="true">
        {klar ? <i className="klar" style={{ flex: `${klar} 1 0` }} /> : null}
        {pagar ? <i className="pagar" style={{ flex: `${pagar} 1 0` }} /> : null}
        {kvar ? <i className="kvar" style={{ flex: `${kvar} 1 0` }} /> : null}
      </div>
      <ul className="ov-legend">
        <li>
          <i className="klar" aria-hidden="true" />
          {klarText} {klar} %
        </li>
        <li>
          <i className="pagar" aria-hidden="true" />
          {pagarText} {pagar} %
        </li>
        <li>
          <i className="kvar" aria-hidden="true" />
          Kvar {kvar} %
        </li>
      </ul>
    </>
  );
}

/* ---------- Budget ---------- */

function Budget() {
  const { state } = usePortfolj();
  const b = useMemo(() => budgetLage(state), [state]);

  return (
    <Kpi
      i={3}
      ikon={Wallet}
      etikett="Budget"
      varde={b.kv ? b.faktProc : "—"}
      enhet={b.kv ? "% fakturerat" : null}
      under={b.kv ? `${fmtKompakt(b.fakt)} av ${fmtKompakt(b.kv)} kontrakterat` : "Kontraktsvärde saknas i underlaget"}
      delar={b.rader.map((r) => ({
        etikett: kortNamn(r.p),
        varde: `${r.faktProc} %${r.faktSEK !== null ? " · " + fmtKompakt(r.faktSEK) : ""}`,
      }))}
      fot={b.saknarKv.length ? `${b.saknarKv.length} projekt utan kontraktsvärde` : null}
      lank={["Ekonomi", "ekonomi"]}
    >
      {b.kv ? <Segment klar={b.faktProc} pagar={b.pagProc} klarText="Fakturerat" pagarText="Pågår" /> : null}
    </Kpi>
  );
}

/* ---------- Hållpunkter ---------- */

const kortaAv = (t, n = 64) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

function Hallpunkter() {
  const { state } = usePortfolj();
  const { oppnaPost } = useUi();
  const h = useMemo(() => {
    const projekt = state.projekt.filter((p) => planAnkare(state, p.id));
    const kommande = projekt.flatMap((p) => kommandeHallpunkter(state, p.id, HP_FONSTER));
    // En hållpunkt räknas som passerad när fasens grind är passerad.
    const lage = projekt.map((p) => lagesbild(state, p.id));
    return {
      projekt,
      kommande,
      iSenFas: kommande.filter((k) => k.fas.status === "sen").length,
      passerade: lage.reduce((n, l) => n + l.hpPasserade, 0),
      totalt: lage.reduce((n, l) => n + l.hp, 0),
    };
  }, [state]);

  const ton = !h.projekt.length ? "" : h.iSenFas ? "bad" : h.kommande.length ? "warn" : "ok";
  const status = !h.projekt.length ? null : h.iSenFas ? "I försenad fas" : h.kommande.length ? "Bevaka" : "Inga just nu";
  const namn = (pid) => {
    const p = state.projekt.find((x) => x.id === pid);
    return p ? kortNamn(p) : pid;
  };

  return (
    <Kpi
      i={1}
      ikon={OctagonAlert}
      etikett="Hållpunkter (HP)"
      varde={h.kommande.length}
      enhet={`att godkänna inom ${HP_FONSTER} d`}
      ton={ton}
      status={status}
      under={
        h.projekt.length
          ? `${h.passerade} av ${h.totalt} passerade i ${h.projekt.length} projekt — stopp tills godkänt`
          : "Inga projekt med fasplan ännu"
      }
      fot={h.kommande.length > 3 ? `+ ${h.kommande.length - 3} till` : null}
      lank={["Bygga batteripark", "epc"]}
    >
      {h.kommande.length ? (
        <ul className="ov-hplista">
          {h.kommande.slice(0, 3).map((k) => (
            <li key={`${k.projektId}-${k.punkt.id}`}>
              <button type="button" className="ov-hprad" onClick={() => oppnaPost("epc", `kp-${k.punkt.id}`)}>
                <span className="ov-hpid">{k.punkt.id}</span>
                <span className="ov-hptext" title={k.punkt.text}>
                  {kortaAv(k.punkt.text)}
                  <small>
                    {namn(k.projektId)} · fas {k.fas.fas.nr}{" "}
                    {k.fas.status === "kommande" ? `startar ${datumKort(k.fas.start)}` : k.fas.status === "sen" ? "försenad" : "pågår"}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Kpi>
  );
}

/* ---------- ÄTA ---------- */

// Tavlans fem steg, förkortade så att de ryms under en smal kolumn.
const STEG_KORT = { identifierad: "Ny", underrattad: "Underr.", underlag: "Pris", godkand: "Godk.", fakturerad: "Fakt." };

function Ata() {
  const { state } = usePortfolj();
  const a = useMemo(() => ataLage(state), [state]);
  const max = Math.max(1, ...a.steg.map((s) => s.antal));

  return (
    <Kpi
      i={0}
      ikon={FileDiff}
      etikett="ÄTA-status"
      varde={a.oppna}
      enhet={a.oppna === 1 ? "aktivt ärende" : "aktiva ärenden"}
      ton={a.larm ? "bad" : ""}
      status={a.larm ? `${a.larm} larmar` : null}
      under={`Godkänt ${fmtKompakt(a.godkant)} · under behandling ${fmtKompakt(a.pending)}`}
      delar={a.perProjekt.map(({ p, antal }) => ({ etikett: kortNamn(p), varde: `${antal} aktiva` }))}
      fot={a.larm ? "24-timmarsfrist eller pris saknas" : null}
      lank={["ÄTA och hinder", "ata"]}
    >
      <div>
        <ul className="ov-kol" aria-label="Aktiva ärenden per steg i flödet">
          {a.steg.map((s, k) => (
            <li key={s.id}>
              <span className="ov-kol-tal">
                {s.antal}
                <span className="sr-only"> {s.namn}</span>
              </span>
              <i
                className={`ov-kol-stapel${s.antal ? "" : " noll"}`}
                style={{ height: `${Math.round((s.antal / max) * 48)}px`, "--k": k }}
                aria-hidden="true"
              />
            </li>
          ))}
        </ul>
        <ul className="ov-kol-namn" aria-hidden="true">
          {a.steg.map((s) => (
            <li key={s.id} title={s.namn}>
              {STEG_KORT[s.id] || s.namn}
            </li>
          ))}
        </ul>
      </div>
    </Kpi>
  );
}

/* ---------- HSEQ ---------- */

function Hseq() {
  const { state } = usePortfolj();
  const h = useMemo(() => hseqLage(state), [state]);

  const ton = !h.rader.length ? "" : h.forsenade ? "bad" : h.utanRond ? "warn" : "ok";
  const status = !h.rader.length
    ? null
    : h.forsenade
      ? "Rond försenad"
      : h.utanRond
        ? "Rond saknas"
        : "I fas";

  return (
    <Kpi
      i={2}
      ikon={HardHat}
      etikett="Skyddsronder"
      varde={h.avvikelser}
      enhet={h.avvikelser === 1 ? "öppen avvikelse" : "öppna avvikelser"}
      ton={ton}
      status={status}
      under={`Rond minst var ${RONDINTERVALL}:e dag · tillbud ${h.ar}: ${h.tillbud}`}
      lank={["HSEQ", "hseq"]}
    >
      <ul className="ov-spar-lista">
        {h.rader.map((r) => {
          const proc = r.dagar === null ? 0 : Math.min(100, Math.round((r.dagar / RONDINTERVALL) * 100));
          const rton = r.dagar === null ? "" : r.dagar >= RONDINTERVALL ? "bad" : r.dagar >= RONDINTERVALL - 4 ? "warn" : "";
          const text =
            r.dagar === null
              ? "Ingen rond registrerad"
              : r.dagar >= RONDINTERVALL
                ? "Ny rond krävs nu"
                : `Nästa rond inom ${RONDINTERVALL - r.dagar} d`;
          return (
            <li key={r.p.id} className="ov-spar-rad">
              <span>{kortNamn(r.p)}</span>
              <div className={`ov-matare ${rton}`.trim()} aria-hidden="true">
                <i style={{ width: proc + "%" }} />
              </div>
              <b>
                {r.dagar === null ? "—" : `${r.dagar} d`}
                <span className="sr-only"> sedan senaste rond</span>
              </b>
              <small>
                {text}
                {r.avvikelser ? ` · ${r.avvikelser} öppna avvikelser` : ""}
              </small>
            </li>
          );
        })}
      </ul>
    </Kpi>
  );
}

export function Nyckeltal() {
  return (
    <section aria-labelledby="ov-nyckeltal">
      <h2 id="ov-nyckeltal" className="sr-only">
        Nyckeltal
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Ata />
        <Hallpunkter />
        <Hseq />
        <Budget />
      </div>
    </section>
  );
}
