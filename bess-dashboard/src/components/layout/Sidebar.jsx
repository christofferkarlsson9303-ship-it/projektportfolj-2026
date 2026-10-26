import { useEffect, useId, useRef, useState } from "react";
import logotyp from "../../assets/one-nordic-logo.png";
import { INGANGAR, NAVIKONER, VYMETA, ingangFor } from "../../data/vyer.js";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { hamtaNamn, sparaNamn } from "../../state/portfolj-reducer.js";
import { useMedia } from "../../lib/useMedia.js";

/* Ikon per ingång: lånad från den vy ingången öppnar först. */
const INGANG_IKON = { idag: "idag", projektet: "epc", pengar: "ekonomi" };
const SOK_IKON = '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>';

/** "14:02" i dag, annars "2026-10-20 14:02". */
function bekraftadText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tid = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  const dag = d.toLocaleDateString("sv-SE");
  return dag === new Date().toLocaleDateString("sv-SE") ? tid : `${dag} ${tid}`;
}

export function Sidebar() {
  const { conn, synk } = usePortfolj();
  const { aktivVy, visa, navOppen, setNavOppen, setSokOppen } = useUi();
  const [namn, setNamn] = useState(hamtaNamn);
  const aktivIngang = ingangFor(aktivVy);
  /* Senast öppnade flik per ingång, så att ett klick på ingången tar dig
     tillbaka dit du var. Lever bara i sessionen. */
  const senaste = useRef({});
  useEffect(() => {
    if (aktivIngang) senaste.current[aktivIngang.id] = aktivVy;
  }, [aktivIngang, aktivVy]);
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
            <div className="dom">one-nordic.se</div>
          </div>
          {arMobil ? <button type="button" className="rounded-sm border border-solid border-white/30 bg-transparent p-2 text-xs text-white" onClick={() => setNavOppen(false)}>Stäng sidomenyn</button> : null}
        </div>

        {/* Applikationsnamnet är varumärkesinformation, inte sidans rubrik.
            Som <h1> gav det två h1 på sidan — sidans enda h1 ska vara den
            aktiva vyns titel i topbaren. */}
        <div className="sidebar-title">
          <p className="sidebar-namn">Projektportfölj</p>
          <div className="sub">Planera, genomför och lämna över dina projekt</div>
        </div>

        <nav className="sidenav" id="nav" aria-label="Huvudmeny">
          {INGANGAR.map((g) => {
            const aktiv = g.id === aktivIngang?.id;
            return (
              <button
                key={g.id}
                type="button"
                className={aktiv ? "on" : ""}
                onClick={() => visa(senaste.current[g.id] || g.vyer[0])}
                title={g.fraga}
                aria-current={aktiv ? "page" : undefined}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: NAVIKONER[INGANG_IKON[g.id]] || "" }} />
                <span>{g.namn}</span>
              </button>
            );
          })}
          {/* Ett öppet verktyg visas som aktuell plats, så att man ser var man är. */}
          {!aktivIngang && VYMETA[aktivVy] ? (
            <div className="nav-grupp" role="group" aria-label="Öppet verktyg">
              <div className="navsek">Verktyg</div>
              <button type="button" className="on" aria-current="page" onClick={() => visa(aktivVy)}>
                <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: NAVIKONER[aktivVy] || "" }} />
                <span>{VYMETA[aktivVy].namn}</span>
              </button>
            </div>
          ) : null}
          <button type="button" className="nav-verktyg" onClick={() => setSokOppen(true)} aria-haspopup="dialog" title="Kontrakt, kontakter, dagbok, möten, rutiner och andra verktyg (Ctrl/Cmd+K)">
            <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: SOK_IKON }} />
            <span>Verktyg</span>
          </button>
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
          {synk?.osparat || synk?.senastBekraftad ? (
            <div className="conn-synk">
              {synk.osparat ? <b>Osparade ändringar väntar{synk.forsok ? ` · försök ${synk.forsok}` : ""}</b> : null}
              {synk.senastBekraftad ? <span>Senast bekräftad {bekraftadText(synk.senastBekraftad)}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

