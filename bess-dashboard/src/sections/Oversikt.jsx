import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Kpi, Note, Riskvarde, Tabellyta } from "../components/ui/Primitiver.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import {
  BessHero,
  Flaggpanel,
  GanttRad,
  KommandeTidslinje,
  Matarrad,
  SiteStatusBar,
} from "../components/oversikt/Widgets.jsx";
import { Projektkort, Projektredigering } from "../components/oversikt/Projekt.jsx";
import { Andringslogg } from "../components/ui/Andringslogg.jsx";
import { dagarTill } from "../lib/datum.js";
import { veckaEtikett, veckaNu } from "../lib/datum.js";
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

export function Oversikt() {
  const { state } = usePortfolj();
  const { valtProjekt, visa } = useUi();
  const [visaRedigering, setVisaRedigering] = useState(false);

  const n = useMemo(() => {
    const dagarPerProjekt = state.projekt.map((p) => ({ p, d: dagarTill(p.fardigstallande) }));
    const kandaDagar = dagarPerProjekt.filter((x) => x.d !== null).map((x) => x.d);
    const risker = oppnaRisker(state);
    const punkter = oppnaPunkter(state);
    const v = veckaNu();

    return {
      naerm: kandaDagar.length ? Math.min(...kandaDagar) : null,
      dagarHint: dagarPerProjekt
        .map((x) => `${x.p.nr || x.p.ort} ${x.d === null ? "—" : x.d + " d"}`)
        .join(" · "),
      risker,
      hogRisk: risker.filter((r) => riskMatrisFarg(r.sannolikhet, r.konsekvens) === "rod").length,
      urOppna: state.ur.filter((u) => u.status !== "stangd").length,
      urHint:
        state.projekt
          .map((p) => `${p.nr || p.ort} ${state.ur.filter((u) => u.projektId === p.id).length}`)
          .join(" · ") + " i serien",
      punkter,
      forfallna: punkter.filter((p) => p.forfaller && dagarTill(p.forfaller) < 0).length,
      naraLev: state.leveranser.filter((l) => l.datum && dagarTill(l.datum) >= 0 && dagarTill(l.datum) <= 45).length,
      utanDatum: state.leveranser.filter((l) => !l.datum).length,
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
      saknarKV: state.projekt.filter((p) => p.kontraktsvarde === null).map((p) => p.nr || p.ort),
    };
  }, [state]);

  const toppRisker = useMemo(
    () => [...n.risker].sort((a, b) => riskvarde(b) - riskvarde(a)).slice(0, 5),
    [n.risker]
  );

  return (
    <>
      <Flaggpanel />

      {n.kvarVecka.length ? (
        <Note style={{ margin: "0 0 16px" }}>
          <b>Veckochecklistan {veckaEtikett(n.vecka)} är inte genomgången</b> för{" "}
          {n.kvarVecka.map((p) => `${p.nr || p.ort} ${p.namn}`).join(" och ")}. Checklistan ska gås igenom
          varje vecka för varje kontrakt.
          <div className="rowbtns">
            <button type="button" className="btn mini" onClick={() => visa("vecka")}>
              Öppna veckokollen
            </button>
          </div>
        </Note>
      ) : null}

      {n.veckoflagg ? (
        <Note niva="bad" style={{ margin: "0 0 16px" }}>
          <b style={{ color: "var(--bad-ink)" }}>
            {n.veckoflagg} punkter i veckans checklista kräver åtgärd.
          </b>{" "}
          Skapa öppna punkter eller underrättelse om störning direkt i veckokollen.
        </Note>
      ) : null}

      {n.senaSvar.length ? (
        <Note niva="bad" style={{ margin: "0 0 16px" }}>
          <b style={{ color: "var(--bad-ink)" }}>
            {n.senaSvar.length} underrättelse{n.senaSvar.length > 1 ? "r" : ""} om störning har passerat
            begärt svarsdatum.
          </b>{" "}
          Ta upp förlängning av tidplanen på nästa byggmöte och se till att det förs till protokollet.
        </Note>
      ) : null}

      {n.ofullstDagbok.length ? (
        <Note style={{ margin: "0 0 16px" }}>
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

      {state.projekt.map((p) => (
        <SiteStatusBar key={p.id} pid={p.id} />
      ))}

      <BessHero />

      <div style={{ margin: "16px 0" }}>
        <Matarrad pid={valtProjekt} />
      </div>

      <GanttRad />

      <div className="grid g4" style={{ marginBottom: 20 }}>
        <Kpi
          label="Dagar till färdigställande"
          varde={n.naerm === null ? "—" : n.naerm}
          hint={n.dagarHint}
          klass={n.naerm !== null && n.naerm < 60 ? "warn" : ""}
        />
        <Kpi
          label="Öppna risker"
          varde={n.risker.length}
          hint={`${n.hogRisk} röda enligt riskmatrisen`}
          klass={n.hogRisk ? "bad" : ""}
        />
        <Kpi label="Öppna UR/ÄTA" varde={n.urOppna} hint={n.urHint} />
        <Kpi
          label="Öppna punkter"
          varde={n.punkter.length}
          hint={n.forfallna ? `${n.forfallna} har passerat datum` : "inga passerade datum"}
          klass={n.forfallna ? "bad" : ""}
        />
      </div>

      <div className="rowbtns" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn sec mini"
          onClick={() => setVisaRedigering((v) => !v)}
          aria-expanded={visaRedigering}
          aria-controls="projektuppgifter"
        >
          {visaRedigering ? "Dölj projektuppgifter" : "Redigera projektuppgifter"}
        </button>
      </div>

      <div id="projektuppgifter">{visaRedigering ? <Projektredigering /> : null}</div>

      <div className="grid g2" style={{ marginBottom: 20 }}>
        {state.projekt.map((p) => (
          <Projektkort key={p.id} p={p} />
        ))}
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>Kommande leveranser och grindar</h3>
          <div className="lead">
            {n.naraLev} inom 45 dagar
            {n.utanDatum ? ` · ${n.utanDatum} utan bekräftat datum` : ""}
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
      </div>

      <div style={{ marginTop: 20 }}>
        <Andringslogg antal={8} rubrik="Senaste händelser i portföljen" />
      </div>

      <Note>
        <b>Underlag och antaganden.</b> Datum, UR-serier, leverantörer och kontakter för 36037/36038 kommer
        ur byggmötesprotokoll BM7/BM8 (2026-08-17), senaste tidplan och UR-status. Göteborg Skogome och
        Götene är nyligen tillagda i portföljmodellen och saknar ännu underlag — fyll i uppgifter under
        "Redigera projektuppgifter" ovan och i respektive flik.{" "}
        {n.saknarKV.length ? (
          <b>Kontraktsvärde för {n.saknarKV.join(", ")} saknas i underlaget</b>
        ) : null}
        {n.saknarKV.length ? ' och visas som "—". ' : " "}
        Betalplanens datum för M5 (v. 42) är satt till 2026-10-16 som <span className="ant">ANTAGANDE</span>{" "}
        för 36037/36038 — justera mot faktisk fakturaplan. Riskvärdena är min bedömning, inte hämtade ur
        underlaget.
      </Note>
    </>
  );
}
