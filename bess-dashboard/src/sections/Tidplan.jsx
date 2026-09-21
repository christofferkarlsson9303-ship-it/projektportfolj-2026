import { useMemo, useState } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare, Vyvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Tidslinje } from "../components/ui/Tidslinje.jsx";
import { Note, Prog, SelStatus } from "../components/ui/Primitiver.jsx";
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

/* ---------- Byggfaser (klart-kriterier) ---------- */

function Byggfas({ fas, pid }) {
  const { state, dispatch } = usePortfolj();
  const [oppen, setOppen] = useState(false);
  const { tot, klar } = rutinAntal(state, pid, fas);

  return (
    <div className="acc">
      <h3 className="m-0">
        <button
          type="button"
          className="acch w-full border-0 bg-transparent text-left font-[inherit]"
          onClick={() => setOppen((v) => !v)}
          aria-expanded={oppen}
          aria-controls={`fas-${fas.id}`}
        >
          <span className="num">{fas.id}</span>
          <span className="ttl">{fas.titel}</span>
          <span className="prog-wrap w-20 shrink-0">
            <Prog procent={tot ? (klar / tot) * 100 : 0} klart={klar === tot} etikett={`Klart i ${fas.titel}`} />
          </span>
          <span className="cnt">
            {klar}/{tot}
          </span>
          <span aria-hidden="true" className="ml-2 text-ink-faint">
            {oppen ? "▲" : "▼"}
          </span>
        </button>
      </h3>

      {oppen ? (
        <div className="accb" id={`fas-${fas.id}`}>
          {fas.grupper.map((g, gi) => (
            <div className="grp" key={g.namn}>
              <h4>{g.namn}</h4>
              {g.info ? <div className="info">{g.info}</div> : null}
              {g.punkter.map((pt) => {
                const nyckel = rutinNyckel(fas.id, gi, pt.n);
                const kl = rutinKlar(state, pid, nyckel);
                const cid = `b_${pid}_${nyckel.replace(/\|/g, "_")}`;
                return (
                  <div className="chk" key={pt.n}>
                    <input
                      type="checkbox"
                      id={cid}
                      checked={kl}
                      onChange={(e) =>
                        dispatch({ type: "VAXLA_RUTINPUNKT", pid, nyckel, klar: e.target.checked })
                      }
                    />
                    <label htmlFor={cid}>
                      {kl ? <s>{pt.t}</s> : pt.t}
                      {pt.h ? <span className="hint">{pt.h}</span> : null}
                    </label>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
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
        <span style={dagarTill(r.datum) < 0 ? { color: "var(--rod)", fontWeight: 700 } : undefined}>
          {dagarTill(r.datum)} d
        </span>
      ) : (
        <span className="ant">SAKNAS</span>
      ),
    exportVarde: (r) => (r.datum ? dagarTill(r.datum) : ""),
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Tidslinje — milstolpar och leveranser</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Klicka på en punkt för detaljer. Röd linje är i dag. Intervallet anpassas automatiskt efter
              datan.
            </div>
          </div>
          <div className="kortverktyg">
            <Vyvaljare
              etikett="Omfattning"
              varde={omfang}
              onValj={setOmfang}
              alternativ={[
                ["alla", "Alla projekt"],
                ["ett", "Valt projekt"],
              ]}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Tidslinje rader={tidslinjeRader} etikett="Tidslinje över milstolpar och leveranser" />
        </div>
      </div>

      <Projektvaljare />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>{(p.nr ? p.nr + " " : "") + p.namn} — milstolpar</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Redigera datum och status — sparas direkt.
            </div>
          </div>
          <div className="kortverktyg">
            <Tathetsvaljare />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
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
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3>Leveransspårning — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
        <div className="lead">Long lead och kritisk materiel.</div>

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
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3>Milstolpar → klart-kriterier — {(p.nr ? p.nr + " " : "") + p.namn}</h3>
        <div className="lead">
          Byggsteg för batteripark mappade mot betalplanens milstolpar. Bocka av per moment — sparas per
          projekt.
        </div>
      </div>

      {BATTERIPARK_MILSTOLPAR.map((fas) => (
        <Byggfas key={fas.id} fas={fas} pid={pid} />
      ))}

      <Note>
        <b>Underlag och antaganden.</b> Byggstegen ovan är hämtade ur Montörspärmen (Växjö Batteripark
        36037) och är en generell mall för CATL EnerX-baserade BESS-bygg — samma faser och tekniska
        klart-kriterier gäller i grunden för alla fyra projekt. <b>Antagande:</b> milstolpe-ID:n (M1–M7)
        och betalningsandelarna (%) följer Batch C:s betalplan mot Ingrid Capacity — bekräfta att samma
        milstolpemodell och andelar gäller innan de används för fakturering på Göteborg och Götene.
        Leverantörsspecifika detaljer (t.ex. ställverksfabrikat) kan skilja per site — se projektets egen
        Montörspärm för exakta referenser och signaturkrav.
      </Note>
    </>
  );
}
