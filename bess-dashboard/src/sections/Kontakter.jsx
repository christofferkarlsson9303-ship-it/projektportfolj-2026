import { useMemo } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Note, Tabellyta } from "../components/ui/Primitiver.jsx";

function Kontakttabell({ lista, etikett }) {
  if (!lista.length) return <p className="lead">Inga kontakter registrerade.</p>;
  return (
    <Tabellyta etikett={etikett}>
      <table>
        <thead>
          <tr>
            <th scope="col">Namn</th>
            <th scope="col">Roll</th>
            <th scope="col">Organisation</th>
            <th scope="col">Område</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((k) => (
            <tr key={k.id}>
              <td data-label="Namn">
                <b>{k.namn}</b>
              </td>
              <td data-label="Roll">{k.roll}</td>
              <td data-label="Organisation">{k.org}</td>
              <td data-label="Område">{k.omr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Tabellyta>
  );
}

export function Kontakter() {
  const { state, laggTill } = usePortfolj();
  const { fraga } = useUi();

  const g = useMemo(() => {
    const k = state.kontakter;
    return {
      bestallare: k.filter((x) => x.org.includes("Ingrid")),
      one: k.filter((x) => x.org === "ONE Nordic"),
      nat: k.filter((x) => !/Ingrid/.test(x.org) && /Energi|Vexnet|Vinnergi/.test(x.org)),
      ue: k.filter(
        (x) => !/Ingrid|Vexnet|Vinnergi/.test(x.org) && x.org !== "ONE Nordic" && !/Energi/.test(x.org)
      ),
    };
  }, [state.kontakter]);

  const nyKontakt = async () => {
    const sv = await fraga({
      titel: "Ny kontakt",
      falt: [
        { namn: "namn", etikett: "Namn" },
        { namn: "roll", etikett: "Roll", placeholder: "t.ex. Platschef" },
        { namn: "org", etikett: "Organisation" },
        { namn: "omr", etikett: "Område", placeholder: 'projektnamn eller "Båda"' },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.namn) return;
    laggTill("kontakter", {
      id: "k" + Date.now(),
      namn: sv.namn,
      roll: sv.roll || "",
      org: sv.org || "",
      omr: sv.omr || "",
    });
  };

  return (
    <>
      <div className="grid g2">
        <div className="card">
          <h3>Beställare — Ingrid Capacity</h3>
          <div className="lead">ABT 06</div>
          <Kontakttabell lista={g.bestallare} etikett="Beställarens kontakter" />
        </div>
        <div className="card">
          <h3>ONE Nordic</h3>
          <div className="lead">Projektorganisation</div>
          <Kontakttabell lista={g.one} etikett="ONE Nordics kontakter" />
        </div>
        <div className="card">
          <h3>Nät, fiber och besiktning</h3>
          <div className="lead">Externa parter</div>
          <Kontakttabell lista={g.nat} etikett="Nät, fiber och besiktning" />
        </div>
        <div className="card">
          <h3>Underentreprenörer och leverantörer</h3>
          <div className="lead">ABT-U 07 / leveransavtal</div>
          <Kontakttabell lista={g.ue} etikett="Underentreprenörer och leverantörer" />
        </div>
      </div>

      <div className="rowbtns" style={{ marginTop: 12 }}>
        <button type="button" className="btn sec mini" onClick={nyKontakt}>
          + Lägg till kontakt
        </button>
      </div>

      <Note>
        Telefonnummer och e-post har medvetet lämnats utanför den här vyn. Lägg dem i SharePoint-listan{" "}
        <b>BatchC_Kontakter</b> om appen ska bära dem, och begränsa listbehörigheten därefter.
      </Note>
    </>
  );
}
