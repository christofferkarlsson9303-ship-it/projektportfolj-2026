import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare, Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Tidslinje } from "../components/ui/Tidslinje.jsx";
import { Callout, Card, CheckList, Meter, Overline, StatusBadge } from "../components/ds/index.js";
import { DatumFalt, Falt, SelStatus } from "../components/ui/Falt.jsx";
import { BATTERIPARK_MILSTOLPAR } from "../data/batteripark-milstolpar.js";
import { dagarTill } from "../lib/datum.js";
import { faslage } from "../lib/epc.js";
import {
  gallerFor,
  projekt,
  rutinAntal,
  rutinKlar,
  rutinNyckel,
} from "../lib/berakningar.js";

/* Tidplanen på designsystemet: Gantt-schemat, milstolparna och leveranserna
   som kort, och byggfaserna som utfällbara rader i ett kort — varje fas med
   mätare, räknare och avbockningslistor per grupp. */

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
      <p className="m-0 text-xs text-ink-soft">
        Med ett startdatum ritas posten som en stapel från start till {k.lista === "leveranser" ? "leverans" : "datum"}.
      </p>
    </div>
  );
}

/* ---------- Byggfaser (klart-kriterier) ---------- */

function Byggfas({ fas, pid }) {
  const { state, dispatch } = usePortfolj();
  const [oppen, setOppen] = useState(false);
  const { tot, klar } = rutinAntal(state, pid, fas);

  return (
    <li className="border-0 border-t border-solid border-hairline first:border-t-0">
      <h4 className="m-0">
        <button
          type="button"
          className="-mx-2 flex w-[calc(100%+1rem)] cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-3 text-left font-body hover:bg-sunken"
          onClick={() => setOppen((v) => !v)}
          aria-expanded={oppen}
          aria-controls={`fas-${fas.id}`}
        >
          <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md bg-one-djup px-1.5 text-xs font-bold text-white">
            {fas.id}
          </span>
          <span className="min-w-0 flex-1 text-[14px] font-semibold leading-snug text-ink">{fas.titel}</span>
          <Meter value={klar} max={tot} size="sm" className="w-16 shrink-0 sm:w-20" />
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-ink-soft">
            {klar}/{tot}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`shrink-0 text-ink-faint transition-transform ${oppen ? "rotate-180" : ""}`}
          />
        </button>
      </h4>

      {oppen ? (
        <div id={`fas-${fas.id}`} className="flex flex-col gap-4 pb-4 sm:pl-11">
          {fas.grupper.map((g, gi) => (
            <div key={g.namn} className="flex flex-col gap-1.5">
              <Overline as="h5">{g.namn}</Overline>
              {g.info ? <p className="m-0 text-xs leading-snug text-ink-soft">{g.info}</p> : null}
              <CheckList
                label={`${fas.id} ${g.namn}`}
                items={g.punkter.map((pt) => {
                  const nyckel = rutinNyckel(fas.id, gi, pt.n);
                  return { id: nyckel, label: pt.t, hint: pt.h, checked: rutinKlar(state, pid, nyckel) };
                })}
                onChange={(nyckel, klar) => dispatch({ type: "VAXLA_RUTINPUNKT", pid, nyckel, klar })}
              />
            </div>
          ))}
        </div>
      ) : null}
    </li>
  );
}

/* ---------- Sektionen ---------- */

export function Tidplan() {
  const { state, uppd, uppdStatus, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga } = useUi();
  const [omfang, setOmfang] = useState("alla");

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
          titel: `${f.fas.nr} · ${f.fas.kort}`,
          datum: f.start,
          slutdatum: f.slut,
          lage: FAS_TILL_LAGE[f.status] || "planerad",
          typ: "Byggfas",
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
          { id: "faser", namn: "Byggfaser", poster: faser },
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
      id: "m" + Date.now(),
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
      id: "l" + Date.now(),
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

  return (
    <>
      <Card
        id="tp-tidslinje"
        className="mb-4 lg:mb-6"
        title="Tidplan — Gantt"
        subtitle="Byggfaser, milstolpar och leveranser per projekt. Peka på en stapel för detaljer, klicka för att ändra. Orange linje är i dag."
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
          etikett="Gantt över byggfaser, milstolpar och leveranser"
          redigera={(post, rad) => <Redigering post={post} rad={rad} />}
        />
      </Card>

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

        <Card id="tp-leveranser" title={`Leveransspårning — ${projektNamn}`} subtitle="Long lead och kritisk materiel.">
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

        <Card
          id="tp-kriterier"
          title={`Milstolpar → klart-kriterier — ${projektNamn}`}
          subtitle="Byggsteg för batteripark mappade mot betalplanens milstolpar. Bocka av per moment — sparas per projekt."
        >
          <ul className="m-0 list-none p-0">
            {BATTERIPARK_MILSTOLPAR.map((fas) => (
              <Byggfas key={fas.id} fas={fas} pid={pid} />
            ))}
          </ul>
        </Card>

        <Callout>
          <b>Underlag och antaganden.</b> Byggstegen ovan är hämtade ur Montörspärmen (Växjö Batteripark
          36037) och är en generell mall för CATL EnerX-baserade BESS-bygg — samma faser och tekniska
          klart-kriterier gäller i grunden för alla fyra projekt. <b>Antagande:</b> milstolpe-ID:n (M1–M7)
          och betalningsandelarna (%) följer Batch C:s betalplan mot Ingrid Capacity — bekräfta att samma
          milstolpemodell och andelar gäller innan de används för fakturering på Göteborg och Götene.
          Leverantörsspecifika detaljer (t.ex. ställverksfabrikat) kan skilja per site — se projektets egen
          Montörspärm för exakta referenser och signaturkrav.
        </Callout>
      </div>
    </>
  );
}
