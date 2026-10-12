import { useState } from "react";
import { ChevronDown, CircleCheck, CircleHelp, TriangleAlert } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Card, Meter, StatusBadge, TableRegion } from "../components/ds/index.js";
import { Falt } from "../components/ui/Falt.jsx";
import { VeckoProjektflikar } from "../components/veckokoll/VeckoProjektflikar.jsx";
import { BessStatusHeader } from "../components/site/BessStatusHeader.jsx";
import { VECKOFRAGOR } from "../data/veckofragor.js";
import { nyAtaPost } from "../lib/nyaPoster.js";
import { ataPaverkan, bessStadierForProjekt, effektText, parkKomponenter, veckaSiffror } from "../lib/veckoOversikt.js";
import { parkSumma, siteObjekt } from "../lib/site.js";
import { veckaBesvarade, veckaFlaggor, veckorad } from "../lib/berakningar.js";
import { idag, veckaEtikett, veckaForskjut, veckaNu } from "../lib/datum.js";
import { allvar, ALLVARSNAMN, SVARSORD } from "../lib/veckotriage.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";
import { registerStatus } from "../lib/status.js";

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
   behövde inte röras.

   Vyn står på designsystemet: projektflikar och BESS-översikten överst, veckan som Card med
   veckoväxlaren i huvudet och mätare, frågekorten i Cards form, anteckning och historik som kort.

   Frågekorten är toggle-grupper med ikon (OK, Varning, Avvikelse). Väljs Varning eller Avvikelse får
   kortet en färgad vänsterkant och ett snabbfält fälls ut under det: noteringen och knapparna för
   öppen punkt, ÄTA och störning. Det som förut låg i en sidopanel finns nu direkt på kortet. */

const ANTAL_FRAGOR = VECKOFRAGOR.length;

/* Id-generering på modulnivå. Anropad direkt i komponentkroppen läser
   lintern Date.now() som ett orent anrop under render. */
const nyttId = (prefix) => prefix + Date.now();

const IKON = { ok: CircleCheck, varning: CircleHelp, avvikelse: TriangleAlert };

function Fragekort({ f, svar, kommentar, utfalld, onSvara, onVaxla, onKommentar, onPunkt, onAta, onStorning }) {
  const grad = svar ? allvar(f, svar) : null;
  const behover = grad === "varning" || grad === "avvikelse";
  const snabbId = `veckosnabb-${f.n}`;

  return (
    <article className={`veckokort ${grad || ""}`.trim()}>
      <div className="veckokort-fraga">
        <span className="veckokort-nr">{f.n}.</span>
        <span>{f.fraga}</span>
      </div>

      <div className="veckokort-svar" role="group" aria-label={`Svar på fråga ${f.n}`}>
        {f.alt.map((a) => {
          const g = allvar(f, a);
          const Ikon = IKON[g];
          return (
            <button key={a} type="button" className={g} aria-pressed={svar === a} onClick={() => onSvara(f.n, a)}>
              <Ikon size={18} aria-hidden="true" />
              <span>{ALLVARSNAMN[g]}</span>
              <span className="ord">{SVARSORD[a]}</span>
            </button>
          );
        })}
      </div>

      {svar ? (
        <>
          <div className="veckokort-rad">{f.svar[svar]}</div>
          <div className="veckokort-fot">
            {behover ? (
              <button type="button" className="btn sec mini" aria-expanded={utfalld} aria-controls={snabbId} onClick={() => onVaxla(f.n)}>
                <ChevronDown size={14} aria-hidden="true" className={`transition-transform duration-200 motion-reduce:transition-none ${utfalld ? "rotate-180" : ""}`} />
                {utfalld ? "Dölj åtgärder" : "Visa åtgärder"}
              </button>
            ) : null}
            {f.ref ? <span className="ref">{f.ref}</span> : null}
            {kommentar ? <span className="veckokort-kommentar">Kommenterad</span> : null}
          </div>

          {behover && utfalld ? (
            <div id={snabbId} className="veckokort-snabb" role="group" aria-label={`Åtgärder för fråga ${f.n}`}>
              <div className="f mb-0">
                <label htmlFor={`vecka-kommentar-${f.n}`}>Kommentar till {grad === "avvikelse" ? "avvikelsen" : "varningen"}</label>
                {/* Lokalt utkast som sparas vid blur, Ctrl+Enter eller när fältet försvinner — inte per
                    tangenttryck. Förut gick två dispatchar per bokstav (värde + datum), och hela appen
                    renderades om mitt i skrivandet. */}
                <Falt
                  flerrad
                  id={`vecka-kommentar-${f.n}`}
                  varde={kommentar}
                  etikett={`Kommentar till ${grad === "avvikelse" ? "avvikelsen" : "varningen"}`}
                  placeholder="Vad har hänt, vad har du gjort och vad behöver följas upp?"
                  onCommit={(v) => onKommentar(f.n, v)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn mini" onClick={() => onPunkt(f)}>
                  Skapa öppen punkt
                </button>
                <button type="button" className="btn sec mini" onClick={() => onAta(f)}>
                  Skapa ÄTA
                </button>
                {[2, 5].includes(f.n) ? (
                  <button type="button" className="btn sec mini" onClick={() => onStorning(f)}>
                    Skapa underrättelse om störning
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

export function Veckokoll() {
  const { state, dispatch, laggTill } = usePortfolj();
  const { valtProjekt: pid, setValtProjekt, visa, visaToast, oppnaPost, visaISite } = useUi();
  const [vecka, setVecka] = useState(veckaNu);
  // Kort med varning eller avvikelse är utfällda som standard; här ligger de som användaren dolt.
  const [dolda, setDolda] = useState({});

  const p = state.projekt.find((x) => x.id === pid);
  const rad = veckorad(state, pid, vecka);
  const flaggor = veckaFlaggor(rad);
  const besvarade = veckaBesvarade(rad);
  const nuvarande = vecka === veckaNu();

  const siffror = veckaSiffror(rad);
  const objekt = siteObjekt(state, pid);
  const komponenter = parkKomponenter(objekt);

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

  const vaxlaSnabb = (n) => setDolda((d) => ({ ...d, [n]: !d[n] }));

  const ataFranFraga = (f) => {
    const post = nyAtaPost(state, pid, {
      benamning: `Veckokoll ${veckaEtikett(vecka)} fråga ${f.n}: ${f.fraga}`.slice(0, 300),
      ansvarig: hamtaNamn() || "",
    });
    laggTill("ur", post);
    visaToast("ÄTA-posten är skapad. Komplettera den under ÄTA och hinder.");
    oppnaPost("ata", post.id);
  };

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
      <VeckoProjektflikar projekt={state.projekt} valtId={pid} vecka={vecka} state={state} onVal={setValtProjekt} />

      <BessStatusHeader
        projekt={p}
        effekt={effektText(p, parkSumma(objekt))}
        siffror={siffror}
        ata={ataPaverkan(state, pid)}
        stadier={bessStadierForProjekt(state, pid)}
        komponenter={komponenter}
        ur={state.ur}
        onVisaI3D={visaISite}
        onOppnaSiten={() => visa("site")}
        onOppnaAta={() => visa("ata")}
        onOppnaTidplan={() => visa("tidplan")}
      />

      <div className="flex flex-col gap-4 lg:gap-6">
        <Card
          id="vk-vecka"
          title={`Veckochecklistan — ${veckaEtikett(vecka)}${nuvarande ? " (denna vecka)" : ""}`}
          subtitle={`${p.nr} ${p.namn} · ${besvarade}/${ANTAL_FRAGOR} besvarade`}
          badge={
            flaggor.length ? (
              <StatusBadge ton="bad" label={`${flaggor.length} kräver åtgärd`} />
            ) : besvarade === ANTAL_FRAGOR ? (
              <StatusBadge ton="ok" label="Alla besvarade" />
            ) : null
          }
          action={
            <>
              <button type="button" className="btn sec mini" onClick={() => setVecka(veckaForskjut(vecka, -1))}>
                ‹ Föregående
              </button>
              <button type="button" className="btn sec mini" onClick={() => setVecka(veckaForskjut(vecka, 1))}>
                Nästa ›
              </button>
              {!nuvarande ? (
                <button type="button" className="btn mini" onClick={() => setVecka(veckaNu())}>
                  Till denna vecka
                </button>
              ) : null}
            </>
          }
        >
          <Meter
            value={besvarade}
            max={ANTAL_FRAGOR}
            label={`${besvarade} av ${ANTAL_FRAGOR} frågor besvarade`}
          />
          <p className="m-0 text-[13px] leading-snug text-ink-soft">
            Checklistan ska gås igenom varje vecka för varje kontrakt. Reagerar du på någon punkt har du som
            projektledare skyldighet att vidta åtgärd.
          </p>
        </Card>

        <div className="veckokort-rutnat" role="group" aria-label={`Veckochecklistan ${veckaEtikett(vecka)}`}>
          {VECKOFRAGOR.map((f) => (
            <Fragekort
              key={f.n}
              f={f}
              svar={rad?.["q" + f.n] || ""}
              kommentar={rad?.["k" + f.n] || ""}
              utfalld={!dolda[f.n]}
              onSvara={svara}
              onVaxla={vaxlaSnabb}
              onKommentar={(n, v) => satt("k" + n, v)}
              onPunkt={punktFranFraga}
              onAta={ataFranFraga}
              onStorning={storningFranFraga}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Card
            id="vk-genomgang"
            title="Veckans genomgång"
            badge={rad?.klar ? <StatusBadge ton="ok" label="Genomgången" /> : null}
          >
            <div className="f mb-0">
              <label htmlFor="vecka-anteckning">Anteckning för veckan</label>
              <textarea
                id="vecka-anteckning"
                value={rad?.anteckning || ""}
                placeholder="Egna noteringar, avstämningar, vem du pratat med."
                onChange={(e) => satt("anteckning", e.target.value)}
              />
            </div>
            <div>
              <button type="button" className="btn" onClick={() => satt("klar", !rad?.klar)}>
                {rad?.klar ? "Öppna veckan igen" : "Markera veckan som genomgången"}
              </button>
            </div>
          </Card>

          <Card id="vk-historik" title="Historik" subtitle={`Senaste genomgångarna för ${p.nr || p.namn}`}>
            {historik.length ? (
              <TableRegion label="Veckokollens historik">
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
                          <StatusBadge {...registerStatus(r.klar ? "klarmarkerad" : "oppen")} />
                          {r.datum ? <span className="ml-1.5 whitespace-nowrap text-xs text-ink-soft">{r.datum}</span> : null}
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
              </TableRegion>
            ) : (
              <p className="m-0 text-[13px] text-ink-soft">Ingen vecka registrerad ännu.</p>
            )}
          </Card>
        </div>
      </div>

    </>
  );
}
