import { useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, CheckList, Meter, Overline, StatusBadge } from "../ds/index.js";
import { DatumFalt, Falt } from "../ui/Falt.jsx";
import { Slideover } from "../ui/Slideover.jsx";
import { Markeringar } from "../epc/Delar.jsx";
import { APD_EPC, APD_OMRADEN } from "../../data/apd.js";
import { PUNKT_FOR_ID } from "../../data/bessChecklistData.ts";
import { apdLage, nastaRevision } from "../../lib/apd.js";
import { punktlage } from "../../lib/epc.js";
import { idag } from "../../lib/datum.js";

/* APD-plan och arbetsplatstavla — HSEQ-vyns kort för etableringen (G5).

   Kortet är underlaget bakom två punkter i EPC-checklistan: hållpunkt 5.19
   (APD-planen godkänd av beställaren) och 5.20 (tavlan komplett). Punkterna
   bockas fortfarande i checklistan — kortet visar när de är redo och har en
   knapp som gör det, så att det finns ett ställe där grinden godkänns.

   Planens 27 kontrollpunkter öppnas i en slide-over, som skyddsronden.
   Tavlan står direkt i kortet eftersom den är kort och ska ses ofta: ett
   anslag som blivit inaktuellt (ny rond, ny AMP, ny APD-revision) syns här. */

const TAVLA_TON = { uppsatt: "ok", inaktuell: "warn", saknas: "neutral" };
const TAVLA_TEXT = { uppsatt: "Uppsatt", inaktuell: "Byt ut", saknas: "Saknas" };

const EPC_TEXT = { klar: "Klar", ejaktuell: "Ej aktuell", oppen: "Öppen" };
const EPC_TON = { klar: "ok", ejaktuell: "neutral", oppen: "warn" };

const medMarkering = (p) => (
  <>
    {p.text} <Markeringar badges={p.badges} />
  </>
);

function ApdPanel({ lage, onStang, onPunkt }) {
  const punkter = lage.rad.punkter || {};
  return (
    <Slideover titel="APD-plan — kontrollpunkter" etikett="APD-plan — kontrollpunkter" onStang={onStang}>
      <p className="m-0 text-[13px] text-ink-soft">
        Bocka av det som finns med på ritningen. Planen godkänns av beställaren innan etablering — det är
        hållpunkt {APD_EPC.plan} i Bygga batteripark.
      </p>
      {APD_OMRADEN.map((o) => (
        <div key={o.namn} className="flex flex-col gap-2">
          <Overline>{o.namn}</Overline>
          <CheckList
            label={o.namn}
            items={o.punkter.map((p) => ({ id: p.id, label: medMarkering(p), checked: !!punkter[p.id] }))}
            onChange={onPunkt}
          />
        </div>
      ))}
    </Slideover>
  );
}

/** Status för en EPC-punkt och knappen som bockar den när underlaget är klart. */
function EpcKoppling({ punktId, text, redo, pl, onKlar, onVisa }) {
  const lage = pl.get(punktId);
  const st = lage?.status || "oppen";
  // En passerad grind gör fasens punkter klara — säg det, så att ingen letar efter en bock.
  const text2 = st === "klar" && lage.kalla === "grind" ? `Klar via G${PUNKT_FOR_ID.get(punktId).fas}` : EPC_TEXT[st];
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-hairline py-2 first:border-t-0">
      <span className="text-[13px] text-ink">
        <button type="button" className="lankknapp" onClick={() => onVisa(punktId)}>
          {punktId}
        </button>{" "}
        {text}
      </span>
      <span className="flex items-center gap-2">
        <StatusBadge ton={EPC_TON[st]} label={text2} />
        {st === "oppen" && redo ? (
          <button type="button" className="btn mini" onClick={() => onKlar(punktId)}>
            Markera klar
          </button>
        ) : null}
      </span>
    </li>
  );
}

export function ApdKort({ projekt }) {
  const { state, uppd, dispatch } = usePortfolj();
  const { visaToast, oppnaPost } = useUi();
  const [oppen, setOppen] = useState(false);
  const pid = projekt.id;
  const lage = apdLage(state, pid);
  const rad = lage.rad;
  const pl = punktlage(state, pid);

  // Raden sås i efterInlasning; utan den finns inget att skriva i.
  const harRad = (state.hseqApd || []).some((r) => r.id === rad.id);
  const satt = (falt, varde) => harRad && uppd("hseqApd", rad.id, falt, varde);

  const bockaPunkt = (id, varde) => satt("punkter", { ...(rad.punkter || {}), [id]: varde });
  const bockaTavla = (id, varde) => satt("tavla", { ...(rad.tavla || {}), [id]: varde ? idag() : "" });

  /* En ny revision ändrar planen som beställaren godkänt — godkännandet
     nollställs, och tavlans exemplar blir inaktuellt via revisionsdatumet. */
  const nyRevision = () => {
    const rev = nastaRevision(rad.revision);
    satt("revision", rev);
    satt("revisionDatum", idag());
    if (rad.godkandDatum) {
      satt("godkandDatum", "");
      satt("godkandAv", "");
    }
    visaToast(`APD-planen är nu ${rev} — skicka den till beställaren för godkännande`);
  };

  const epcKlar = (punktId) => dispatch({ type: "EPC_PUNKT", pid, punkt: punktId, status: "klar" });
  const visaEpc = (punktId) => oppnaPost("epc", `kp-${punktId}`);

  const badge = lage.godkand ? (
    <StatusBadge ton="ok" label={`Godkänd ${rad.godkandDatum}`} />
  ) : (
    <StatusBadge ton="bad" label="Ej godkänd av beställaren" />
  );

  return (
    <Card
      id="hseq-apd"
      title="APD-plan och arbetsplatstavla"
      subtitle="Etablering, grind G5. APD-planen godkänns av beställaren innan etablering (hållpunkt)."
      badge={badge}
    >
      {!harRad ? (
        <Callout ton="warn">Projektets APD-rad saknas. Ladda om sidan så skapas den.</Callout>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Overline>APD-plan</Overline>
          <div className="frow c2">
            <div className="f">
              <label htmlFor={`apd-rit-${pid}`}>Ritning</label>
              <Falt
                id={`apd-rit-${pid}`}
                varde={rad.ritning}
                etikett="Ritningsnummer eller länk till APD-planen"
                placeholder="Ritningsnummer eller länk"
                onCommit={(v) => satt("ritning", v)}
              />
            </div>
            <div className="f">
              <span className="faltrubrik">Revision</span>
              <span className="flex items-center gap-2 text-[13px] text-ink">
                {rad.revision ? `${rad.revision} · ${rad.revisionDatum}` : "Ingen revision"}
                <button type="button" className="btn sec mini" onClick={nyRevision} disabled={!harRad}>
                  Ny revision
                </button>
              </span>
            </div>
          </div>
          <div className="frow c2">
            <div className="f">
              <label htmlFor={`apd-gdat-${pid}`}>Godkänd av beställaren</label>
              <DatumFalt
                id={`apd-gdat-${pid}`}
                varde={rad.godkandDatum}
                etikett="Datum för beställarens godkännande"
                onCommit={(v) => satt("godkandDatum", v)}
              />
            </div>
            <div className="f">
              <label htmlFor={`apd-gav-${pid}`}>Godkänd av</label>
              <Falt
                id={`apd-gav-${pid}`}
                varde={rad.godkandAv}
                etikett="Vem hos beställaren som godkände"
                onCommit={(v) => satt("godkandAv", v)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="flex items-baseline justify-between text-[13px] text-ink">
              <span>Kontrollpunkter i planen</span>
              <b className="tabular-nums">
                {lage.klara}/{lage.totalt}
              </b>
            </span>
            <Meter value={lage.klara} max={lage.totalt} label="Kontrollpunkter i APD-planen" />
          </div>
          <div>
            <button type="button" className="btn sec" onClick={() => setOppen(true)} disabled={!harRad}>
              Öppna APD-checklistan
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Overline>Arbetsplatstavlan</Overline>
          {lage.tavlaInaktuella ? (
            <Callout ton="warn">
              <b>{lage.tavlaInaktuella} anslag är inaktuella.</b> Det finns en nyare version i appen än den som
              sattes upp — byt ut exemplaret på tavlan och bocka av igen.
            </Callout>
          ) : null}
          <CheckList
            label="Arbetsplatstavlan"
            items={lage.tavla.map((t) => ({
              id: t.id,
              label: medMarkering(t),
              checked: t.status === "uppsatt",
              hint: (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <StatusBadge ton={TAVLA_TON[t.status]} label={TAVLA_TEXT[t.status]} />
                  {t.datum ? `uppsatt ${t.datum}` : null}
                  {t.status === "inaktuell" ? `· nyare version ${t.krav}` : null}
                </span>
              ),
            }))}
            onChange={bockaTavla}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Overline>I Bygga batteripark</Overline>
        <ul className="m-0 list-none p-0" aria-label="Kopplade punkter i EPC-checklistan">
          <EpcKoppling
            punktId={APD_EPC.plan}
            text="APD-plan godkänd av beställaren"
            redo={lage.planRedo}
            pl={pl}
            onKlar={epcKlar}
            onVisa={visaEpc}
          />
          <EpcKoppling
            punktId={APD_EPC.tavla}
            text="Arbetsplatstavlan komplett"
            redo={lage.tavlaRedo}
            pl={pl}
            onKlar={epcKlar}
            onVisa={visaEpc}
          />
        </ul>
      </div>

      {oppen ? <ApdPanel lage={lage} onStang={() => setOppen(false)} onPunkt={bockaPunkt} /> : null}
    </Card>
  );
}
