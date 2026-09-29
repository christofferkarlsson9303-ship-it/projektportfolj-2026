import { useState } from "react";
import { usePortfolj } from "../../state/hooks.js";
import { historikrader } from "../../lib/historik.js";
import { fmtLoggTid } from "../../lib/datum.js";

/** Versionshistorik för en post: vem ändrade vad och när. Hämtas först när
 *  sektionen öppnas. I lokalt läge, eller innan poster-tabellen finns, finns
 *  ingen historik att visa — det sägs rakt ut. */
export function Posthistorik({ lista, id }) {
  const { historik } = usePortfolj();
  const [lage, setLage] = useState({ status: "stangd", rader: [] });

  async function hamta() {
    setLage({ status: "laddar", rader: [] });
    try {
      const v = await historik(lista, id);
      setLage(v === null ? { status: "saknas", rader: [] } : { status: "klar", rader: historikrader(v) });
    } catch (e) {
      setLage({ status: "fel", rader: [], fel: e?.message || "okänt fel" });
    }
  }

  return (
    <details
      className="posthistorik"
      onToggle={(e) => {
        if (e.currentTarget.open && lage.status === "stangd") hamta();
      }}
    >
      <summary>Historik</summary>
      {lage.status === "laddar" ? <p className="posthistorik-info">Hämtar…</p> : null}
      {lage.status === "saknas" ? (
        <p className="posthistorik-info">Historik per post finns i delat läge när databasen har tabellen poster.</p>
      ) : null}
      {lage.status === "fel" ? <p className="posthistorik-info">Kunde inte hämta historiken ({lage.fel}).</p> : null}
      {lage.status === "klar" && !lage.rader.length ? <p className="posthistorik-info">Ingen historik ännu.</p> : null}
      {lage.status === "klar" && lage.rader.length ? (
        <ol className="posthistorik-lista">
          {lage.rader.map((r) => (
            <li key={r.version}>
              <div className="posthistorik-rubrik">
                <b>{r.rubrik}</b> · {fmtLoggTid(r.tid)} · {r.av || "okänd"}
                <span className="posthistorik-version">v{r.version}</span>
              </div>
              {r.andringar.length ? (
                <ul>
                  {r.andringar.map((a) => (
                    <li key={a.falt}>
                      {a.namn}: <s>{a.fore}</s> → {a.efter}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
    </details>
  );
}
