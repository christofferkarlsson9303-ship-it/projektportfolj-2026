import { useMemo } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { Projektvaljare } from "../components/ui/Projektvaljare.jsx";
import { Tathetsvaljare } from "../components/ui/Vyvaljare.jsx";
import { DataTable } from "../components/ui/DataTable.jsx";
import { SelStatus } from "../components/ui/Primitiver.jsx";
import { PTag } from "../components/ui/PTag.jsx";
import { DatumFalt } from "../components/ui/Falt.jsx";
import { dagarTill } from "../lib/datum.js";
import { gallerFor, projekt } from "../lib/berakningar.js";
import { hamtaNamn } from "../state/portfolj-reducer.js";

export function Punkter() {
  const { state, uppd, uppdStatus, laggTill } = usePortfolj();
  const { valtProjekt: pid, fraga } = useUi();

  const proj = projekt(state, pid);

  const rader = useMemo(
    () =>
      state.punkter
        .filter((pt) => gallerFor(pt, pid))
        .sort((a, b) => (a.forfaller || "9999").localeCompare(b.forfaller || "9999")),
    [state.punkter, pid]
  );

  if (!proj) return null;

  const nyPunkt = async () => {
    const sv = await fraga({
      titel: "Ny punkt",
      falt: [
        { namn: "titel", etikett: "Beskriv punkten", typ: "textarea" },
        { namn: "forfaller", etikett: "Förfaller (valfritt)", typ: "date" },
      ],
      ok: "Lägg till",
    });
    if (!sv || !sv.titel) return;
    laggTill("punkter", {
      id: "p" + Date.now(),
      projektId: pid,
      titel: sv.titel,
      agare: hamtaNamn() || "Christoffer Karlsson",
      forfaller: sv.forfaller || "",
      status: "oppen",
    });
  };

  const arSen = (pt) => {
    const d = pt.forfaller ? dagarTill(pt.forfaller) : null;
    return d !== null && d < 0 && pt.status === "oppen";
  };

  return (
    <>
      <Projektvaljare />

      <div className="card">
        <div className="kortrad">
          <div style={{ minWidth: 0 }}>
            <h3>Öppna punkter — {(proj.nr ? proj.nr + " " : "") + proj.namn}</h3>
            <div className="lead" style={{ marginBottom: 0 }}>
              Sortera på valfri kolumn, filtrera på status eller sök i fritext. Rader som passerat sitt
              datum är markerade.
            </div>
          </div>
          <div className="kortverktyg">
            <Tathetsvaljare />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <DataTable
            etikett="Öppna punkter"
            exportNamn="Oppna_punkter"
            rader={rader}
            tomText="Inga öppna punkter."
            radKlass={(pt) => (arSen(pt) ? "rad-sen" : "")}
            verktyg={
              <button type="button" className="btn sec mini" onClick={nyPunkt}>
                + Lägg till punkt
              </button>
            }
            fotnot="Rader märkta OKLARHET är motsägelser i underlaget som behöver redas ut."
            kolumner={[
              {
                nyckel: "projektId",
                rubrik: "Projekt",
                bredd: 110,
                filter: true,
                filterEtikett: (v) => {
                  const p = state.projekt.find((x) => x.id === v);
                  return p ? (p.nr ? p.nr + " " : "") + p.namn : v === "bada" ? "Båda" : v;
                },
                textVarde: (pt) => {
                  const p = state.projekt.find((x) => x.id === pt.projektId);
                  return p ? `${p.nr || ""} ${p.namn} ${p.ort || ""}` : pt.projektId;
                },
                render: (pt) => <PTag pid={pt.projektId} />,
              },
              { nyckel: "titel", rubrik: "Punkt" },
              { nyckel: "agare", rubrik: "Ägare", bredd: 150, filter: true },
              {
                nyckel: "forfaller",
                rubrik: "Förfaller",
                bredd: 150,
                sortVarde: (pt) => pt.forfaller || "9999",
                render: (pt) => (
                  <DatumFalt
                    varde={pt.forfaller || ""}
                    etikett={`Förfallodatum för ${pt.titel}`}
                    onCommit={(v) => uppd("punkter", pt.id, "forfaller", v)}
                  />
                ),
              },
              {
                nyckel: "kvar",
                rubrik: "Kvar",
                bredd: 80,
                typ: "num",
                sortVarde: (pt) => (pt.forfaller ? dagarTill(pt.forfaller) : 99999),
                textVarde: (pt) => (pt.forfaller ? `${dagarTill(pt.forfaller)} d` : ""),
                exportVarde: (pt) => (pt.forfaller ? dagarTill(pt.forfaller) : ""),
                render: (pt) => {
                  const d = pt.forfaller ? dagarTill(pt.forfaller) : null;
                  if (d === null) return "—";
                  return (
                    <span style={arSen(pt) ? { color: "var(--rod)", fontWeight: 700 } : undefined}>
                      {d} d{arSen(pt) ? <span className="sr-only"> — förfallen</span> : null}
                    </span>
                  );
                },
              },
              {
                nyckel: "status",
                rubrik: "Status",
                bredd: 150,
                filter: true,
                filterEtikett: (v) => ({ oppen: "Öppen", klarmarkerad: "Klar" })[v] || v,
                render: (pt) => (
                  <SelStatus
                    alternativ={["oppen", "klarmarkerad"]}
                    varde={pt.status}
                    etikett={`Status för ${pt.titel}`}
                    onChange={(v) => uppdStatus("punkter", pt.id, "status", v)}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
