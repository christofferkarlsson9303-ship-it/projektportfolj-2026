import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare, Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Tidslinje } from "../components/ui/Tidslinje.jsx";
import { SelStatus } from "../components/ui/Primitiver.jsx";
import { Callout, Card, CheckList, Meter, Overline, StatusBadge } from "../components/ds/index.js";
import { DatumFalt } from "../components/ui/Falt.jsx";
import { BATTERIPARK_MILSTOLPAR } from "../data/batteripark-milstolpar.js";
import { dagarTill } from "../lib/datum.js";
import {
  gallerFor,
  projekt,
  projektKlass,
  rutinAntal,
  rutinKlar,
  rutinNyckel,
} from "../lib/berakningar.js";

/* Tidplanen på designsystemet: tidslinjen, milstolparna och leveranserna som
   kort, och byggfaserna som utfällbara rader i ett kort — varje fas med
   mätare, räknare och avbockningslistor per grupp. */

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

  /* Tidslinjens rader: ett spår per projekt med milstolpar och leveranser. */
  const tidslinjeRader = useMemo(() => {
    const projektLista = omfang === "alla" ? state.projekt : state.projekt.filter((x) => x.id === pid);

    return projektLista.map((pr) => {
      const poster = [];

      state.milstolpar
        .filter((m) => m.projektId === pr.id && m.datum)
        .forEach((m) =>
          poster.push({
            id: "m-" + m.id,
            datum: m.datum,
            titel: m.titel,
            status: m.status,
            typ: "Milstolpe",
            anteckning: /färdigställ|slutbesikt/i.test(m.titel)
              ? "Kontraktets färdigställandetid — styr viten och slutbesiktning."
              : "",
          })
        );

      state.leveranser
        .filter((l) => gallerFor(l, pr.id) && l.datum)
        .forEach((l) =>
          poster.push({
            id: "l-" + l.id,
            datum: l.datum,
            titel: l.benamning,
            status: l.status,
            typ: "Leverans",
            leverantor: l.leverantor,
          })
        );

      return {
        id: pr.id,
        namn: (pr.nr ? pr.nr + " " : "") + pr.namn,
        klass: projektKlass(state, pr.id),
        poster,
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
        title="Tidslinje — milstolpar och leveranser"
        subtitle="Klicka på en punkt för detaljer. Röd linje är i dag. Intervallet anpassas automatiskt efter datan."
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
        <Tidslinje rader={tidslinjeRader} etikett="Tidslinje över milstolpar och leveranser" />
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
                    alternativ={["planerad", "klar", "forsenad"]}
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
                    alternativ={["bekraftad", "preliminar", "avvikelse", "klar"]}
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
