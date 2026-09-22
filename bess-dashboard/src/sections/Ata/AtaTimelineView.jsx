import { useMemo } from "react";
import { Note } from "../../components/ui/Primitiver.jsx";
import { Tidslinje } from "../../components/ui/Tidslinje.jsx";
import { KOLUMNER, datumFor, kolumnFor } from "./flode.js";

/* Tidslinjevyn. Återanvänder gantt-komponenten från Tidplan i stället för en
   egen — den har redan i-dag-linjen, körfältsuppdelning, detaljpanel och
   tangentbordsstöd.

   Ett spår per steg i ABT 06-flödet. Posten placeras på det datum som är
   aktuellt för dess steg: fakturadatum för en fakturerad post, händelsedatum
   för en nyss identifierad.

   Poster utan något datum alls kan inte placeras på en tidsaxel. De räknas
   upp i stället för att tyst försvinna — i skarp data är de många, eftersom
   händelsedatum ofta saknas. */

const KOLUMNNAMN = Object.fromEntries(KOLUMNER.map(([id, namn]) => [id, namn]));

export function AtaTimelineView({ rader, onOppna }) {
  const utanDatum = rader.filter((u) => !datumFor(u));

  const spar = useMemo(() => {
    return KOLUMNER.map(([id]) => {
      const poster = rader
        .filter((u) => kolumnFor(u) === id && datumFor(u))
        .map((u) => ({
          id: u.id,
          datum: datumFor(u),
          titel: `${u.nr} — ${u.benamning || "Utan benämning"}`,
          status: u.status,
          typ: "ÄTA",
          anteckning: u.belopp ? `Belopp ${u.belopp} kr` : "",
        }));

      return { id, namn: KOLUMNNAMN[id], klass: "", poster };
    }).filter((s) => s.poster.length);
  }, [rader]);

  if (!spar.length) {
    return (
      <Note niva="bad">
        <b>Ingen post går att placera på tidsaxeln.</b> Tidslinjen behöver minst ett datum per ärende —
        händelsedatum, underrättelse, godkänt pris eller fakturadatum. Just nu saknar samtliga{" "}
        {rader.length} poster alla fyra. Fyll i händelsedatum i ärendepanelen, så blir både tidslinjen och
        24-timmarsfristen användbara.
      </Note>
    );
  }

  return (
    <>
      <Tidslinje
        rader={spar}
        etikett="ÄTA-ärenden på tidsaxel"
        onValjPost={(post) => onOppna(post.id)}
      />
      {utanDatum.length ? (
        <p className="lead" style={{ marginTop: 12 }}>
          {utanDatum.length} post{utanDatum.length > 1 ? "er" : ""} saknar datum helt och visas inte här:{" "}
          {utanDatum.map((u) => u.nr).join(", ")}.
        </p>
      ) : null}
    </>
  );
}
