import { useState } from "react";
import { useAuth } from "../state/hooks.js";
import logotyp from "../assets/one-nordic-logo.png";

/* Inloggningsgrind. Visas i stället för arbetsytan tills någon är inloggad och
   finns på allowed_users — RLS ger ändå ingen data innan dess, så det är bättre
   att säga varför än att visa en tom portfölj. */
export function Inloggning() {
  const { status, epost: inloggadSom, tillaten, skickaLank, loggaUt } = useAuth();
  const [epost, setEpost] = useState("");
  const [lage, setLage] = useState("redo"); // redo | skickar | skickad | fel
  const [fel, setFel] = useState("");

  async function skicka(e) {
    e.preventDefault();
    if (!epost.trim()) return;
    setLage("skickar");
    setFel("");
    try {
      await skickaLank(epost);
      setLage("skickad");
    } catch (err) {
      setFel(err?.message || "Okänt fel");
      setLage("fel");
    }
  }

  // Inloggad men inte upplagd av administratören.
  const avvisad = status === "inloggad" && !tillaten;

  return (
    <div className="inlogg">
      <div className="card inlogg-kort">
        <img src={logotyp} alt="ONE Nordic" className="inlogg-logo" />
        <h1>Projektportfölj</h1>
        <div className="lead">BESS — batteriparker i drift och under uppförande</div>

        {avvisad ? (
          <>
            <div className="note" style={{ marginTop: 16 }}>
              <b>{inloggadSom}</b> har inte behörighet till portföljen. Be administratören lägga till
              adressen, så fungerar samma länk nästa gång.
            </div>
            <button type="button" className="btn sec" style={{ marginTop: 16 }} onClick={loggaUt}>
              Logga ut
            </button>
          </>
        ) : lage === "skickad" ? (
          <div className="note" style={{ marginTop: 16 }}>
            <b>Kolla mejlen.</b> En inloggningslänk är skickad till {epost}. Den öppnar portföljen
            direkt — inget lösenord behövs.
          </div>
        ) : (
          <form onSubmit={skicka} style={{ marginTop: 16 }}>
            <label htmlFor="inlogg-epost">
              E-postadress
            </label>
            <input
              id="inlogg-epost"
              type="email"
              required
              autoComplete="email"
              value={epost}
              onChange={(e) => setEpost(e.target.value)}
              placeholder="fornamn.efternamn@onenordic.se"
            />
            <button type="submit" className="btn" disabled={lage === "skickar"} style={{ marginTop: 12 }}>
              {lage === "skickar" ? "Skickar…" : "Skicka inloggningslänk"}
            </button>
            {lage === "fel" && (
              <div className="note err" role="alert" style={{ marginTop: 12 }}>
                Kunde inte skicka länken: {fel}
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
