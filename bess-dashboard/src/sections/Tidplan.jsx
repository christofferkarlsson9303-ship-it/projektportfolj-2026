import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare, Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Tidslinje } from "../components/ui/Tidslinje.jsx";
import { KritiskLinje } from "../components/tidplan/KritiskLinje.jsx";
import { MilstolpsKrav } from "../components/tidplan/MilstolpsKrav.jsx";
import { Card, Overline, StatusBadge } from "../components/ds/index.js";
import { DatumFalt, Falt, SelStatus } from "../components/ui/Falt.jsx";
import { dagarTill } from "../lib/datum.js";
import { faslage } from "../lib/epc.js";
import { BESTALLNING_STATUS, bestallningslage } from "../lib/bestallningar.js";
import { FASER as MOMENT } from "../data/bessChecklistData.ts";
import { gallerFor, projekt } from "../lib/berakningar.js";

import { FASER } from "../data/projektfaser.ts";
import { nyttId } from "../lib/id.js";
import { useMedia } from "../lib/useMedia.js";

/* Tidplanen på designsystemet: Gantt-schemat, milstolparna och leveranserna
   som kort, och betalmilstolparna som skrivskyddade räknare mot grindarna i
   Bygga batteripark (MilstolpsKrav). Punkter bockas bara i momentet.

   Byggmomenten (0–15) och milstolparna (M1–M7) visar projektets fas 1–8 ur
   lib/fasmappning.js, så att tidplanen och projektkortet säger samma fas. */

/* ---------- Gantt: data och redigering ---------- */

/** Byggfasens läge i Bygga batteripark → stapelns läge i Gantt-schemat. */
const FAS_TILL_LAGE = { klar: "klar", pagar: "pagaende", sen: "forsenad", kommande: "planerad" };

const MS_STATUS = ["planerad", "pagaende", "klar", "forsenad"];
const LEV_STATUS = ["bekraftad", "preliminar", "avvikelse", "klar"];

/** En milstolpe eller leverans som post i Gantt-schemat. Med startdatum blir
 *  den en stapel från start till datum; utan är den en händelse (romb). */
function somPost(rad, lista, typ, titel) {
  const start = rad.start && rad.start < rad.datum ? rad.start : null;
  return {
    id: `${lista}-${rad.id}`,
    titel,
    datum: start || rad.datum,
    slutdatum: start ? rad.datum : undefined,
    status: rad.status,
    typ,
    ansvarig: rad.ansvarig || "",
    leverantor: rad.leverantor || "",
    beroende: rad.beroende || "",
    anteckning: rad.anteckning || "",
    kalla: { lista, id: rad.id },
  };
}

/** Redigering i detaljpanelen när en stapel är vald. Byggfaser ändras i
 *  EPC-planen; milstolpar och leveranser i sina egna listor. */
function Redigering({ post, rad }) {
  const { state, uppd, uppdStatus, dispatch } = usePortfolj();
  const { oppnaPost, setValtProjekt } = useUi();
  const k = post.kalla;
  if (!k) return null;
  const idBas = `gantt-${post.id}`;

  if (k.typ === "fas") {
    const satt = (falt) => (v) => dispatch({ type: "EPC_FAS", pid: k.pid, fas: k.nr, falt, varde: v });
    return (
      <div className="flex flex-col gap-3 border-0 border-t border-solid border-hairline pt-3">
        <Overline>Ändra planen</Overline>
        <div className="frow c3 items-end">
          <div className="f mb-0">
            <label htmlFor={`${idBas}-start`}>Start</label>
            <DatumFalt id={`${idBas}-start`} varde={post.datum} etikett={`Start för ${post.titel}`} onCommit={satt("start")} />
          </div>
          <div className="f mb-0">
            <label htmlFor={`${idBas}-slut`}>Slut</label>
            <DatumFalt id={`${idBas}-slut`} varde={post.slutdatum} etikett={`Slut för ${post.titel}`} onCommit={satt("slut")} />
          </div>
          <div>
            <button
              type="button"
              className="btn sec mini"
              onClick={() => {
                setValtProjekt(k.pid);
                oppnaPost("epc", `fas-${k.nr}`);
              }}
            >
              Öppna fasen i Bygga batteripark
            </button>
          </div>
        </div>
        <p className="m-0 text-xs text-ink-soft">
          Läget följer grinden och datumen för {rad.namn} i Bygga batteripark.
        </p>
      </div>
    );
  }

  const kalla = (state[k.lista] || []).find((x) => x.id === k.id);
  if (!kalla) return null;
  const alternativ = k.lista === "leveranser" ? LEV_STATUS : MS_STATUS;
  return (
    <div className="flex flex-col gap-3 border-0 border-t border-solid border-hairline pt-3">
      <Overline>Ändra</Overline>
      <div className="frow c4">
        <div className="f mb-0">
          <label htmlFor={`${idBas}-start`}>Start</label>
          <DatumFalt
            id={`${idBas}-start`}
            varde={kalla.start || ""}
            etikett={`Start för ${post.titel}`}
            onCommit={(v) => uppd(k.lista, k.id, "start", v)}
          />
        </div>
        <div className="f mb-0">
          <label htmlFor={`${idBas}-datum`}>{k.lista === "leveranser" ? "Leveransdatum" : "Datum"}</label>
          <DatumFalt
            id={`${idBas}-datum`}
            varde={kalla.datum || ""}
            etikett={`Datum för ${post.titel}`}
            onCommit={(v) => uppd(k.lista, k.id, "datum", v)}
          />
        </div>
        <div className="f mb-0">
          <label htmlFor={`${idBas}-status`}>Status</label>
          <SelStatus
            id={`${idBas}-status`}
            alternativ={alternativ}
            varde={kalla.status}
            etikett={`Status för ${post.titel}`}
            onChange={(v) => uppdStatus(k.lista, k.id, "status", v)}
          />
        </div>
        <div className="f mb-0">
          <label htmlFor={`${idBas}-ansvarig`}>Ansvarig</label>
          <Falt
            id={`${idBas}-ansvarig`}
            varde={kalla.ansvarig || ""}
            etikett={`Ansvarig för ${post.titel}`}
            placeholder={kalla.leverantor || "Roll eller namn"}
            onCommit={(v) => uppd(k.lista, k.id, "ansvarig", v)}
          />
        </div>
      </div>
      <div className="frow c2">
        <div className="f mb-0"><label htmlFor={`${idBas}-beroende`}>Beroenden / föregående moment</label><Falt id={`${idBas}-beroende`} varde={kalla.beroende || ""} etikett={`Beroenden för ${post.titel}`} onCommit={(v) => uppd(k.lista, k.id, "beroende", v)} /></div>
        <div className="f mb-0"><label htmlFor={`${idBas}-anteckning`}>Anteckning</label><Falt id={`${idBas}-anteckning`} varde={kalla.anteckning || ""} etikett={`Anteckning för ${post.titel}`} onCommit={(v) => uppd(k.lista, k.id, "anteckning", v)} /></div>
      </div>
      <p className="m-0 text-xs text-ink-soft">
        Med ett startdatum ritas posten som en stapel från start till {k.lista === "leveranser" ? "leverans" : "datum"}.
      </p>
    </div>
  );
}

/* ---------- Sektionen ---------- */

export function Tidplan() {
  const { state, uppd, uppdStatus, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga } = useUi();
  const [omfang, setOmfang] = useState("alla");
  const bred = useMedia("(min-width: 768px)");
  /* null = följ skärmbredden; true/false = användaren har valt. */
  const [visaGantt, setVisaGantt] = useState(null);

  const p = projekt(state, pid);

  /* Gantt-schemats spår: ett per projekt, med byggfaserna ur Bygga
     batteripark som staplar och milstolpar och leveranser under dem. */
  const tidslinjeRader = useMemo(() => {
    const projektLista = omfang === "alla" ? state.projekt : state.projekt.filter((x) => x.id === pid);

    return projektLista.map((pr) => {
      const faser = faslage(state, pr.id)
        .filter((f) => f.start && f.slut)
        .map((f) => ({
          id: `fas-${f.fas.nr}`,
          titel: `Moment ${f.fas.nr} · ${f.fas.kort}`,
          projektfas: f.fas.projektfas,
          datum: f.start,
          slutdatum: f.slut,
          lage: FAS_TILL_LAGE[f.status] || "planerad",
          typ: "Byggmoment",
          anteckning: f.fas.syfte,
          kalla: { typ: "fas", pid: pr.id, nr: f.fas.nr },
        }));

      const handelser = [
        ...state.milstolpar
          .filter((m) => m.projektId === pr.id && m.datum)
          .map((m) => ({
            ...somPost(m, "milstolpar", "Milstolpe", m.titel),
            anteckning: /färdigställ|slutbesikt/i.test(m.titel)
              ? "Kontraktets färdigställandetid — styr viten och slutbesiktning."
              : "",
          })),
        ...state.leveranser
          .filter((l) => gallerFor(l, pr.id) && l.datum)
          .map((l) => somPost(l, "leveranser", "Leverans", l.benamning)),
      ];

      return {
        id: pr.id,
        namn: (pr.nr ? pr.nr + " " : "") + pr.namn,
        grupper: [
          ...FASER.map((fas) => ({
            id: `projektfas-${fas.nr}`,
            namn: `Fas ${fas.nr} · ${fas.kort}`,
            fallbar: true,
            visaTom: true,
            sortera: false,
            poster: faser.filter((moment) => moment.projektfas === fas.nr),
          })),
          { id: "handelser", namn: "Milstolpar och leveranser", poster: handelser },
        ],
      };
    });
  }, [state, omfang, pid]);

  const milstolpar = useMemo(
    () => state.milstolpar.filter((m) => m.projektId === pid),
    [state.milstolpar, pid]
  );

  const leveranser = useMemo(
    () => state.leveranser.filter((l) => gallerFor(l, pid)),
    [state.leveranser, pid]
  );
  const bestallning = useMemo(() => new Map(bestallningslage(state, pid).map((b) => [b.id, b])), [state, pid]);

  if (!p) return null;

  const nyMilstolpe = async () => {
    const sv = await fraga({
      titel: "Ny milstolpe eller grind",
      falt: [
        { namn: "titel", etikett: "Benämning", placeholder: "t.ex. Cold Commissioning" },
        { namn: "datum", etikett: "Datum (valfritt)", typ: "date" },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.titel) return;
    laggTill("milstolpar", {
      id: nyttId("m"),
      projektId: pid,
      titel: sv.titel,
      datum: sv.datum || "",
      status: "planerad",
    });
  };

  const nyLeverans = async () => {
    const sv = await fraga({
      titel: "Ny leverans",
      falt: [
        { namn: "benamning", etikett: "Materiel", placeholder: "t.ex. Kabelströmstransformatorer" },
        { namn: "leverantor", etikett: "Leverantör (valfritt)" },
        { namn: "datum", etikett: "Leveransdatum (valfritt)", typ: "date" },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.benamning) return;
    laggTill("leveranser", {
      id: nyttId("l"),
      projektId: pid,
      benamning: sv.benamning,
      leverantor: sv.leverantor || "",
      datum: sv.datum || "",
      status: "preliminar",
    });
  };

  const kvarKolumn = {
    nyckel: "kvar",
    rubrik: "Kvar",
    bredd: 80,
    typ: "num",
    sortVarde: (r) => dagarTill(r.datum) ?? 99999,
    textVarde: (r) => (r.datum ? `${dagarTill(r.datum)} d` : "saknas"),
    render: (r) =>
      r.datum ? (
        <span className={dagarTill(r.datum) < 0 ? "font-bold text-bad-ink" : undefined}>{dagarTill(r.datum)} d</span>
      ) : (
        <StatusBadge ton="warn" label="Saknas" />
      ),
    exportVarde: (r) => (r.datum ? dagarTill(r.datum) : ""),
  };

  const projektNamn = (p.nr ? p.nr + " " : "") + p.namn;

  /* På smal skärm ryms inte Gantt-schemat: radnamnen klipps och sidan blir
     femton skärmar lång. Där leder "Blir vi klara i tid" (kritisk linje, en
     lista per moment) och Gantt fälls ut på begäran. */
  const ganttSynlig = visaGantt ?? bred;

  return (
    <>
      <div className="mb-4 lg:mb-6">
        <KritiskLinje pid={pid} projektNamn={projektNamn} />
      </div>

      {!ganttSynlig ? (
        <Card id="tp-tidslinje" className="mb-4" title="Tidplan — Gantt" subtitle="Schemat är byggt för bred skärm. Kritisk linje ovan visar samma moment som lista.">
          <button type="button" className="btn sec mini self-start" onClick={() => setVisaGantt(true)}>
            Visa Gantt-schema
          </button>
        </Card>
      ) : (
      <Card
        id="tp-tidslinje"
        className="mb-4 lg:mb-6"
        title="Tidplan — Gantt"
        subtitle="Byggmoment, milstolpar och leveranser per projekt. Peka på en stapel för detaljer, klicka för att ändra. Orange linje är i dag."
        action={
          <Vyvaljare
            etikett="Omfattning"
            varde={omfang}
            onValj={setOmfang}
            alternativ={[
              ["alla", "Alla projekt"],
              ["ett", "Valt projekt"],
            ]}
          />
        }
      >
        <Tidslinje
          rader={tidslinjeRader}
          etikett="Gantt över byggmoment, milstolpar och leveranser"
          redigera={(post, rad) => <Redigering post={post} rad={rad} />}
        />
        {!bred ? (
          <button type="button" className="btn sec mini self-start" onClick={() => setVisaGantt(false)}>
            Dölj Gantt-schema
          </button>
        ) : null}
      </Card>
      )}

      <Projektvaljare />

      <div className="flex flex-col gap-4 lg:gap-6">

        <Card
          id="tp-milstolpar"
          title={`${projektNamn} — milstolpar`}
          subtitle="Redigera datum och status — sparas direkt."
          action={<Tathetsvaljare />}
        >
          <DataTable
            etikett="Milstolpar"
            exportNamn="Milstolpar"
            rader={milstolpar}
            tomText="Inga milstolpar registrerade."
            verktyg={
              <button type="button" className="btn sec mini" onClick={nyMilstolpe}>
                + Lägg till milstolpe
              </button>
            }
            kolumner={[
              { nyckel: "titel", rubrik: "Händelse" },
              {
                nyckel: "start",
                rubrik: "Start",
                bredd: 150,
                sortVarde: (m) => m.start || "",
                render: (m) => (
                  <DatumFalt
                    varde={m.start || ""}
                    etikett={`Start för ${m.titel}`}
                    onCommit={(v) => uppd("milstolpar", m.id, "start", v)}
                  />
                ),
              },
              {
                nyckel: "datum",
                rubrik: "Datum",
                bredd: 150,
                render: (m) => (
                  <DatumFalt
                    varde={m.datum}
                    etikett={`Datum för ${m.titel}`}
                    onCommit={(v) => uppd("milstolpar", m.id, "datum", v)}
                  />
                ),
              },
              kvarKolumn,
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 140,
                filter: true,
                filterEtikett: (v) => ({ planerad: "Planerad", klar: "Klar", forsenad: "Försenad" })[v] || v,
                render: (m) => (
                  <SelStatus
                    alternativ={MS_STATUS}
                    varde={m.status}
                    etikett={`Status för ${m.titel}`}
                    onChange={(v) => uppdStatus("milstolpar", m.id, "status", v)}
                  />
                ),
              },
            ]}
          />
        </Card>

        <Card
          id="tp-leveranser"
          title={`Leveransspårning — ${projektNamn}`}
          subtitle="Long lead och kritisk materiel. Ange moment och leverantörens ledtid så räknas beställ senast baklänges från momentets start och syns i Idag. Ett uttryckligt moment gör att leveransdatumet styr momentets start i kritisk linje."
        >
          <DataTable
            etikett="Leveranser"
            exportNamn="Leveranser"
            rader={leveranser}
            tomText="Inga leveranser registrerade."
            verktyg={
              <button type="button" className="btn sec mini" onClick={nyLeverans}>
                + Lägg till leverans
              </button>
            }
            kolumner={[
              { nyckel: "benamning", rubrik: "Materiel" },
              { nyckel: "leverantor", rubrik: "Leverantör", bredd: 160, filter: true },
              {
                nyckel: "start",
                rubrik: "Start",
                bredd: 150,
                sortVarde: (l) => l.start || "",
                render: (l) => (
                  <DatumFalt
                    varde={l.start || ""}
                    etikett={`Start för ${l.benamning}`}
                    onCommit={(v) => uppd("leveranser", l.id, "start", v)}
                  />
                ),
              },
              {
                nyckel: "datum",
                rubrik: "Datum",
                bredd: 150,
                render: (l) => (
                  <DatumFalt
                    varde={l.datum}
                    etikett={`Leveransdatum för ${l.benamning}`}
                    onCommit={(v) => uppd("leveranser", l.id, "datum", v)}
                  />
                ),
              },
              kvarKolumn,
              {
                nyckel: "moment",
                rubrik: "Behövs till",
                bredd: 170,
                sortVarde: (l) => bestallning.get(l.id)?.moment ?? 99,
                textVarde: (l) => {
                  const b = bestallning.get(l.id);
                  return b?.moment === null || b?.moment === undefined ? "" : `Moment ${b.moment}${b.momentGissat ? " (gissat)" : ""}`;
                },
                render: (l) => {
                  const b = bestallning.get(l.id);
                  return (
                    <select
                      value={Number.isInteger(l.moment) ? String(l.moment) : ""}
                      aria-label={`Moment som behöver ${l.benamning}`}
                      onChange={(e) => uppd("leveranser", l.id, "moment", e.target.value === "" ? null : Number(e.target.value))}
                    >
                      <option value="">
                        {b?.momentGissat ? `Gissat: ${b.moment} ${MOMENT[b.moment].kort}` : "Välj moment"}
                      </option>
                      {MOMENT.map((m) => (
                        <option key={m.nr} value={m.nr}>
                          {m.nr} {m.kort}
                        </option>
                      ))}
                    </select>
                  );
                },
              },
              {
                nyckel: "ledtidVeckor",
                rubrik: "Ledtid (v)",
                bredd: 100,
                typ: "num",
                sortVarde: (l) => Number(l.ledtidVeckor) || 0,
                render: (l) => (
                  <Falt
                    typ="number"
                    min="0"
                    varde={l.ledtidVeckor ?? ""}
                    etikett={`Leverantörens ledtid i veckor för ${l.benamning}`}
                    onCommit={(v) => uppd("leveranser", l.id, "ledtidVeckor", v === "" ? "" : Number(v))}
                  />
                ),
              },
              {
                nyckel: "bestalld",
                rubrik: "Beställd",
                bredd: 150,
                sortVarde: (l) => l.bestalld || "",
                render: (l) => (
                  <DatumFalt
                    varde={l.bestalld || ""}
                    etikett={`Datum då ${l.benamning} beställdes`}
                    onCommit={(v) => uppd("leveranser", l.id, "bestalld", v)}
                  />
                ),
              },
              {
                nyckel: "senast",
                rubrik: "Beställ senast",
                bredd: 190,
                sortVarde: (l) => bestallning.get(l.id)?.senast || "9999",
                textVarde: (l) => {
                  const b = bestallning.get(l.id);
                  return b ? `${b.senast || ""} ${BESTALLNING_STATUS[b.status][1]}`.trim() : "";
                },
                render: (l) => {
                  const b = bestallning.get(l.id);
                  if (!b) return null;
                  const [ton, text] = BESTALLNING_STATUS[b.status];
                  return (
                    <span className="flex flex-col items-start gap-1">
                      {b.senast ? <span className="tabular-nums">{b.senast}</span> : null}
                      <StatusBadge ton={ton} label={b.status === "forsenar" ? `Försenar moment ${b.moment} ${b.forsenarDagar} d` : text} />
                    </span>
                  );
                },
              },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 150,
                filter: true,
                textVarde: (l) => l.status,
                render: (l) => (
                  <SelStatus
                    alternativ={LEV_STATUS}
                    varde={l.status}
                    etikett={`Status för ${l.benamning}`}
                    onChange={(v) => uppdStatus("leveranser", l.id, "status", v)}
                  />
                ),
              },
            ]}
          />
        </Card>

        <MilstolpsKrav pid={pid} projektNamn={projektNamn} />
      </div>
    </>
  );
}
