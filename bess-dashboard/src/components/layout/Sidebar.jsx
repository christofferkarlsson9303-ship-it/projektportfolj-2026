import { useEffect, useId, useRef, useState } from "react";
import logotyp from "../../assets/one-nordic-logo.png";
import { NAVIKONER, VYER } from "../../data/vyer.js";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { hamtaNamn, sparaNamn } from "../../state/portfolj-reducer.js";
import { useMedia } from "../../lib/useMedia.js";

/** Grupperar VYER på sektionsrubrikerna (_sek) så att navigationen blir
 *  semantiska grupper i stället för en platt lista med lösa rubrik-divar. */
function grupper() {
  const ut = [];
  let nuvarande = { rubrik: null, poster: [] };
  for (const [id, namn, lead] of VYER) {
    if (id === "_sek") {
      if (nuvarande.poster.length) ut.push(nuvarande);
      nuvarande = { rubrik: namn, poster: [] };
    } else {
      nuvarande.poster.push({ id, namn, lead });
    }
  }
  if (nuvarande.poster.length) ut.push(nuvarande);
  return ut;
}

const GRUPPER = grupper();

export function Sidebar() {
  const { conn } = usePortfolj();
  const { aktivVy, visa, navOppen, setNavOppen } = useUi();
  const [namn, setNamn] = useState(hamtaNamn);
  const sidebarRef = useRef(null);
  const namnId = useId();

  /* Under 980 px är menyn utfälld ur bild med transform. Den är då fortfarande
     fokuserbar — en tangentbordsanvändare kunde tabba in i en meny som inte
     syns. inert tar bort den ur både tabbordning och tillgänglighetsträd.
     Brytpunkten speglar .sidebar-regeln i design-system.css. */
  const arMobil = useMedia("(max-width: 980px)");
  const avstangd = arMobil && !navOppen;

  // Mobil: Escape stänger, och fokus flyttas in i menyn när den öppnas.
  useEffect(() => {
    if (!navOppen) return undefined;
    const ned = (e) => {
      if (e.key === "Escape") setNavOppen(false);
    };
    window.addEventListener("keydown", ned);
    sidebarRef.current?.querySelector("button")?.focus();
    return () => window.removeEventListener("keydown", ned);
  }, [navOppen, setNavOppen]);

  return (
    <>
      <div
        className={`navback ${navOppen ? "show" : ""}`.trim()}
        onClick={() => setNavOppen(false)}
        aria-hidden="true"
      />

      <div
        className={`sidebar ${navOppen ? "open" : ""}`.trim()}
        id="sidebar"
        ref={sidebarRef}
        inert={avstangd}
      >
        <div className="sidebar-top">
          <div>
            <img className="mark-img" src={logotyp} alt="ONE Nordic" />
            <div className="dom">onenordic.se</div>
          </div>
        </div>

        {/* Applikationsnamnet är varumärkesinformation, inte sidans rubrik.
            Som <h1> gav det två h1 på sidan — sidans enda h1 ska vara den
            aktiva vyns titel i topbaren. */}
        <div className="sidebar-title">
          <p className="sidebar-namn">Projektportfölj</p>
          <div className="sub">BESS — batteriparker i drift och under uppförande</div>
        </div>

        <nav className="sidenav" id="nav" aria-label="Huvudmeny">
          {GRUPPER.map((g, gi) => (
            <div key={g.rubrik || `grupp-${gi}`} role="group" aria-label={g.rubrik || "Portfölj"}>
              {g.rubrik ? <div className="navsek">{g.rubrik}</div> : null}
              {g.poster.map((v) => {
                const aktiv = v.id === aktivVy;
                return (
                  <button
                    key={v.id}
                    type="button"
                    className={aktiv ? "on" : ""}
                    onClick={() => visa(v.id)}
                    // aria-current ersätter den rent visuella .on-klassen
                    aria-current={aktiv ? "page" : undefined}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: NAVIKONER[v.id] || "" }} />
                    <span>{v.namn}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="namnfalt">
            <label htmlFor={namnId}>Ditt namn</label>
            <input
              id={namnId}
              type="text"
              value={namn}
              placeholder="för ändringsloggen"
              onChange={(e) => {
                setNamn(e.target.value);
                sparaNamn(e.target.value);
              }}
            />
          </div>

          {/* Synkstatus läses upp när den ändras, utan att flytta fokus. */}
          <div className="conn" role="status" aria-live="polite">
            <span className={`dot ${conn.kl}`.trim()} aria-hidden="true" />
            <span>{conn.txt}</span>
          </div>
        </div>
      </div>
    </>
  );
}
