import { useState } from "react";
import { useAuth } from "../state/hooks.js";
import logotyp from "../assets/one-nordic-logo.png";

/* Inloggningsgrind. Visas i stället för arbetsytan tills någon är inloggad och
   finns på allowed_users — RLS ger ändå ingen data innan dess, så det är bättre
   att säga varför än att visa en tom portfölj. */
export function Inloggning() {
  const { status, epost: inloggadSom, tillaten, skickaLank, loggaInMedGoogle, loggaUt } = useAuth();
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

  async function google() {
    setLage("google");
    setFel("");
    try {
      // Sidan lämnas för Googles inloggning och kommer tillbaka hit inloggad.
      await loggaInMedGoogle();
    } catch (err) {
      setFel(err?.message || "Okänt fel");
      setLage("googlefel");
    }
  }

  // Inloggad men inte upplagd av administratören.
  const avvisad = status === "inloggad" && !tillaten;

  return (
    <div className="inlogg med-bild" style={{
        "--inlogg-bild": `url(${import.meta.env.BASE_URL}assets/bess-park-flyg.jpg)`,
        "--inlogg-bild-webp": `image-set(url(${import.meta.env.BASE_URL}assets/bess-park-flyg-1280.webp) type("image/webp"), url(${import.meta.env.BASE_URL}assets/bess-park-flyg.jpg) type("image/jpeg"))`,
      }}>
      <div className="card inlogg-kort">
        {/* Logotypen med one-nordic.se under, i samma blå (grafiska manualen 2025). */}
        <div className="inlogg-marke">
          <img src={logotyp} alt="ONE Nordic" className="inlogg-logo" />
          <span className="inlogg-dom">one-nordic.se</span>
        </div>
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
          <>
          <button
            type="button"
            className="btn sec inlogg-google"
            onClick={google}
            disabled={lage === "google"}
            style={{ marginTop: 16, width: "100%" }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
            </svg>
            {lage === "google" ? "Öppnar Google…" : "Logga in med Google"}
          </button>
          {lage === "googlefel" && (
            <div className="note err" role="alert" style={{ marginTop: 12 }}>
              Kunde inte starta Google-inloggningen: {fel}
            </div>
          )}
          <div className="inlogg-eller" aria-hidden="true">eller</div>
          <form onSubmit={skicka}>
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
          </>
        )}
      </div>
    </div>
  );
}
