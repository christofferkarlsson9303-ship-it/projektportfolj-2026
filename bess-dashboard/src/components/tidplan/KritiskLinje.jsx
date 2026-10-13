import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, StatTile, StatusBadge } from "../ds/index.js";
import { datumKort, idag } from "../../lib/datum.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { baslinjerad, drivtext, kritiskLinje } from "../../lib/kritiskLinje.js";
import { FASSTATUS, fasStatus, grupperaMoment, projektfasForMilstolpe } from "../../lib/fasmappning.js";
import { faseInfo } from "../../data/projektfaser.ts";

/* Tidplan med beroenden: prognos per moment, kritisk linje och vad det betyder
   för betalmilstolparna. Beroendena är standardnätet för BESS-EPC
   (src/data/fasberoenden.js); förseningar förs vidare genom det.

   Momenten 0–15 står under projektets fas 1–8 (lib/fasmappning.js). Fasrubriken
   visar samma status som projektkortet. Betalningarna visar sin fas. */

const dagar = (n) => (n === null || n === undefined ? "—" : n === 0 ? "0 dagar" : `${n > 0 ? "+" : "−"}${Math.abs(n)} ${Math.abs(n) === 1 ? "dag" : "dagar"}`);

export function KritiskLinje({ pid, projektNamn }) {
  const { state, dispatch } = usePortfolj();
  const aktivFas = state.projekt.find((x) => x.id === pid)?.fas;
  const { bekrafta, visaToast, oppnaPost } = useUi();
  const nu = idag();
  const k = useMemo(() => kritiskLinje(state, pid, nu), [state, pid, nu]);
  const [visaKlara, setVisaKlara] = useState(false);

  const sparaBaslinje = async () => {
    if (k?.baslinje) {
      const ja = await bekrafta(
        `Den ursprungliga planen från ${k.baslinje.sparad} ersätts med dagens plan. Förseningar mäts sedan mot den nya.`,
        { titel: "Ersätta den ursprungliga planen?", ok: "Ersätt" }
      );
      if (!ja) return;
    }
    dispatch({ type: "SPARA_BASLINJE", rad: baslinjerad(state, pid, nu, hamtaNamn() || "") });
    visaToast("Dagens plan är sparad som ursprunglig plan");
  };

  const lage =
    !k || k.forsening === null
      ? { ton: "neutral", text: "Uppgifter saknas" }
      : k.forsening > 0
        ? { ton: "bad", text: `${k.forsening} dagar sent mot kontraktet` }
        : { ton: "ok", text: k.forsening < 0 ? `${-k.forsening} dagar före kontraktet` : "I tid" };

  const kedja = k ? k.faser.filter((f) => f.kritisk) : [];

  return (
    <Card
      id="tp-kritisk"
      title={`Blir vi klara i tid – ${projektNamn}`}
      subtitle="Räknat moment för moment. Ett försenat moment flyttar fram de moment som väntar på det, ända fram till slutbesiktningen."
      badge={<StatusBadge ton={lage.ton} label={lage.text} />}
      action={
        k ? (
          <button type="button" className="btn sec mini" onClick={sparaBaslinje}>
            {k.baslinje ? "Ersätt ursprunglig plan" : "Spara som ursprunglig plan"}
          </button>
        ) : null
      }
    >
      {!k ? (
        <Callout ton="info">
          Ange projektets startdatum och färdigdatum under Översikt eller Bygga batteripark. Då räknas planen fram.
        </Callout>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatTile
              label="Beräknad slutbesiktning"
              value={datumKort(k.slutPrognos)}
              ton={k.forsening > 0 ? "bad" : ""}
              hint={k.kontrakt ? `kontraktet: ${datumKort(k.kontrakt)} (${dagar(k.forsening)})` : "färdigdatum saknas"}
            />
            <StatTile
              label="Mot ursprunglig plan"
              value={k.baslinje ? dagar(k.motBaslinje) : "—"}
              ton={k.motBaslinje > 0 ? "warn" : ""}
              hint={k.baslinje ? `sparad ${k.baslinje.sparad}${k.baslinje.av ? " av " + k.baslinje.av : ""}` : "ingen ursprunglig plan sparad"}
            />
            <StatTile
              label="Styr slutdatumet"
              value={kedja.length ? `${kedja.length} moment` : "—"}
              hint={kedja.length ? kedja.map((f) => f.nr).join(" → ") : "inga återstående moment"}
            />
          </div>

          {!k.baslinje ? (
            <Callout ton="info">
              <b>Spara dagens plan som ursprunglig plan.</b> Annars jämförs med standardplanen, som flyttar med när
              leveranser ändras. Då syns inte en sen leverans som försening.
            </Callout>
          ) : null}

          {k.forsening > 0 ? (
            <Callout ton="bad">
              <b>Beräknat slut är {k.forsening} dagar efter kontraktets färdigdatum.</b> Momenten som styr:{" "}
              {kedja.map((f) => `${f.nr} ${f.kort}`).join(" → ")}. Kontrollera om ni har rätt till tidsförlängning och
              meddela beställaren skriftligt i tid. Fristen står under Kontraktet.
            </Callout>
          ) : null}

          <div className="overflow-x-auto">
            <table className="kl-tabell" aria-label="Moment för moment">
              <thead>
                <tr>
                  <th scope="col">Moment</th>
                  <th scope="col">{k.referens === "baslinje" ? "Ursprunglig plan klar" : "Standardplan klar"}</th>
                  <th scope="col">Beräknat klart</th>
                  <th scope="col" className="num">Försening</th>
                  <th scope="col" className="num" title="Hur många dagar momentet kan försenas utan att slutdatumet flyttas">Marginal</th>
                  <th scope="col">Väntar på</th>
                </tr>
              </thead>
              <tbody>
                {grupperaMoment(k.faser.filter((f) => visaKlara || !f.klar)).flatMap(({ fas, rader }) => [
                  <tr key={`fas-${fas.nr}`} className="kl-fasrubrik">
                    <th scope="colgroup" colSpan={6}>
                      Fas {fas.nr} · {fas.titel}
                      <StatusBadge ton={FASSTATUS[fasStatus(fas.nr, aktivFas)].ton} label={FASSTATUS[fasStatus(fas.nr, aktivFas)].text} className="ml-2 normal-case tracking-normal" />
                    </th>
                  </tr>,
                  ...rader.map((f) => (
                  <tr key={f.nr} className={f.klar ? "klar" : f.kritisk ? "kritisk" : undefined}>
                    <th scope="row">
                      <button type="button" className="kl-fas" onClick={() => oppnaPost("epc", `fas-${f.nr}`)}>
                        <span className="kl-nr">{f.nr}</span> {f.kort}
                      </button>
                      {f.kritisk ? <StatusBadge ton="bad" label="Styr slutdatum" className="ml-2" /> : null}
                      {f.klar ? <StatusBadge ton="ok" label="Klar" className="ml-2" /> : null}
                    </th>
                    <td>{datumKort(f.referensSlut)}</td>
                    <td>{datumKort(f.prognosSlut)}</td>
                    <td className={`num ${f.forskjutning > 0 ? "sen" : ""}`}>{f.klar ? "—" : dagar(f.forskjutning)}</td>
                    <td className="num">{f.slack === null ? "—" : `${f.slack} ${f.slack === 1 ? "dag" : "dagar"}`}</td>
                    <td className="kl-driv">{drivtext(f, k.faser)}</td>
                  </tr>
                  )),
                ])}
              </tbody>
            </table>
          </div>
          {k.faser.some((f) => f.klar) ? (
            <div>
              <button type="button" className="btn sec mini" aria-expanded={visaKlara} onClick={() => setVisaKlara((v) => !v)}>
                {visaKlara ? "Dölj klara moment" : `Visa klara moment (${k.faser.filter((f) => f.klar).length})`}
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="kl-tabell" aria-label="Betalningar mot beräknat slut">
              <thead>
                <tr>
                  <th scope="col">Betalning</th>
                  <th scope="col">Fas</th>
                  <th scope="col">Grind</th>
                  <th scope="col">{k.referens === "baslinje" ? "Ursprunglig plan" : "Standardplan"}</th>
                  <th scope="col">Beräknat</th>
                  <th scope="col" className="num">Försening</th>
                </tr>
              </thead>
              <tbody>
                {k.milstolpar.map((m) => (
                  <tr key={m.kod} className={m.klar ? "klar" : undefined}>
                    <th scope="row">{m.kod}</th>
                    <td>
                      {projektfasForMilstolpe(m.kod)} · {faseInfo(projektfasForMilstolpe(m.kod)).kort}
                    </td>
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
