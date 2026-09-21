import { useMemo, useState } from "react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Kpi, Note, SelStatus } from "../components/ui/Primitiver.jsx";
import { Falt } from "../components/ui/Falt.jsx";
import { fmtSEK } from "../lib/format.js";
import { ataSummering, ekonomi, projekt } from "../lib/berakningar.js";
import { aprisKontroll, slutavrakning } from "../lib/kalkyl.js";

const FARG = {
  fakturerad: "var(--turkos)",
  pagaende: "var(--one-bla)",
  kvar: "var(--hairline-stark)",
};

/* ---------- Betalplanen som stapeldiagram ---------- */

function BetalplanDiagram({ rader, kv }) {
  const data = useMemo(
    () =>
      rader.map((b) => ({
        kod: b.kod,
        benamning: b.benamning,
        status: b.status,
        belopp: kv !== null && kv !== undefined ? Math.round((kv * b.andel) / 100) : b.andel,
        andel: b.andel,
      })),
    [rader, kv]
  );

  if (!data.length) return null;
  const visarKronor = kv !== null && kv !== undefined;

  return (
    <div style={{ width: "100%", height: 240, marginBottom: 18 }}>
      {/* Diagrammet är dekorativt gentemot tabellen nedanför, som bär samma
          siffror i tillgänglig form. Därför role="img" med en sammanfattning. */}
      <div
        role="img"
        aria-label={`Betalplan per lyft. ${data
          .map((d) => `${d.kod} ${d.andel} procent, ${d.status}`)
          .join(". ")}`}
        style={{ width: "100%", height: "100%" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="kod" tick={{ fill: "var(--ink-soft)", fontSize: 12 }} stroke="var(--hairline-stark)" />
            <YAxis
              tick={{ fill: "var(--ink-soft)", fontSize: 12 }}
              stroke="var(--hairline-stark)"
              tickFormatter={(v) => (visarKronor ? `${Math.round(v / 1000)} tkr` : `${v} %`)}
              width={64}
            />
            <Tooltip
              cursor={{ fill: "var(--sunken)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                borderRadius: 10,
                color: "var(--ink)",
                fontSize: 13,
              }}
              formatter={(v, _n, p) => [
                visarKronor ? fmtSEK(v) : `${v} %`,
                `${p.payload.kod} — ${p.payload.benamning}`,
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={28}
              payload={[
                { value: "Fakturerad", type: "square", color: FARG.fakturerad },
                { value: "Pågår", type: "square", color: FARG.pagaende },
                { value: "Kvar", type: "square", color: FARG.kvar },
              ]}
              wrapperStyle={{ fontSize: 12, color: "var(--ink-soft)" }}
            />
            <RBar dataKey="belopp" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.kod} fill={FARG[d.status] || FARG.kvar} />
              ))}
            </RBar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- Á-priskontroll ---------- */

function Apriskontroll({ kontraktsvarde }) {
  const [v, setV] = useState({
    kontraktssumma: kontraktsvarde ?? 5600000,
    apris: 20,
    mangdFore: 600,
    mangdEfter: 1000,
  });
  const r = aprisKontroll(v);
  const num = (x) => Number(String(x).replace(",", ".")) || 0;

  return (
    <div className="card calc">
      <h3>Á-priskontroll</h3>
      <div className="lead">
        AB 04/ABT 06 kap. 6 § 6. Gäller per enskilt á-pris. Rätt att säga upp á-priset uppstår när mängden
        ändrats med minst 25 % <b>och</b> värdet av ändringen överstiger 0,5 % av kontraktssumman.
      </div>

      <div className="frow c2">
        {[
          ["kontraktssumma", "Kontraktssumma (kr)"],
          ["apris", "Á-pris (kr/enhet)"],
          ["mangdFore", "Kontrakterad mängd"],
          ["mangdEfter", "Ny total mängd"],
        ].map(([k, etikett]) => (
          <div className="f" key={k}>
            <label htmlFor={`ap-${k}`}>{etikett}</label>
            <Falt
              id={`ap-${k}`}
              varde={String(v[k])}
              etikett={etikett}
              inputMode="decimal"
              onCommit={(x) => setV((s) => ({ ...s, [k]: num(x) }))}
            />
          </div>
        ))}
      </div>

      <div className={`out ${r.ofullstandig ? "" : r.uppfyllt ? "yes" : "no"}`.trim()} aria-live="polite">
        {r.ofullstandig ? (
          "Fyll i kontraktssumma, á-pris och kontrakterad mängd."
        ) : (
          <>
            <span className="big">
              {r.uppfyllt
                ? "Rätt att påkalla förhandling om nytt á-pris"
                : "Villkoren för omförhandling är inte uppfyllda"}
            </span>
            <ul>
              <li>
                Mängdändring: <b>{`${r.dm > 0 ? "+" : ""}${r.dm.toLocaleString("sv-SE")}`}</b> enheter (
                {r.dproc > 0 ? "+" : ""}
                {r.dproc.toFixed(1)} %) — kravet är minst ±25 % {r.mangdUppfylld ? "✓" : "✗"}
              </li>
              <li>
                Värde av ändringen: <b>{fmtSEK(Math.round(r.varde))}</b>
              </li>
              <li>
                0,5 % av kontraktssumman: <b>{fmtSEK(Math.round(r.grans))}</b> — värdet måste överstiga
                detta {r.vardeUppfyllt ? "✓" : "✗"}
              </li>
              {r.uppfyllt && r.dm > 0 ? (
                <li>
                  Det avtalade á-priset gäller för högst{" "}
                  <b>{r.gransMangd.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} enheter</b>{" "}
                  tillkommande. För överskjutande mängd gäller inte á-priset.
                </li>
              ) : null}
            </ul>
            {r.uppfyllt ? (
              <p style={{ margin: "10px 0 0" }}>
                Anmäl skriftligen till beställaren att á-priset inte längre gäller och påkalla förhandling
                om nytt á-pris. Nås ingen överenskommelse tillämpas självkostnadsprincipen (löpande
                räkning). Spara underrättelsen på Ones SharePoint.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Slutavräkning ---------- */

function Slutavrakning({ kontraktsvarde }) {
  const [v, setV] = useState({ kontraktssumma: kontraktsvarde ?? 5600000, tillkommande: 0, avgaende: 0 });
  const r = slutavrakning(v);
  const num = (x) => Number(String(x).replace(",", ".")) || 0;

  return (
    <div className="card calc">
      <h3>Slutavräkning</h3>
      <div className="lead">
        Flödesschema 3.1. Är värdet av avgående arbeten större än tillkommande har One rätt till 10 % av
        mellanskillnaden. Överstiger mellanskillnaden 20 % av kontraktssumman tillkommer rimlig ersättning
        för utebliven vinst på det överskjutande beloppet.
      </div>

      <div className="frow c3">
        {[
          ["kontraktssumma", "Kontraktssumma (kr)"],
          ["tillkommande", "Tillkommande ÄTA (kr)"],
          ["avgaende", "Avgående arbeten (kr)"],
        ].map(([k, etikett]) => (
          <div className="f" key={k}>
            <label htmlFor={`sl-${k}`}>{etikett}</label>
            <Falt
              id={`sl-${k}`}
              varde={String(v[k])}
              etikett={etikett}
              inputMode="decimal"
              onCommit={(x) => setV((s) => ({ ...s, [k]: num(x) }))}
            />
          </div>
        ))}
      </div>

      <div className={`out ${r.ofullstandig ? "" : r.ratt ? "yes" : "no"}`.trim()} aria-live="polite">
        {r.ofullstandig ? (
          "Fyll i kontraktssumman."
        ) : !r.ratt ? (
          <>
            <span className="big">Ingen särskild slutavräkning</span>
            Värdet av tillkommande arbeten ({fmtSEK(r.till)}) är inte mindre än avgående ({fmtSEK(r.avg)}).
            Fakturera ÄTA som vanligt enligt kontraktet.
          </>
        ) : (
          <>
            <span className="big">
              One har rätt till {fmtSEK(Math.round(r.tio))} — 10 % av mellanskillnaden
            </span>
            <ul>
              <li>
                Avgående arbeten överstiger tillkommande med <b>{fmtSEK(Math.round(r.mellan))}</b>
              </li>
              <li>
                20 % av kontraktssumman: <b>{fmtSEK(Math.round(r.g20))}</b>
              </li>
              {r.over > 0 ? (
                <li>
                  Mellanskillnaden överstiger 20 %-gränsen med <b>{fmtSEK(Math.round(r.over))}</b> — One har
                  utöver de 10 % även rätt till rimlig ersättning för utebliven vinst på det beloppet.
                </li>
              ) : (
                <li>Mellanskillnaden understiger 20 %-gränsen — enbart de 10 % gäller.</li>
              )}
            </ul>
            <p style={{ margin: "10px 0 0" }}>
              Fakturera beställaren. Kontrollera att samtliga ÄTA-fakturor är skickade och att säkerheten
              satts ned efter godkänd slutbesiktning.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Sektionen ---------- */

export function Ekonomi() {
  const { state, dispatch, ekonomiFel } = usePortfolj();
  const { valtProjekt, visa, fraga } = useUi();

  const p = projekt(state, valtProjekt);
  const e = ekonomi(state, valtProjekt);
  const s = ataSummering(state, valtProjekt);

  if (!p) return null;

  const nyBetalplanrad = async () => {
    const sv = await fraga({
      titel: "Ny rad i betalplanen",
      falt: [{ namn: "benamning", etikett: "Benämning", placeholder: "t.ex. Lyft 1" }],
      ok: "Lägg till",
    });
    if (!sv || !sv.benamning) return;
    const antal = state.betalplan.filter((b) => b.projektId === valtProjekt).length + 1;
    dispatch({
      type: "UPPD_BETALPLAN_NY",
      rad: {
        id: "b" + Date.now(),
        projektId: valtProjekt,
        kod: "M" + antal,
        andel: 0,
        benamning: sv.benamning,
        status: "kvar",
        datum: "",
      },
    });
  };

  return (
    <>
      <Projektvaljare />

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>
          {(p.nr ? p.nr + " " : "") + p.namn} — betalplan{" "}
          <span className="lockbadge" title="Kontraktsvärde och betalplan kan bara ändras av administratören">
            🔒 Endast administratör
          </span>
        </h3>
        <div className="lead">
          Kontraktsvärde{" "}
          {p.kontraktsvarde !== null && p.kontraktsvarde !== undefined ? (
            fmtSEK(p.kontraktsvarde)
          ) : (
            <span className="ant">SAKNAS I UNDERLAGET</span>
          )}
        </div>

        {ekonomiFel ? (
          <Note niva="bad" style={{ margin: "0 0 16px" }} role="alert">
            <b>⚠ Ändringen sparades inte.</b> {ekonomiFel}
          </Note>
        ) : null}

        <BetalplanDiagram rader={e.rader} kv={e.kv} />

        <DataTable
          etikett="Betalplan"
          exportNamn="Betalplan"
          rader={e.rader}
          tomText="Ingen betalplan registrerad ännu."
          radKlass={(b) => (b.status === "fakturerad" ? "fakturerad" : "")}
          verktyg={
            <>
              <Tathetsvaljare />
              <button type="button" className="btn sec mini" onClick={nyBetalplanrad}>
                + Lägg till lyft
              </button>
            </>
          }
          kolumner={[
            {
              nyckel: "kod",
              rubrik: "Lyft",
              bredd: 80,
              render: (b) => <b>{b.kod}</b>,
            },
            { nyckel: "benamning", rubrik: "Benämning" },
            {
              nyckel: "andel",
              rubrik: "Andel",
              bredd: 100,
              typ: "num",
              summera: true,
              textVarde: (b) => `${b.andel} %`,
              render: (b) => `${b.andel} %`,
            },
            {
              nyckel: "belopp",
              rubrik: "Belopp",
              bredd: 140,
              typ: "sek",
              summera: true,
              sortVarde: (b) => (e.kv ? Math.round((e.kv * b.andel) / 100) : 0),
              exportVarde: (b) => (e.kv ? Math.round((e.kv * b.andel) / 100) : ""),
              render: (b) =>
                e.kv !== null && e.kv !== undefined ? fmtSEK(Math.round((e.kv * b.andel) / 100)) : "—",
            },
            {
              nyckel: "status",
              rubrik: "Status",
              bredd: 150,
              filter: true,
              filterEtikett: (v) =>
                ({ fakturerad: "Fakturerad", pagaende: "Pågår", kvar: "Kvar" })[v] || v,
              render: (b) => (
                <SelStatus
                  alternativ={["fakturerad", "pagaende", "kvar"]}
                  varde={b.status}
                  etikett={`Status för ${b.kod} ${b.benamning}`}
                  onChange={(v) => dispatch({ type: "UPPD_BETALPLAN", id: b.id, falt: "status", varde: v })}
                />
              ),
            },
          ]}
        />

        {e.rader.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-hairline bg-sunken px-4 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[.07em] text-ink-faint">
                Fakturerat
              </div>
              <div className="mt-1 font-head text-[19px] font-bold text-one-djup">
                {e.faktProc} % {e.faktSEK !== null ? `· ${fmtSEK(e.faktSEK)}` : ""}
              </div>
            </div>
            <div className="rounded-sm border border-hairline bg-sunken px-4 py-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[.07em] text-ink-faint">
                Kvar att fakturera
              </div>
              <div className="mt-1 font-head text-[19px] font-bold text-ink">
                {100 - e.faktProc} % {e.kvarSEK !== null ? `· ${fmtSEK(e.kvarSEK)}` : ""}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="card">
        <h3>UR och ÄTA — sammanfattning</h3>
        <div className="lead">
          Hela ärendehanteringen med klassificering, 24-timmarsfrist, prissättning och fakturering ligger i
          fliken ÄTA och hinder.
        </div>
        <div className="grid g3" style={{ marginBottom: 14 }}>
          <Kpi label="Poster" varde={s.antal} hint={`${s.oppna} ej stängda`} />
          <Kpi label="Godkänt belopp" varde={fmtSEK(s.belopp)} hint="godkänt, fakturerat eller stängt" />
          <Kpi
            label="Godkänt ej fakturerat"
            varde={fmtSEK(s.ejFakt)}
            hint={s.ejFakt ? "fakturera samma vecka" : "inget väntar"}
            klass={s.ejFakt ? "warn" : ""}
          />
        </div>
        <div className="rowbtns">
          <button type="button" className="btn" onClick={() => visa("ata")}>
            Öppna ÄTA och hinder
          </button>
        </div>
        <Note>
          <b>Att bevaka.</b> Etableringen i Alvesta (Cramo) är kontrakterad i 20 veckor enligt
          Bilaga 3-reservationen. Hyresmaterial för veckor därefter ska in i ÄTA-underlaget till
          självkostnad + 10 % entreprenadarvode. Arbeten åt Alvesta Energi AB faktureras separat med EBR
          Kostnadskatalog KLG 1:25 P2-priser och avtalad faktor.
        </Note>
      </div>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <Apriskontroll kontraktsvarde={p.kontraktsvarde} />
        <Slutavrakning kontraktsvarde={p.kontraktsvarde} />
      </div>
    </>
  );
}
