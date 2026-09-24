import { useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Card, Pill, Prog, Tabellyta } from "../components/ui/Primitiver.jsx";
import { Falt } from "../components/ui/Falt.jsx";
import { Slideover } from "../components/ui/Slideover.jsx";
import { VECKOFRAGOR } from "../data/veckofragor.js";
import { veckaBesvarade, veckaFlaggor, veckorad } from "../lib/berakningar.js";
import { idag, veckaEtikett, veckaForskjut, veckaNu } from "../lib/datum.js";
import { allvar, ALLVARSNAMN, SVARSORD } from "../lib/veckotriage.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

/* Veckokollen — projektledarens checklista, en vecka i taget.

   Nio frågor ur projektmodellen som kort, så att en hel vecka går att bocka
   av utan att scrolla genom formulär. Varje svar dispatchas direkt; det finns
   ingen sparaknapp.

   Svaren lagras oförändrat som ja/nej/osaker i q1…q9 — VECKOFRAGOR och
   veckaFlaggor är orörda. OK/Varning/Avvikelse är en presentation ovanpå
   dem: knappen bär allvarsgraden som etikett och svarsordet som underrad, så
   att triagen går fort utan att frågan slutar gå att besvara sanningsenligt.

   Fördjupad kommentar vid avvikelse sparas i k1…k9 på samma rad. Det är nya
   fält, men de går genom SATT_VECKORAD som vilket fält som helst — reducern
   behövde inte röras. */

const ANTAL_FRAGOR = VECKOFRAGOR.length;

/* Id-generering på modulnivå. Anropad direkt i komponentkroppen läser
   lintern Date.now() som ett orent anrop under render. */
const nyttId = (prefix) => prefix + Date.now();

function Fragekort({ f, svar, kommentar, onSvara, onOppna }) {
  const grad = svar ? allvar(f, svar) : null;

  return (
    <article className={`veckokort ${grad || ""}`.trim()}>
      <div className="veckokort-fraga">
        <span className="veckokort-nr">{f.n}.</span>
        <span>{f.fraga}</span>
      </div>

      <div className="veckokort-svar" role="group" aria-label={`Svar på fråga ${f.n}`}>
        {f.alt.map((a) => {
          const g = allvar(f, a);
          return (
            <button
              key={a}
              type="button"
              className={g}
              aria-pressed={svar === a}
              onClick={() => onSvara(f.n, a)}
            >
              {ALLVARSNAMN[g]}
              <span className="ord">{SVARSORD[a]}</span>
            </button>
          );
        })}
      </div>

      {svar ? (
        <>
          <div className="veckokort-rad">{f.svar[svar]}</div>
          <div className="veckokort-fot">
            {grad === "ok" ? null : (
              <button type="button" className="btn sec mini" onClick={() => onOppna(f.n)}>
                {kommentar ? "Öppna kommentaren" : "Kommentera och åtgärda"}
              </button>
            )}
            {f.ref ? <span className="ref">{f.ref}</span> : null}
            {kommentar ? <span className="veckokort-kommentar">Kommenterad</span> : null}
          </div>
        </>
      ) : null}
    </article>
  );
}

export function Veckokoll() {
  const { state, dispatch, laggTill } = usePortfolj();
  const { valtProjekt: pid, visaToast, oppnaPost } = useUi();
  const [vecka, setVecka] = useState(veckaNu);
  const [oppenFraga, setOppenFraga] = useState(null);

  const p = state.projekt.find((x) => x.id === pid);
  const rad = veckorad(state, pid, vecka);
  const flaggor = veckaFlaggor(rad);
  const besvarade = veckaBesvarade(rad);
  const nuvarande = vecka === veckaNu();

  const historik = state.veckokoll
    .filter((r) => r.projektId === pid)
    .sort((a, b) => b.vecka.localeCompare(a.vecka))
    .slice(0, 8);

  if (!p) return null;

  /* Reducern skapar raden lazy om den saknas. Datumet följer med varje
     ändring så att historiken visar när veckan faktiskt gicks igenom. */
  const satt = (falt, varde) => {
    dispatch({ type: "SATT_VECKORAD", pid, vecka, falt, varde });
    dispatch({ type: "SATT_VECKORAD", pid, vecka, falt: "datum", varde: idag() });
  };

  // Samma svar igen nollställer — man ska kunna ångra ett felklick.
  const svara = (n, varde) => satt("q" + n, rad?.["q" + n] === varde ? "" : varde);

  const fragan = VECKOFRAGOR.find((f) => f.n === oppenFraga) || null;
  const oppetSvar = fragan ? rad?.["q" + fragan.n] || "" : "";

  const punktFranFraga = (f) => {
    const svar = rad?.["q" + f.n] || "";
    laggTill("punkter", {
      id: nyttId("p"),
      projektId: pid,
      titel: `Veckokoll ${veckaEtikett(vecka)} fråga ${f.n}: ${f.svar[svar] || f.fraga}`,
      agare: hamtaNamn() || "",
      forfaller: "",
      status: "oppen",
    });
    visaToast("Punkten är skapad under Öppna punkter. Sätt förfallodatum där.");
  };

  const storningFranFraga = (f) => {
    const nr = state.storningar.filter((s) => s.projektId === pid).length + 1;
    const id = nyttId("s");
    laggTill("storningar", {
      id,
      projektId: pid,
      nr: "ST" + String(nr).padStart(3, "0"),
      affarsId: "",
      aoNummer: p.nr || "",
      projektNamn: `${p.nr} ${p.namn}`,
      datum: idag(),
      upprattadAv: hamtaNamn() || "",
      projektledare: hamtaNamn() || "",
      projektchef: "",
      ataNummer: "",
      till: "Ingrid Capacity",
      rutaA: `Veckokoll ${veckaEtikett(vecka)}: ${f.fraga}`,
      rutaB: "",
      rutaC: "",
      rutaD: rad?.["k" + f.n] || "",
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
    <>
      <Projektvaljare />

      <Card>
        <div className="veckorad">
          <button
            type="button"
            className="btn sec mini"
            onClick={() => setVecka(veckaForskjut(vecka, -1))}
          >
            ‹ Föregående
          </button>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h3>
              Veckochecklistan — {veckaEtikett(vecka)}
              {nuvarande ? " (denna vecka)" : ""}
            </h3>
            <div className="lead" style={{ margin: 0 }}>
              {p.nr} {p.namn} · {besvarade}/{ANTAL_FRAGOR} besvarade
              {flaggor.length ? (
                <>
                  {" · "}
                  <b style={{ color: "var(--rod)" }}>{flaggor.length} kräver åtgärd</b>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            className="btn sec mini"
            onClick={() => setVecka(veckaForskjut(vecka, 1))}
          >
            Nästa ›
          </button>
          {!nuvarande ? (
            <button type="button" className="btn mini" onClick={() => setVecka(veckaNu())}>
              Till denna vecka
            </button>
          ) : null}
        </div>

        <Prog
          procent={(besvarade / ANTAL_FRAGOR) * 100}
          klart={besvarade === ANTAL_FRAGOR}
          etikett={`${besvarade} av ${ANTAL_FRAGOR} frågor besvarade`}
        />

        <div className="lead" style={{ margin: "8px 0 0" }}>
          Checklistan ska gås igenom varje vecka för varje kontrakt. Reagerar du på någon punkt har du
          som projektledare skyldighet att vidta åtgärd.
        </div>
      </Card>

      <div
        className="veckokort-rutnat"
        role="group"
        aria-label={`Veckochecklistan ${veckaEtikett(vecka)}`}
      >
        {VECKOFRAGOR.map((f) => (
          <Fragekort
            key={f.n}
            f={f}
            svar={rad?.["q" + f.n] || ""}
            kommentar={rad?.["k" + f.n] || ""}
            onSvara={svara}
            onOppna={setOppenFraga}
          />
        ))}
      </div>

      <Card klass="mt-4">
        <div className="f">
          <label htmlFor="vecka-anteckning">Anteckning för veckan</label>
          <textarea
            id="vecka-anteckning"
            value={rad?.anteckning || ""}
            placeholder="Egna noteringar, avstämningar, vem du pratat med."
            onChange={(e) => satt("anteckning", e.target.value)}
          />
        </div>
        <div className="rowbtns">
          <button type="button" className="btn" onClick={() => satt("klar", !rad?.klar)}>
            {rad?.klar ? "Öppna veckan igen" : "Markera veckan som genomgången"}
          </button>
        </div>
      </Card>

      <Card klass="mt-4">
        <h3>Historik</h3>
        <div className="lead">Senaste genomgångarna för {p.nr || p.namn}</div>
        {historik.length ? (
          <Tabellyta etikett="Veckokollens historik">
            <table>
              <thead>
                <tr>
                  <th scope="col">Vecka</th>
                  <th scope="col">Genomgången</th>
                  <th scope="col" className="num">
                    Besvarade
                  </th>
                  <th scope="col" className="num">
                    Åtgärder
                  </th>
                  <th scope="col" />
                </tr>
              </thead>
              <tbody>
                {historik.map((r) => (
                  <tr key={r.id || r.vecka}>
                    <td data-label="Vecka">
                      <b>{veckaEtikett(r.vecka)}</b>
                    </td>
                    <td data-label="Genomgången">
                      <Pill status={r.klar ? "klarmarkerad" : "oppen"} />
                      {r.datum ? <span className="veckodatum">{r.datum}</span> : null}
                    </td>
                    <td data-label="Besvarade" className="num">
                      {veckaBesvarade(r)}/{ANTAL_FRAGOR}
                    </td>
                    <td data-label="Åtgärder" className="num">
                      {veckaFlaggor(r).length || "—"}
                    </td>
                    <td>
                      <button type="button" className="btn sec mini" onClick={() => setVecka(r.vecka)}>
                        Öppna
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tabellyta>
        ) : (
          <p className="lead">Ingen vecka registrerad ännu.</p>
        )}
      </Card>

      {fragan ? (
        <Slideover
          titel={`Fråga ${fragan.n} — ${ALLVARSNAMN[allvar(fragan, oppetSvar)] || "Obesvarad"}`}
          etikett={`Fråga ${fragan.n} i veckokollen`}
          onStang={() => setOppenFraga(null)}
        >
          <p className="veckokort-fraga" style={{ margin: 0 }}>
            {fragan.fraga}
          </p>

          {oppetSvar ? <div className="note">{fragan.svar[oppetSvar]}</div> : null}
          {fragan.ref ? <span className="ref">{fragan.ref}</span> : null}

          <div className="f">
            <label htmlFor={`vecka-kommentar-${fragan.n}`}>Kommentar till avvikelsen</label>
            {/* Lokalt utkast som sparas vid blur, Ctrl+Enter eller när panelen
                stängs — inte per tangenttryck. Förut gick två dispatchar per
                bokstav (värde + datum), och hela appen renderades om mitt i
                skrivandet. key per fråga ger ett nytt utkast när man byter fråga. */}
            <Falt
              key={fragan.n}
              flerrad
              id={`vecka-kommentar-${fragan.n}`}
              varde={rad?.["k" + fragan.n] || ""}
              etikett="Kommentar till avvikelsen"
              placeholder="Vad har hänt, vad har du gjort och vad behöver följas upp?"
              onCommit={(v) => satt("k" + fragan.n, v)}
            />
          </div>

          <div className="rowbtns">
            <button type="button" className="btn" onClick={() => punktFranFraga(fragan)}>
              Skapa öppen punkt
            </button>
            {[2, 5].includes(fragan.n) ? (
              <button
                type="button"
                className="btn sec"
                onClick={() => storningFranFraga(fragan)}
              >
                Skapa underrättelse om störning
              </button>
            ) : null}
          </div>
        </Slideover>
      ) : null}
    </>
  );
}
