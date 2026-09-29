import { useMemo } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, StatTile, StatusBadge } from "../ds/index.js";
import { datumKort, idag } from "../../lib/datum.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { baslinjerad, drivtext, kritiskLinje } from "../../lib/kritiskLinje.js";

/* Tidplan med beroenden: prognos per fas, kritisk linje och vad det betyder
   för betalmilstolparna. Beroendena är standardnätet för BESS-EPC
   (src/data/fasberoenden.js); förseningar förs vidare genom det. */

const dagar = (n) => (n === null || n === undefined ? "—" : n === 0 ? "0 d" : `${n > 0 ? "+" : "−"}${Math.abs(n)} d`);

export function KritiskLinje({ pid, projektNamn }) {
  const { state, dispatch } = usePortfolj();
  const { bekrafta, visaToast, oppnaPost } = useUi();
  const nu = idag();
  const k = useMemo(() => kritiskLinje(state, pid, nu), [state, pid, nu]);

  const sparaBaslinje = async () => {
    if (k?.baslinje) {
      const ja = await bekrafta(
        `Nuvarande baslinje från ${k.baslinje.sparad} ersätts med dagens plan. Förseningar mäts därefter mot den nya.`,
        { titel: "Ersätta baslinjen?", ok: "Ersätt" }
      );
      if (!ja) return;
    }
    dispatch({ type: "SPARA_BASLINJE", rad: baslinjerad(state, pid, nu, hamtaNamn() || "") });
    visaToast("Baslinjen är sparad");
  };

  const lage =
    !k || k.forsening === null
      ? { ton: "neutral", text: "Underlag saknas" }
      : k.forsening > 0
        ? { ton: "bad", text: `${k.forsening} dagar efter kontrakt` }
        : { ton: "ok", text: k.forsening < 0 ? `${-k.forsening} dagar före kontrakt` : "I tid mot kontrakt" };

  const kedja = k ? k.faser.filter((f) => f.kritisk) : [];

  return (
    <Card
      id="tp-kritisk"
      title={`Kritisk linje och prognos — ${projektNamn}`}
      subtitle="Fasplanen med beroenden: passerade grindar, faser som dragit över, egna datum och bekräftad BESS-leverans förs vidare till slutbesiktningen."
      badge={<StatusBadge ton={lage.ton} label={lage.text} />}
      action={
        k ? (
          <button type="button" className="btn sec mini" onClick={sparaBaslinje}>
            {k.baslinje ? "Ersätt baslinje" : "Spara baslinje"}
          </button>
        ) : null
      }
    >
      {!k ? (
        <Callout ton="info">
          Ange projektets startdatum (NTP) och färdigställande i Bygga batteripark — då räknas fasplanen, prognosen och
          den kritiska linjen fram.
        </Callout>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Prognos slutbesiktning"
              value={datumKort(k.slutPrognos)}
              ton={k.forsening > 0 ? "bad" : ""}
              hint={k.kontrakt ? `kontrakt ${datumKort(k.kontrakt)} · ${dagar(k.forsening)}` : "färdigställande saknas"}
            />
            <StatTile
              label="Mot baslinjen"
              value={k.baslinje ? dagar(k.motBaslinje) : "—"}
              ton={k.motBaslinje > 0 ? "warn" : ""}
              hint={k.baslinje ? `sparad ${k.baslinje.sparad}${k.baslinje.av ? " av " + k.baslinje.av : ""}` : "ingen baslinje sparad"}
            />
            <StatTile
              label="Kritisk linje"
              value={kedja.length ? `${kedja.length} faser` : "—"}
              hint={kedja.length ? kedja.map((f) => f.nr).join(" → ") : "inga återstående faser"}
            />
          </div>

          {!k.baslinje ? (
            <Callout ton="info">
              <b>Spara en baslinje.</b> Utan den räknas förseningar mot standardplanen, som själv flyttar med när
              BESS-leveransen ändras — en sen leverans syns då inte som försening.
            </Callout>
          ) : null}

          {k.forsening > 0 ? (
            <Callout ton="bad">
              <b>Prognosen passerar kontraktets färdigställande med {k.forsening} dagar.</b> Kritisk kedja:{" "}
              {kedja.map((f) => `${f.nr} ${f.kort}`).join(" → ")}. Pröva rätten till tidsförlängning och underrätta
              beställaren skriftligt utan dröjsmål (ABT 06 kap. 4 § 3–4).
            </Callout>
          ) : null}

          <div className="overflow-x-auto">
            <table className="kl-tabell" aria-label="Prognos per fas">
              <thead>
                <tr>
                  <th scope="col">Fas</th>
                  <th scope="col">{k.referens === "baslinje" ? "Baslinje slut" : "Standardplan slut"}</th>
                  <th scope="col">Prognos slut</th>
                  <th scope="col" className="num">Förskjutning</th>
                  <th scope="col" className="num">Slack</th>
                  <th scope="col">Styrs av</th>
                </tr>
              </thead>
              <tbody>
                {k.faser.map((f) => (
                  <tr key={f.nr} className={f.klar ? "klar" : f.kritisk ? "kritisk" : undefined}>
                    <th scope="row">
                      <button type="button" className="kl-fas" onClick={() => oppnaPost("epc", `fas-${f.nr}`)}>
                        <span className="kl-nr">{f.nr}</span> {f.kort}
                      </button>
                      {f.kritisk ? <StatusBadge ton="bad" label="Kritisk" className="ml-2" /> : null}
                      {f.klar ? <StatusBadge ton="ok" label="Klar" className="ml-2" /> : null}
                    </th>
                    <td>{datumKort(f.referensSlut)}</td>
                    <td>{datumKort(f.prognosSlut)}</td>
                    <td className={`num ${f.forskjutning > 0 ? "sen" : ""}`}>{f.klar ? "—" : dagar(f.forskjutning)}</td>
                    <td className="num">{f.slack === null ? "—" : `${f.slack} d`}</td>
                    <td className="kl-driv">{drivtext(f, k.faser)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto">
            <table className="kl-tabell" aria-label="Betalmilstolpar mot prognosen">
              <thead>
                <tr>
                  <th scope="col">Milstolpe</th>
                  <th scope="col">Grind</th>
                  <th scope="col">{k.referens === "baslinje" ? "Baslinje" : "Standardplan"}</th>
                  <th scope="col">Prognos</th>
                  <th scope="col" className="num">Förskjutning</th>
                </tr>
              </thead>
              <tbody>
                {k.milstolpar.map((m) => (
                  <tr key={m.kod} className={m.klar ? "klar" : undefined}>
                    <th scope="row">{m.kod}</th>
                    <td>{m.grind}</td>
                    <td>{datumKort(m.plan)}</td>
                    <td>{datumKort(m.prognos)}</td>
                    <td className={`num ${m.forskjutning > 0 && !m.klar ? "sen" : ""}`}>{m.klar ? "—" : dagar(m.forskjutning)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
