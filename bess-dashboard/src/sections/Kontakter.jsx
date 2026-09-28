import { useMemo } from "react";
import { usePortfolj, useUi } from "../state/hooks.js";
import { DataTable } from "../components/ui/DataTable.jsx";
import { Callout, Card } from "../components/ds/index.js";

/* Kontakter på designsystemet: projektorganisationen i fyra kort —
   beställare, ONE Nordic, nät och besiktning, UE och leverantörer. Namnet
   står i fetstil; roll, organisation och område som egna kolumner, så att
   tabellen går att sortera och blir kort på mobil. */

const GRUPPER = [
  { id: "bestallare", titel: "Beställare — Ingrid Capacity", under: "ABT 06" },
  { id: "one", titel: "ONE Nordic", under: "Projektorganisation" },
  { id: "nat", titel: "Nät, fiber och besiktning", under: "Externa parter" },
  { id: "ue", titel: "Underentreprenörer och leverantörer", under: "ABT-U 07 / leveransavtal" },
];

const KOLUMNER = [
  { nyckel: "namn", rubrik: "Namn", render: (k) => <b className="text-ink">{k.namn}</b> },
  { nyckel: "roll", rubrik: "Roll" },
  { nyckel: "org", rubrik: "Organisation" },
  { nyckel: "omr", rubrik: "Område", bredd: 120 },
];

/** Vilken grupp en kontakt hör till, efter organisationen. */
function grupp(k) {
  const org = k.org || "";
  if (org.includes("Ingrid")) return "bestallare";
  if (org === "ONE Nordic") return "one";
  if (/Energi|Vexnet|Vinnergi/.test(org)) return "nat";
  return "ue";
}

export function Kontakter() {
  const { state, laggTill } = usePortfolj();
  const { fraga } = useUi();

  const perGrupp = useMemo(() => {
    const ut = Object.fromEntries(GRUPPER.map((g) => [g.id, []]));
    state.kontakter.forEach((k) => ut[grupp(k)].push(k));
    return ut;
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
    <div className="flex flex-col gap-4 lg:gap-6">
      <Card
        id="kontakter-rubrik"
        title="Projektorganisation och kontakter"
        subtitle={`${state.kontakter.length} kontakter i fyra grupper. Gruppen följer organisationen.`}
        action={
          <button type="button" className="btn" onClick={nyKontakt}>
            + Lägg till kontakt
          </button>
        }
      >
        <Callout ton="info">
          Telefonnummer och e-post har medvetet lämnats utanför den här vyn. Lägg dem i SharePoint-listan{" "}
          <b>BatchC_Kontakter</b> om appen ska bära dem, och begränsa listbehörigheten därefter.
        </Callout>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 lg:gap-6">
        {GRUPPER.map((g) => (
          <Card key={g.id} id={`kontakter-${g.id}`} title={g.titel} subtitle={g.under}>
            <DataTable
              etikett={`Kontakter: ${g.titel}`}
              sokbar={false}
              rader={perGrupp[g.id]}
              tomText="Inga kontakter registrerade."
              kolumner={KOLUMNER}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
