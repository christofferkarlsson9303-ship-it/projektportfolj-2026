import { DataTable } from "../../components/ui/DataTable.jsx";
import { Pill } from "../../components/ui/Primitiver.jsx";
import { ATA_KLASS } from "../../data/konstanter.js";
import { prisGrind, underrattelseLage } from "../../lib/berakningar.js";

/* Tabellvyn — kalkylbladskänslan. DataTable bär redan sortering, snabbsökning,
   kolumnfilter, summeringsrad, mobilens kortvy och CSV-export, så den här filen
   är bara kolumndefinitionen.

   Etiketten "UR- och ÄTA-register" är oförändrad: den är tabellens
   tillgänglighetsnamn och det e2e-sviten navigerar på. */

const klassNamn = (v) => {
  const rad = ATA_KLASS.find(([k]) => k === v);
  return rad ? rad[1].split(" —")[0] : "Ej klassificerad";
};

export function AtaTableView({ rader, tomText, vald, onOppna, verktyg }) {
  return (
    <DataTable
      etikett="UR- och ÄTA-register"
      exportNamn="ATA_register"
      rader={rader}
      tomText={tomText}
      radKlass={(u) => (underrattelseLage(u)?.varning || prisGrind(u)?.varning ? "rad-sen" : "")}
      verktyg={verktyg}
      kolumner={[
        {
          nyckel: "nr",
          rubrik: "Nr",
          bredd: 96,
          render: (u) => (
            <button
              type="button"
              className="border-0 bg-transparent p-0 font-bold text-one-bla underline decoration-dotted"
              onClick={() => onOppna(vald === u.id ? null : u.id)}
              aria-expanded={vald === u.id}
            >
              {u.nr}
              <span className="sr-only"> — öppna ärendet {u.benamning}</span>
            </button>
          ),
        },
        { nyckel: "benamning", rubrik: "Benämning" },
        {
          nyckel: "klass",
          rubrik: "Klass",
          bredd: 150,
          filter: true,
          filterEtikett: klassNamn,
          textVarde: (u) => klassNamn(u.klass),
          render: (u) => <span className={`klasstag k-${u.klass || "oklar"}`}>{klassNamn(u.klass)}</span>,
        },
        {
          nyckel: "status",
          rubrik: "Status",
          bredd: 170,
          filter: true,
          render: (u) => <Pill status={u.status} />,
        },
        { nyckel: "belopp", rubrik: "Belopp", bredd: 130, typ: "sek", summera: true },
        {
          nyckel: "grindar",
          rubrik: "Grindar",
          bredd: 110,
          sorterbar: false,
          textVarde: (u) =>
            [underrattelseLage(u)?.varning ? "24h" : "", prisGrind(u)?.varning ? "pris" : ""]
              .filter(Boolean)
              .join(" "),
          exportVarde: (u) =>
            [
              underrattelseLage(u)?.varning ? "24h-frist" : "",
              prisGrind(u)?.varning ? "pris ej godkänt" : "",
            ]
              .filter(Boolean)
              .join(", "),
          render: (u) => {
            const a = underrattelseLage(u)?.varning;
            const b = prisGrind(u)?.varning;
            if (!a && !b) return <span className="text-ink-faint">—</span>;
            return (
              <span className="inline-flex gap-1.5">
                {a ? (
                  <span className="grind bad" title={underrattelseLage(u).txt}>
                    <span aria-hidden="true">⏱</span>
                    <span className="sr-only">24-timmarsfristen överskriden</span>
                  </span>
                ) : null}
                {b ? (
                  <span className="grind bad" title={prisGrind(u).txt}>
                    <span aria-hidden="true">🔒</span>
                    <span className="sr-only">Arbete startat utan godkänt pris</span>
                  </span>
                ) : null}
              </span>
            );
          },
        },
      ]}
    />
  );
}
