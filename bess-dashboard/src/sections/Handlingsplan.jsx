import { useState } from "react";
import { Compass, Flag, Plus, Route, Target, Trophy } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Card, Prog } from "../components/ui/Primitiver.jsx";
import { DatumFalt, Falt } from "../components/ui/Falt.jsx";
import { Slideover } from "../components/ui/Slideover.jsx";
import { HP_STATUS } from "../data/konstanter.js";
import { handlingsplan, hpAtgarder, hpForsenad, hpSammanfattning } from "../lib/berakningar.js";
import { idag } from "../lib/datum.js";

/* Handlingsplan — Vision to Action per projekt.

   Kedjan läses uppifrån och ned: projektets mål, varför det är viktigt
   (drivkraft) och hur vi tar oss dit (strategi), de konkreta åtgärderna med
   resurser, status och datum, och till sist det slutresultat allt ska leda
   fram till.

   Planhuvudet sås tomt per projekt i efterInlasning — exemplen står som
   platshållare, så att inget påhittat hamnar i ett riktigt projekts plan.
   Textfälten skriver vid blur (Falt), inte per tangenttryck, så att synken
   inte går igång på varje bokstav. Statusbyten går via uppdStatus och hamnar
   i ändringsloggen; flaggmotorn larmar när en åtgärd passerat sitt datum. */

const STATUSKORT = { ejpaborjad: "Ej påbörjad", pagaende: "Pågår", klar: "Klar" };

/* Id-generering på modulnivå — Date.now() direkt i komponentkroppen läses
   av lintern som ett orent anrop under render. */
const nyttId = () => "hpa" + Date.now() + Math.floor(Math.random() * 1000);

function Statusval({ a, onSatt, etikett }) {
  return (
    <div className="hp-status" role="group" aria-label={etikett}>
      {HP_STATUS.map(([v]) => (
        <button
          key={v}
          type="button"
          className={v}
          aria-pressed={(a.status || "ejpaborjad") === v}
          onClick={() => onSatt(v)}
        >
          {STATUSKORT[v]}
        </button>
      ))}
    </div>
  );
}

/* Ett steg i kedjan: rubrik med ikon och ett textfält som ser ut som text
   tills man klickar i det. */
function Led({ klass, ikon: Ikon, rubrik, fraga, varde, platshallare, onCommit, stor = false }) {
  const id = `hp-${klass}`;
  return (
    <section className={`hp-led ${klass}`} aria-labelledby={`${id}-rubrik`}>
      <div className="hp-led-topp">
        <span className="hp-led-ikon" aria-hidden="true">
          <Ikon size={16} />
        </span>
        <h2 id={`${id}-rubrik`}>{rubrik}</h2>
        {fraga ? <span className="hp-led-fraga">{fraga}</span> : null}
      </div>
      <Falt
        flerrad
        className={`hp-led-text${stor ? " stor" : ""}`}
        varde={varde}
        etikett={rubrik}
        placeholder={platshallare}
        onCommit={onCommit}
      />
    </section>
  );
}

function Atgardskort({ a, steg, onSatt, onOppna }) {
  const sen = hpForsenad(a);
  return (
    <article className={`hp-atgard ${a.status || "ejpaborjad"}${sen ? " sen" : ""}`}>
      <div className="hp-atgard-topp">
        <span className="hp-steg">Steg {steg}</span>
        {sen ? <span className="hp-sen">Passerat datum</span> : null}
      </div>

      <h3 className="hp-atgard-titel">
        <button type="button" onClick={onOppna}>
          {a.titel || <span className="hp-tom">Namnlös åtgärd</span>}
          <span className="sr-only"> — öppna detaljer</span>
        </button>
      </h3>

      <dl className="hp-atgard-fakta">
        <div>
          <dt>Resurser</dt>
          <dd>{a.resurser || <span className="hp-tom">Ej tilldelat</span>}</dd>
        </div>
        <div>
          <dt>Datum</dt>
          <dd className={sen ? "sen" : ""}>{a.datum || "—"}</dd>
        </div>
        {a.resultat ? (
          <div className="hel">
            <dt>Förväntat resultat</dt>
            <dd>{a.resultat}</dd>
          </div>
        ) : null}
      </dl>

      <Statusval a={a} onSatt={onSatt} etikett={`Status för ${a.titel || "åtgärden"}`} />
    </article>
  );
}

export function Handlingsplan() {
  const { state, uppd, uppdStatus, laggTill, taBort } = usePortfolj();
  const { valtProjekt: pid, bekrafta, visaToast } = useUi();
  const [oppenId, setOppenId] = useState(null);

  const p = state.projekt.find((x) => x.id === pid);
  if (!p) return null;

  const plan = handlingsplan(state, pid);
  const atgarder = hpAtgarder(state, pid);
  const s = hpSammanfattning(state, pid);
  const oppen = atgarder.find((a) => a.id === oppenId) || null;
  const oppenSteg = oppen ? atgarder.indexOf(oppen) + 1 : 0;

  const sattPlan = (falt) => (v) => plan && uppd("handlingsplaner", plan.id, falt, v);
  const sattStatus = (id, v) => uppdStatus("hpAtgarder", id, "status", v);

  const nyAtgard = () => {
    const id = nyttId();
    laggTill("hpAtgarder", {
      id,
      projektId: pid,
      titel: "",
      resurser: "",
      status: "ejpaborjad",
      datum: idag(),
      resultat: "",
      kommentar: "",
    });
    setOppenId(id);
  };

  const taBortOppen = async () => {
    const ja = await bekrafta("Åtgärden tas bort ur handlingsplanen. Det går inte att ångra.", {
      titel: "Ta bort åtgärden?",
      ok: "Ta bort",
      fara: true,
    });
    if (!ja) return;
    taBort("hpAtgarder", oppen.id);
    setOppenId(null);
    visaToast("Åtgärden borttagen", "warn");
  };

  const namn = (p.nr ? p.nr + " " : "") + p.namn;

  return (
    <>
      <Projektvaljare />

      <Card klass="hp-huvud">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <span className="hp-eyebrow">Vision to Action</span>
            <h3>Handlingsplan — {namn}</h3>
            <div className="lead" style={{ margin: "4px 0 0" }}>
              {s.antal
                ? `${s.klara} av ${s.antal} åtgärder klara · ${s.pagaende} pågår` +
                  (s.forsenade ? ` · ${s.forsenade} har passerat datum` : "")
                : "Inga åtgärder ännu — börja med målet och lägg sedan till åtgärder."}
            </div>
          </div>
          <div className="kortverktyg">
            <button type="button" className="btn mini hp-ny" onClick={nyAtgard}>
              <Plus size={15} aria-hidden="true" />
              Lägg till åtgärd
            </button>
          </div>
        </div>
        {s.antal ? (
          <div style={{ marginTop: 14 }}>
            <Prog procent={s.proc} klart={s.proc === 100} etikett={`${s.klara} av ${s.antal} åtgärder klara`} />
          </div>
        ) : null}
      </Card>

      <div className="hp-kedja">
        <Led
          klass="mal"
          ikon={Target}
          rubrik="Mål"
          varde={plan?.mal}
          stor
          platshallare={`t.ex. Färdigställa ${p.namn} i tid och enligt ABT 06`}
          onCommit={sattPlan("mal")}
        />

        <div className="hp-pil" aria-hidden="true" />

        <div className="hp-par">
          <Led
            klass="drivkraft"
            ikon={Compass}
            rubrik="Drivkraft"
            fraga="Varför gör vi detta?"
            varde={plan?.drivkraft}
            platshallare="t.ex. Säkra leverans av BESS och godkänd M6 utan vitesrisk"
            onCommit={sattPlan("drivkraft")}
          />
          <Led
            klass="strategi"
            ikon={Route}
            rubrik="Strategi"
            fraga="Hur når vi dit?"
            varde={plan?.strategi}
            platshallare="t.ex. Strikt uppföljning av ÄTA, skyddsronder och veckokoll"
            onCommit={sattPlan("strategi")}
          />
        </div>

        <div className="hp-pil" aria-hidden="true" />

        <section className="hp-atgarder" aria-labelledby="hp-atgarder-rubrik">
          <div className="hp-led-topp">
            <span className="hp-led-ikon" aria-hidden="true">
              <Flag size={16} />
            </span>
            <h2 id="hp-atgarder-rubrik">Åtgärder</h2>
            <span className="hp-led-fraga">
              {s.antal ? `${s.antal} st · ${s.proc} % klart` : "Vad gör vi, med vilka resurser och när?"}
            </span>
          </div>

          {atgarder.length ? (
            <div className="hp-rutnat">
              {atgarder.map((a, i) => (
                <Atgardskort
                  key={a.id}
                  a={a}
                  steg={i + 1}
                  onSatt={(v) => sattStatus(a.id, v)}
                  onOppna={() => setOppenId(a.id)}
                />
              ))}
              <button type="button" className="hp-ny-kort" onClick={nyAtgard}>
                <Plus size={18} aria-hidden="true" />
                Lägg till åtgärd
              </button>
            </div>
          ) : (
            <div className="hp-tomt">
              <p>
                Bryt ned strategin i konkreta åtgärder — till exempel <i>Slutföra cold commissioning</i>,{" "}
                <i>Skicka underrättelse om ÄTA</i> eller <i>Genomföra skyddsrond</i>.
              </p>
              <button type="button" className="btn mini" onClick={nyAtgard}>
                <Plus size={15} aria-hidden="true" />
                Lägg till första åtgärden
              </button>
            </div>
          )}
        </section>

        <div className="hp-pil" aria-hidden="true" />

        <Led
          klass="resultat"
          ikon={Trophy}
          rubrik="Förväntat slutresultat"
          varde={plan?.slutresultat}
          stor
          platshallare="t.ex. Driftsatt anläggning med 100 % godkänd slutdokumentation och noll öppna ÄTA-tvister"
          onCommit={sattPlan("slutresultat")}
        />
      </div>

      {oppen ? (
        <Slideover
          key={oppen.id}
          titel={`Steg ${oppenSteg} — ${oppen.titel || "Ny åtgärd"}`}
          etikett={`Detaljer för steg ${oppenSteg}`}
          onStang={() => setOppenId(null)}
        >
          <div className="f">
            <label htmlFor={`hpa-titel-${oppen.id}`}>Åtgärd</label>
            <Falt
              id={`hpa-titel-${oppen.id}`}
              varde={oppen.titel}
              etikett="Åtgärd"
              placeholder="Vad ska göras?"
              onCommit={(v) => uppd("hpAtgarder", oppen.id, "titel", v)}
            />
          </div>

          <div className="f">
            <span className="faltrubrik">Status</span>
            <Statusval a={oppen} onSatt={(v) => sattStatus(oppen.id, v)} etikett="Status i panelen" />
          </div>

          <div className="f">
            <label htmlFor={`hpa-resurser-${oppen.id}`}>Resurser</label>
            <Falt
              id={`hpa-resurser-${oppen.id}`}
              varde={oppen.resurser}
              etikett="Resurser"
              placeholder="t.ex. BAS-U, elinstallatör, projektledare"
              onCommit={(v) => uppd("hpAtgarder", oppen.id, "resurser", v)}
            />
          </div>

          <div className="f">
            <label htmlFor={`hpa-datum-${oppen.id}`}>Datum</label>
            <DatumFalt
              id={`hpa-datum-${oppen.id}`}
              varde={oppen.datum}
              etikett="Datum"
              onCommit={(v) => uppd("hpAtgarder", oppen.id, "datum", v)}
            />
          </div>

          <div className="f">
            <label htmlFor={`hpa-resultat-${oppen.id}`}>Förväntat resultat</label>
            <Falt
              id={`hpa-resultat-${oppen.id}`}
              varde={oppen.resultat}
              etikett="Förväntat resultat"
              placeholder="t.ex. Godkänt protokoll"
              onCommit={(v) => uppd("hpAtgarder", oppen.id, "resultat", v)}
            />
          </div>

          <div className="f">
            <label htmlFor={`hpa-kommentar-${oppen.id}`}>Kommentar</label>
            <Falt
              id={`hpa-kommentar-${oppen.id}`}
              flerrad
              varde={oppen.kommentar}
              etikett="Kommentar"
              placeholder="Beroenden, vem som har bollen, vad som hänt."
              onCommit={(v) => uppd("hpAtgarder", oppen.id, "kommentar", v)}
            />
          </div>

          <div className="rowbtns">
            <button type="button" className="btn sec" onClick={taBortOppen}>
              Ta bort åtgärden
            </button>
          </div>
        </Slideover>
      ) : null}
    </>
  );
}
