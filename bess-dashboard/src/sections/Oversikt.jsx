import { useMemo, useState } from "react";
import { CalendarClock, FileDiff, ListChecks, Pencil, ShieldAlert } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Note, Riskvarde, Tabellyta } from "../components/ui/Primitiver.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import {
  BessHero,
  Flaggpanel,
  GanttRad,
  KommandeTidslinje,
  Matarrad,
  SiteStatusBar,
} from "../components/oversikt/Widgets.jsx";
import { Metrikkort } from "../components/oversikt/Metrikkort.jsx";
import { Projektkort, Projektredigering } from "../components/oversikt/Projekt.jsx";
import { Andringslogg } from "../components/ui/Andringslogg.jsx";
import { dagarTill, veckaEtikett, veckaNu } from "../lib/datum.js";
import {
  dagbokKomplett,
  oppnaPunkter,
  oppnaRisker,
  riskKlass,
  riskMatrisFarg,
  riskvarde,
  veckaFlaggor,
  veckorad,
} from "../lib/berakningar.js";

/* Översikten — läget i portföljen just nu.

   Ordningen är medveten: först det som kräver åtgärd (flaggor och
   påminnelser), sedan läget per site, därefter nyckeltal och projektkort, och
   sist det som är till för att läsas i lugn och ro. Varje sektion har en egen
   rubrik så att sidan går att skumma och navigera med skärmläsare. */

/* Kort projektetikett: AO-nr om det finns, annars ort. */
const kortNamn = (p) => p.nr || p.ort || p.namn;

export function Oversikt() {
  const { state } = usePortfolj();
  const { valtProjekt, visa } = useUi();
  const [visaRedigering, setVisaRedigering] = useState(false);

  const n = useMemo(() => {
    const dagar = state.projekt.map((p) => ({ p, d: dagarTill(p.fardigstallande) }));
    const kanda = dagar.filter((x) => x.d !== null);
    const risker = oppnaRisker(state);
    const punkter = oppnaPunkter(state);
    const v = veckaNu();

    return {
      naerm: kanda.length ? Math.min(...kanda.map((x) => x.d)) : null,
      dagar: kanda,
      utanDatum: dagar.length - kanda.length,
      risker,
      hogRisk: risker.filter((r) => riskMatrisFarg(r.sannolikhet, r.konsekvens) === "rod").length,
      urOppna: state.ur.filter((u) => u.status !== "stangd").length,
      urPerProjekt: state.projekt
        .map((p) => ({ p, antal: state.ur.filter((u) => u.projektId === p.id).length }))
        .filter((x) => x.antal),
      punkter,
      forfallna: punkter.filter((p) => p.forfaller && dagarTill(p.forfaller) < 0).length,
      naraLev: state.leveranser.filter(
        (l) => l.datum && dagarTill(l.datum) >= 0 && dagarTill(l.datum) <= 45
      ).length,
      levUtanDatum: state.leveranser.filter((l) => !l.datum).length,
      vecka: v,
      kvarVecka: state.projekt.filter((p) => {
        const r = veckorad(state, p.id, v);
        return !r || !r.klar;
      }),
      veckoflagg: state.projekt.reduce((s, p) => s + veckaFlaggor(veckorad(state, p.id, v)).length, 0),
      senaSvar: state.storningar.filter(
        (s) => s.status === "skickad" && s.svarSenast && dagarTill(s.svarSenast) < 0
      ),
      ofullstDagbok: state.dagbok.filter((d) => !dagbokKomplett(d) && !d.fakturerad),
      saknarKV: state.projekt.filter((p) => p.kontraktsvarde === null).map(kortNamn),
    };
  }, [state]);

  const toppRisker = useMemo(
    () => [...n.risker].sort((a, b) => riskvarde(b) - riskvarde(a)).slice(0, 5),
    [n.risker]
  );

  const harPaminnelser =
    n.kvarVecka.length || n.veckoflagg || n.senaSvar.length || n.ofullstDagbok.length;

  return (
    <div className="oversikt">
      <Flaggpanel />

      {harPaminnelser ? (
        <div className="oversikt-paminnelser">
          {n.kvarVecka.length ? (
            <Note>
              <b>Veckochecklistan {veckaEtikett(n.vecka)} är inte genomgången</b> för{" "}
              {n.kvarVecka.map((p) => `${p.nr || p.ort} ${p.namn}`).join(" och ")}. Checklistan ska gås
              igenom varje vecka för varje kontrakt.
              <div className="rowbtns">
                <button type="button" className="btn mini" onClick={() => visa("vecka")}>
                  Öppna veckokollen
                </button>
              </div>
            </Note>
          ) : null}

          {n.veckoflagg ? (
            <Note niva="bad">
              <b style={{ color: "var(--bad-ink)" }}>
                {n.veckoflagg} punkter i veckans checklista kräver åtgärd.
              </b>{" "}
              Skapa öppna punkter eller underrättelse om störning direkt i veckokollen.
            </Note>
          ) : null}

          {n.senaSvar.length ? (
            <Note niva="bad">
              <b style={{ color: "var(--bad-ink)" }}>
                {n.senaSvar.length} underrättelse{n.senaSvar.length > 1 ? "r" : ""} om störning har
                passerat begärt svarsdatum.
              </b>{" "}
              Ta upp förlängning av tidplanen på nästa byggmöte och se till att det förs till protokollet.
            </Note>
          ) : null}

          {n.ofullstDagbok.length ? (
            <Note>
              <b>
                {n.ofullstDagbok.length} dagboksrad{n.ofullstDagbok.length > 1 ? "er" : ""} saknar underlag
              </b>{" "}
              för startdatum, omfattning, väder/temperatur, kostnad eller tidsåtgång — komplettera innan
              fakturering.
              <div className="rowbtns">
                <button type="button" className="btn mini" onClick={() => visa("dagbok")}>
                  Öppna dagboken
                </button>
              </div>
            </Note>
          ) : null}
        </div>
      ) : null}

      {state.projekt.map((p) => (
        <SiteStatusBar key={p.id} pid={p.id} />
      ))}

      <BessHero />

      <div className="oversikt-matare">
        <Matarrad pid={valtProjekt} />
      </div>

      <GanttRad />

      <section className="oversikt-sektion" aria-labelledby="ov-nyckeltal">
        <div className="oversikt-rubrik">
          <h2 id="ov-nyckeltal">Nyckeltal</h2>
          <span className="oversikt-undertext">Summerat över alla projekt</span>
        </div>

        <div className="metric-rutnat">
          <Metrikkort
            ikon={CalendarClock}
            etikett="Närmast färdigställande"
            varde={n.naerm === null ? "—" : n.naerm}
            enhet={n.naerm === null ? null : n.naerm === 1 ? "dag" : "dagar"}
            ton={n.naerm !== null && n.naerm < 60 ? "warn" : ""}
            delar={n.dagar.map(({ p, d }) => ({
              etikett: kortNamn(p),
              varde: `${d} d`,
              ton: d < 60 ? "warn" : "",
            }))}
            fot={n.utanDatum ? `${n.utanDatum} projekt utan datum` : null}
          />
          <Metrikkort
            ikon={ShieldAlert}
            etikett="Öppna risker"
            varde={n.risker.length}
            ton={n.hogRisk ? "bad" : n.risker.length ? "" : "ok"}
            delar={[
              { etikett: "Röda i riskmatrisen", varde: n.hogRisk, ton: n.hogRisk ? "bad" : "" },
              { etikett: "Övriga", varde: n.risker.length - n.hogRisk },
            ]}
          />
          <Metrikkort
            ikon={FileDiff}
            etikett="Öppna UR/ÄTA"
            varde={n.urOppna}
            delar={n.urPerProjekt.map(({ p, antal }) => ({ etikett: kortNamn(p), varde: antal }))}
            fot={n.urPerProjekt.length ? "Totalt i serien per projekt" : "Inga UR registrerade"}
          />
          <Metrikkort
            ikon={ListChecks}
            etikett="Öppna punkter"
            varde={n.punkter.length}
            ton={n.forfallna ? "bad" : n.punkter.length ? "" : "ok"}
            delar={[
              {
                etikett: "Passerat datum",
                varde: n.forfallna,
                ton: n.forfallna ? "bad" : "",
              },
              { etikett: "Inom tid", varde: n.punkter.length - n.forfallna },
            ]}
          />
        </div>
      </section>

      <section className="oversikt-sektion" aria-labelledby="ov-projekt">
        <div className="oversikt-rubrik">
          <h2 id="ov-projekt">Projekt</h2>
          <span className="oversikt-undertext">{state.projekt.length} i portföljen</span>
          <button
            type="button"
            className="btn sec mini oversikt-rubrik-knapp"
            onClick={() => setVisaRedigering((v) => !v)}
            aria-expanded={visaRedigering}
            aria-controls="projektuppgifter"
          >
            <Pencil size={14} aria-hidden="true" />
            {visaRedigering ? "Dölj projektuppgifter" : "Redigera projektuppgifter"}
          </button>
        </div>

        <div id="projektuppgifter">{visaRedigering ? <Projektredigering /> : null}</div>

        <div className="projkort-rutnat">
          {state.projekt.map((p) => (
            <Projektkort key={p.id} p={p} />
          ))}
        </div>
      </section>

      <section className="oversikt-sektion grid g2" aria-label="Leveranser och risker">
        <div className="card">
          <h3>Kommande leveranser och grindar</h3>
          <div className="lead">
            {n.naraLev} inom 45 dagar
            {n.levUtanDatum ? ` · ${n.levUtanDatum} utan bekräftat datum` : ""}
          </div>
          <KommandeTidslinje />
        </div>

        <div className="card">
          <h3>Högsta riskvärden</h3>
          <div className="lead">Sannolikhet × konsekvens, skala 1–5</div>
          <Tabellyta etikett="Högsta riskvärden">
            <table>
              <thead>
                <tr>
                  <th scope="col">RV</th>
                  <th scope="col">Risk</th>
                  <th scope="col">Projekt</th>
                </tr>
              </thead>
              <tbody>
                {toppRisker.map((r) => (
                  <tr key={r.id}>
                    <td data-label="RV">
                      <Riskvarde varde={riskvarde(r)} klass={riskKlass(riskvarde(r))} />
                    </td>
                    <td data-label="Risk">{r.titel}</td>
                    <td data-label="Projekt">
                      <PTag pid={r.projektId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tabellyta>
        </div>
      </section>

      <section className="oversikt-sektion">
        <Andringslogg antal={8} rubrik="Senaste händelser i portföljen" />
      </section>

      <Note>
        <b>Underlag och antaganden.</b> Datum, UR-serier, leverantörer och kontakter för 36037/36038 kommer
        ur byggmötesprotokoll BM7/BM8 (2026-08-17), senaste tidplan och UR-status. Göteborg Skogome och
        Götene är nyligen tillagda i portföljmodellen och saknar ännu underlag — fyll i uppgifter under
        "Redigera projektuppgifter" ovan och i respektive flik.{" "}
        {n.saknarKV.length ? (
          <b>Kontraktsvärde för {n.saknarKV.join(", ")} saknas i underlaget</b>
        ) : null}
        {n.saknarKV.length ? " och markeras som saknat på projektkortet. " : " "}
        Betalplanens datum för M5 (v. 42) är satt till 2026-10-16 som <span className="ant">ANTAGANDE</span>{" "}
        för 36037/36038 — justera mot faktisk fakturaplan. Riskvärdena är min bedömning, inte hämtade ur
        underlaget.
      </Note>
    </div>
  );
}
