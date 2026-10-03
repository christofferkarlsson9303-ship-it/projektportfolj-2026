import { useMemo, useState } from "react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Callout, Card, StatGroup, StatTile, StatusBadge } from "../components/ds/index.js";
import { Falt, SelStatus } from "../components/ui/Falt.jsx";
import { fmtSEK } from "../lib/format.js";
import { ataSummering, ekonomi, projekt } from "../lib/berakningar.js";
import { aprisKontroll, slutavrakning } from "../lib/kalkyl.js";
import { kontraktsText } from "../lib/kontraktsgrund.js";

/* Ekonomi på designsystemet: nyckeltal överst (StatTile), betalplanen som
   kort med diagram och tabell, ÄTA-sammanfattningen med StatGroup och de två
   kalkylerna som kort med ett resultatfält i samma form. */

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
    <div className="flex flex-col gap-2">
      <div className="h-60 w-full">
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
              <RBar dataKey="belopp" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.kod} fill={FARG[d.status] || FARG.kvar} />
                ))}
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Förklaringen står i HTML: Recharts egen legend visade bara serienamnet. */}
      <ul aria-hidden="true" className="m-0 flex list-none flex-wrap justify-center gap-x-4 gap-y-1 p-0 text-xs text-ink-soft">
        {[
          ["Fakturerad", FARG.fakturerad],
          ["Pågår", FARG.pagaende],
          ["Kvar", FARG.kvar],
        ].map(([namn, farg]) => (
          <li key={namn} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: farg }} />
            {namn}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Kalkylernas resultat ---------- */

/** Resultatet av en kalkyl: grön yta när rätten finns, lugn yta annars.
 *  Rubriken bär beskedet; färgen förstärker bara. */
function Resultat({ lage, rubrik, children }) {
  const ja = lage === "ja";
  return (
    <div
      aria-live="polite"
      className={`flex flex-col gap-2 rounded-lg border border-solid px-4 py-3 text-[13px] leading-relaxed text-ink [&_ul]:m-0 [&_ul]:pl-5 [&_p]:m-0 ${
        ja ? "border-hairline bg-ok-bg" : "border-hairline bg-sunken"
      }`}
    >
      {rubrik ? <b className={`text-[15px] leading-snug ${ja ? "text-ok-ink" : "text-ink"}`}>{rubrik}</b> : null}
      {children}
    </div>
  );
}

/* ---------- Á-priskontroll ---------- */

function Apriskontroll({ kontraktsvarde }) {
  const [v, setV] = useState({
    kontraktssumma: kontraktsvarde ?? 0,
    apris: 20,
    mangdFore: 600,
    mangdEfter: 1000,
  });
  const r = aprisKontroll(v);
  const num = (x) => Number(String(x).replace(",", ".")) || 0;

  return (
    <Card
      id="ek-apris"
      title="Á-priskontroll"
      subtitle="AB 04/ABT 06 kap. 6 § 6. Gäller per enskilt á-pris. Rätt att säga upp á-priset uppstår när mängden ändrats med minst 25 % och värdet av ändringen överstiger 0,5 % av kontraktssumman."
    >
      <div className="frow c2">
        {[
          ["kontraktssumma", "Kontraktssumma (kr)"],
          ["apris", "Á-pris (kr/enhet)"],
          ["mangdFore", "Kontrakterad mängd"],
          ["mangdEfter", "Ny total mängd"],
        ].map(([k, etikett]) => (
          <div className="f mb-0" key={k}>
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

      {r.ofullstandig ? (
        <Resultat>Fyll i kontraktssumma, á-pris och kontrakterad mängd.</Resultat>
      ) : (
        <Resultat
          lage={r.uppfyllt ? "ja" : "nej"}
          rubrik={
            r.uppfyllt ? "Rätt att påkalla förhandling om nytt á-pris" : "Villkoren för omförhandling är inte uppfyllda"
          }
        >
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
              0,5 % av kontraktssumman: <b>{fmtSEK(Math.round(r.grans))}</b> — värdet måste överstiga detta{" "}
              {r.vardeUppfyllt ? "✓" : "✗"}
            </li>
            {r.uppfyllt && r.dm > 0 ? (
              <li>
                Det avtalade á-priset gäller för högst{" "}
                <b>{r.gransMangd.toLocaleString("sv-SE", { maximumFractionDigits: 0 })} enheter</b> tillkommande.
                För överskjutande mängd gäller inte á-priset.
              </li>
            ) : null}
          </ul>
          {r.uppfyllt ? (
            <p>
              Anmäl skriftligen till beställaren att á-priset inte längre gäller och påkalla förhandling om nytt
              á-pris. Nås ingen överenskommelse tillämpas självkostnadsprincipen (löpande räkning). Spara
              underrättelsen på Ones SharePoint.
            </p>
          ) : null}
        </Resultat>
      )}
    </Card>
  );
}

/* ---------- Slutavräkning ---------- */

function Slutavrakning({ kontraktsvarde }) {
  const [v, setV] = useState({ kontraktssumma: kontraktsvarde ?? 0, tillkommande: 0, avgaende: 0 });
  const r = slutavrakning(v);
  const num = (x) => Number(String(x).replace(",", ".")) || 0;

  return (
    <Card
      id="ek-slutavrakning"
      title="Slutavräkning"
      subtitle="Flödesschema 3.1. Är värdet av avgående arbeten större än tillkommande har One rätt till 10 % av mellanskillnaden. Överstiger mellanskillnaden 20 % av kontraktssumman tillkommer rimlig ersättning för utebliven vinst på det överskjutande beloppet."
    >
      <div className="frow c3">
        {[
          ["kontraktssumma", "Kontraktssumma (kr)"],
          ["tillkommande", "Tillkommande ÄTA (kr)"],
          ["avgaende", "Avgående arbeten (kr)"],
        ].map(([k, etikett]) => (
          <div className="f mb-0" key={k}>
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

      {r.ofullstandig ? (
        <Resultat>Fyll i kontraktssumman.</Resultat>
      ) : !r.ratt ? (
        <Resultat lage="nej" rubrik="Ingen särskild slutavräkning">
          <p>
            Värdet av tillkommande arbeten ({fmtSEK(r.till)}) är inte mindre än avgående ({fmtSEK(r.avg)}).
            Fakturera ÄTA som vanligt enligt kontraktet.
          </p>
        </Resultat>
      ) : (
        <Resultat lage="ja" rubrik={`One har rätt till ${fmtSEK(Math.round(r.tio))} — 10 % av mellanskillnaden`}>
          <ul>
            <li>
              Avgående arbeten överstiger tillkommande med <b>{fmtSEK(Math.round(r.mellan))}</b>
            </li>
            <li>
              20 % av kontraktssumman: <b>{fmtSEK(Math.round(r.g20))}</b>
            </li>
            {r.over > 0 ? (
              <li>
                Mellanskillnaden överstiger 20 %-gränsen med <b>{fmtSEK(Math.round(r.over))}</b> — One har utöver
                de 10 % även rätt till rimlig ersättning för utebliven vinst på det beloppet.
              </li>
            ) : (
              <li>Mellanskillnaden understiger 20 %-gränsen — enbart de 10 % gäller.</li>
            )}
          </ul>
          <p>
            Fakturera beställaren. Kontrollera att samtliga ÄTA-fakturor är skickade och att säkerheten satts ned
            efter godkänd slutbesiktning.
          </p>
        </Resultat>
      )}
    </Card>
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

  const harKv = p.kontraktsvarde !== null && p.kontraktsvarde !== undefined;
  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;
  const adminMarke = (
    <span title="Kontraktsvärde och betalplan kan bara ändras av administratören">
      <StatusBadge label="Endast administratör" />
    </span>
  );

  return (
    <>
      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">
        {ekonomiFel ? (
          <Callout ton="bad" role="alert">
            <b>Ändringen sparades inte.</b> {ekonomiFel}
          </Callout>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <StatTile
            label="Kontraktsvärde"
            value={harKv ? fmtSEK(p.kontraktsvarde) : "Saknas"}
            ton={harKv ? "" : "warn"}
            hint={harKv ? "enligt kontraktet" : "saknas i underlaget"}
          />
          <StatTile
            label="Fakturerat"
            value={`${e.faktProc} %`}
            hint={e.faktSEK !== null ? fmtSEK(e.faktSEK) : "belopp kräver kontraktsvärde"}
          />
          <StatTile
            label="Pågår"
            value={`${e.pagProc} %`}
            hint={harKv ? fmtSEK(Math.round((e.kv * e.pagProc) / 100)) : "lyft som aviseras nu"}
          />
          <StatTile
            label="Kvar att fakturera"
            value={`${100 - e.faktProc} %`}
            hint={e.kvarSEK !== null ? fmtSEK(e.kvarSEK) : "belopp kräver kontraktsvärde"}
          />
        </div>

        <Card
          id="ek-betalplan"
          title={`Betalplan — ${projektNamn}`}
          subtitle={kontraktsText(valtProjekt, "Lyften i kontraktets betalningsplan. Status ändras här eller under Milstolpar M1–M7.", "Lyften enligt standardmallen M1–M7 från Batch C. Kontrollera mot projektets egen betalplan. Status ändras här eller under Milstolpar M1–M7.")}
          badge={adminMarke}
        >
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
                // Oavrundat, så att summaraden blir exakt kontraktsvärdet.
                sortVarde: (b) => (e.kv ? (e.kv * b.andel) / 100 : 0),
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
        </Card>

        <Card
          id="ek-ata"
          title="UR och ÄTA — sammanfattning"
          subtitle="Hela ärendehanteringen med klassificering, 24-timmarsfrist, prissättning och fakturering ligger i ÄTA och hinder."
          action={
            <button type="button" className="btn sec mini" onClick={() => visa("ata")}>
              Öppna ÄTA och hinder
            </button>
          }
        >
          <StatGroup
            items={[
              { label: "Poster", value: s.antal, detail: `${s.oppna} ej stängda` },
              { label: "Godkänt belopp", value: fmtSEK(s.belopp), detail: "godkänt, fakturerat eller stängt" },
              {
                label: "Godkänt ej fakturerat",
                value: fmtSEK(s.ejFakt),
                ton: s.ejFakt ? "warn" : "",
                detail: s.ejFakt ? "fakturera samma vecka" : "inget väntar",
              },
            ]}
          />
          <Callout ton="warn">
            <b>Att bevaka.</b> Etableringen i Alvesta (Cramo) är kontrakterad i 20 veckor enligt
            Bilaga 3-reservationen. Hyresmaterial för veckor därefter ska in i ÄTA-underlaget till
            självkostnad + 10 % entreprenadarvode. Arbeten åt Alvesta Energi AB faktureras separat med EBR
            Kostnadskatalog KLG 1:25 P2-priser och avtalad faktor.
          </Callout>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Apriskontroll key={`ap-${p.id}`} kontraktsvarde={p.kontraktsvarde} />
          <Slutavrakning key={`sl-${p.id}`} kontraktsvarde={p.kontraktsvarde} />
        </div>
      </div>
    </>
  );
}
