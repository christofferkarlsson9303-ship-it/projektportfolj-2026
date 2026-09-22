import { useEffect, useRef, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { AtaPrisgodkannande, AtaUnderlag, AtaUnderrattelse } from "../../components/ui/AtaDokument.jsx";
import { Note, Pill, SelStatus } from "../../components/ui/Primitiver.jsx";
import { DatumFalt, Falt, Kryss, NumFalt } from "../../components/ui/Falt.jsx";
import { ATA_KLASS, ATA_STATUS, ORSAKER, PRISGRUND } from "../../data/konstanter.js";
import { prisGrind, underrattelseLage } from "../../lib/berakningar.js";
import { idag } from "../../lib/datum.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { flagga } from "./flode.js";

/* Ärendepanelen — glider in från höger och låter tavlan ligga kvar bakom.

   Medvetet INTE en modal: ingen mörk overlay och ingen fokusfälla, för hela
   poängen är att översikten ska vara kvar. Escape och Stäng stänger, och
   fokus lämnas tillbaka till kortet man kom ifrån.

   Ingen sparaknapp. Fälten committar vid blur eller Enter rakt in i reducern,
   precis som i resten av verktyget, och autosparet i PortfolioProvider tar
   hand om resten.

   role="region" och etiketterna nedan är desamma som i det formulär panelen
   ersätter. Det är inte av gammal vana: Chrome exponerar inte ett <section>
   med enbart aria-label som landmärke, och e2e-sviten navigerar på just de
   namnen. */

const klassNamn = (v) => {
  const rad = ATA_KLASS.find(([k]) => k === v);
  return rad ? rad[1].split(" —")[0] : "Ej klassificerad";
};

/** Grind ur ABT 06 som en rad text med färg. */
function Grind({ lage, ikon }) {
  if (!lage) return null;
  const kl = lage.varning ? "bad" : lage.ok ? "ok" : "";
  return (
    <span className={`grind ${kl}`.trim()}>
      <span aria-hidden="true">{ikon} </span>
      {lage.txt}
    </span>
  );
}

/* Rubriken redigeras på plats: den ser ut som text tills man klickar eller
   tabbar till den. En knapp, inte en div med onClick — annars når man den
   inte med tangentbordet. */
function Rubrikfalt({ varde, onCommit }) {
  const [redigerar, setRedigerar] = useState(false);
  const knappRef = useRef(null);

  if (!redigerar) {
    return (
      <button
        type="button"
        ref={knappRef}
        className="atainline-rubrik"
        onClick={() => setRedigerar(true)}
        title="Klicka för att ändra benämningen"
      >
        {varde || "Utan benämning"}
      </button>
    );
  }

  return (
    <Falt
      varde={varde}
      etikett="Benämning"
      autoFocus
      onCommit={(v) => {
        onCommit(v);
        setRedigerar(false);
        // Tillbaka till knappen, annars tappar tangentbordet sin plats.
        requestAnimationFrame(() => knappRef.current?.focus());
      }}
    />
  );
}

/** Speglar det verkliga sparläget ur providern i stället för att hitta på ett. */
function Sparindikator() {
  const { conn } = usePortfolj();
  const txt = conn?.txt || "";

  if (/^Sparar/i.test(txt)) return <span className="atasparad sparar">Sparar…</span>;
  if (/sparad|uppdaterad|hämtad/i.test(txt)) return <span className="atasparad">Sparat</span>;
  return null;
}

export function AtaDrawerDetails({ u, onStang }) {
  const { state, uppd, uppdStatus, uppdBool, taBort, laggTill } = usePortfolj();
  const { bekrafta, visaToast, oppnaPost, skrivUt } = useUi();
  const panelRef = useRef(null);

  const und = underrattelseLage(u);
  const pris = prisGrind(u);
  const f = flagga(u);
  const dagbok = state.dagbok.filter((d) => d.ataRef === u.nr && d.projektId === u.projektId);
  const projektet = state.projekt.find((p) => p.id === u.projektId) || null;
  const orsak = ORSAKER.find((o) => o[0] === u.orsak);

  const satt = (falt, varde) =>
    falt === "status" ? uppdStatus("ur", u.id, falt, varde) : uppd("ur", u.id, falt, varde);

  /* Flytta in fokus när panelen öppnas, och stäng på Escape. */
  useEffect(() => {
    panelRef.current?.focus();
    const vidTangent = (e) => {
      if (e.key === "Escape") onStang();
    };
    window.addEventListener("keydown", vidTangent);
    return () => window.removeEventListener("keydown", vidTangent);
  }, [onStang]);

  const taBortPost = async () => {
    const ja = await bekrafta("Posten och dess kalkyl tas bort. Åtgärden går inte att ångra.", {
      titel: "Ta bort UR/ÄTA-posten?",
      ok: "Ta bort",
      fara: true,
    });
    if (!ja) return;
    taBort("ur", u.id);
    onStang();
    visaToast("Posten borttagen", "warn");
  };

  /* Raden skapas här och Dagbok-vyn öppnar den — ÄTA-numret följer med som
     referens, vilket är det som binder ihop underlaget vid fakturering. */
  const nyDagboksrad = () => {
    const id = "d" + Date.now();
    laggTill("dagbok", {
      id,
      projektId: u.projektId,
      ataRef: u.nr,
      titel: u.benamning || "",
      startdatum: idag(),
      omfattning: "",
      vader: "",
      kostnad: "",
      ombud: "",
      forvantadTid: "",
      faktiskTid: "",
      kravSignering: false,
      signerad: false,
      fakturerad: false,
      notering: "",
    });
    oppnaPost("dagbok", id);
  };

  const nyUnderrattelse = () => {
    const nr = state.storningar.filter((s) => s.projektId === u.projektId).length + 1;
    const id = "s" + Date.now();
    laggTill("storningar", {
      id,
      projektId: u.projektId,
      nr: "ST" + String(nr).padStart(3, "0"),
      affarsId: "",
      aoNummer: projektet?.nr || "",
      projektNamn: projektet ? `${projektet.nr} ${projektet.namn}` : "",
      datum: idag(),
      upprattadAv: hamtaNamn() || "Christoffer Karlsson",
      projektledare: hamtaNamn() || "Christoffer Karlsson",
      projektchef: "",
      ataNummer: u.nr,
      till: "Ingrid Capacity",
      rutaA: `${u.nr} — ${u.benamning}`,
      rutaB: "",
      rutaC: "",
      rutaD: "",
      rutaE: "",
      rutaF: "",
      begarSynpunkter: false,
      innebarForsening: true,
      svarSenast: "",
      status: "utkast",
    });
    oppnaPost("storning", id);
  };

  return (
    <aside
      className="atadrawer"
      role="region"
      aria-label={`Ärende ${u.nr}`}
      tabIndex={-1}
      ref={panelRef}
    >
      <header className="atadrawer-topp">
        <div className="atadrawer-rubrik">
          <div className="atadrawer-meta">
            {f ? (
              <span className={`atabadge ${f.niva}`} title={f.txt}>
                <span aria-hidden="true">{f.ikon}</span>
                <span className="sr-only">{f.txt}</span>
              </span>
            ) : null}
            <Pill status={u.status} />
            <span className={`klasstag k-${u.klass || "oklar"}`}>{klassNamn(u.klass)}</span>
          </div>
          {/* Panelen behöver en egen rubrik — ett landmärke utan rubrik är
              svårt att orientera sig i, och numret är det man söker på. */}
          <h3 className="atadrawer-titel">
            {u.nr} —{" "}
            <Rubrikfalt varde={u.benamning} onCommit={(v) => satt("benamning", v)} />
          </h3>
        </div>
        <div className="atadrawer-verktyg">
          <Sparindikator />
          <button type="button" className="btn sec mini" onClick={onStang}>
            Stäng
          </button>
        </div>
      </header>

      <div className="atadrawer-kropp">
        <div className="atagrindar">
          <Grind lage={und} ikon="⏱" />
          <Grind lage={pris} ikon="🔒" />
        </div>

        <div className="frow c2">
          <div className="f">
            <label htmlFor={`nr-${u.id}`}>Nummer</label>
            <Falt id={`nr-${u.id}`} varde={u.nr} etikett="Ärendenummer" onCommit={(v) => satt("nr", v)} />
          </div>
          <div className="f">
            <label htmlFor={`st-${u.id}`}>Status (ÄTA-loggen)</label>
            <SelStatus
              id={`st-${u.id}`}
              alternativ={ATA_STATUS}
              varde={u.status}
              etikett={`Status för ${u.nr}`}
              onChange={(v) => satt("status", v)}
            />
          </div>
        </div>

        <div className="f">
          <label htmlFor={`kl-${u.id}`}>Klassificering (flöde 2.4)</label>
          <select id={`kl-${u.id}`} value={u.klass || ""} onChange={(e) => satt("klass", e.target.value)}>
            {ATA_KLASS.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="f">
          <label htmlFor={`or-${u.id}`}>Orsak enligt flödesschema 2.4</label>
          <select id={`or-${u.id}`} value={u.orsak || ""} onChange={(e) => satt("orsak", e.target.value)}>
            <option value="">— välj orsak —</option>
            {ORSAKER.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
          {orsak ? (
            <div className="guide">
              {orsak[2] === "ingen" ? (
                "Störningen beror på ONE — ingen underrättelse ska skickas och ingen ersättning utgår."
              ) : (
                <>
                  Orsaken pekar mot <b>{orsak[2] === "ata" ? "ÄTA" : "hinder"}</b>. Underrättelse om
                  störning ska skickas oavsett.
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="frow c2">
          <div className="f">
            <label htmlFor={`hd-${u.id}`}>Händelsedatum</label>
            <DatumFalt
              id={`hd-${u.id}`}
              varde={u.handelseDatum}
              etikett="Händelsedatum"
              onCommit={(v) => satt("handelseDatum", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`ud-${u.id}`}>Underrättelse skickad</label>
            <DatumFalt
              id={`ud-${u.id}`}
              varde={u.underrattelseDatum}
              etikett="Datum då underrättelse skickades"
              onCommit={(v) => satt("underrattelseDatum", v)}
            />
          </div>
        </div>

        <div className="f">
          <label htmlFor={`pg-${u.id}`}>Prissättningsgrund</label>
          <select
            id={`pg-${u.id}`}
            value={u.prisgrund || ""}
            onChange={(e) => satt("prisgrund", e.target.value)}
          >
            {PRISGRUND.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="frow c3">
          <div className="f">
            <label htmlFor={`bl-${u.id}`}>Belopp (kr)</label>
            <NumFalt
              id={`bl-${u.id}`}
              typ="number"
              varde={u.belopp}
              etikett="Belopp i kronor"
              onCommit={(v) => satt("belopp", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`gd-${u.id}`}>Godkänt pris (datum)</label>
            <DatumFalt
              id={`gd-${u.id}`}
              varde={u.godkantDatum}
              etikett="Datum för skriftligt godkänt pris"
              onCommit={(v) => satt("godkantDatum", v)}
            />
          </div>
          <div className="f">
            <label htmlFor={`fd-${u.id}`}>Fakturerad (datum)</label>
            <DatumFalt
              id={`fd-${u.id}`}
              varde={u.fakturaDatum}
              etikett="Fakturadatum"
              onCommit={(v) => satt("fakturaDatum", v)}
            />
          </div>
        </div>

        <Kryss
          id={`ab-${u.id}`}
          checked={u.arbeteStartat}
          onChange={(v) => uppdBool("ur", u.id, "arbeteStartat", v)}
        >
          Arbetet är påbörjat på plats
        </Kryss>

        <Note>
          <b>Dagboksunderlag.</b>{" "}
          {dagbok.length
            ? `${dagbok.length} dagboksrad${dagbok.length > 1 ? "er" : ""} är kopplade till ${u.nr}.`
            : `Ingen dagboksrad är kopplad till ${u.nr} ännu. Utan dagbok blir ÄTA:t svårt att driva.`}{" "}
          Dagboken ska per ÄTA innehålla startdatum, omfattning, väder och temperatur, kostnad samt
          förväntad och faktisk tidsåtgång.
        </Note>

        <div className="rowbtns">
          <button type="button" className="btn sec" onClick={nyDagboksrad}>
            + Dagboksrad
          </button>
          <button type="button" className="btn sec" onClick={nyUnderrattelse}>
            + Underrättelse om störning
          </button>
          <button type="button" className="btn sec" onClick={taBortPost}>
            Ta bort
          </button>
        </div>

        <div className="rowbtns">
          <button
            type="button"
            className="btn sec"
            onClick={() => skrivUt(<AtaUnderrattelse u={u} projekt={projektet} />)}
          >
            Underrättelse (PDF)
          </button>
          <button
            type="button"
            className="btn sec"
            onClick={() => skrivUt(<AtaPrisgodkannande u={u} projekt={projektet} />)}
          >
            Prisgodkännande (PDF)
          </button>
          <button
            type="button"
            className="btn sec"
            onClick={() => skrivUt(<AtaUnderlag u={u} projekt={projektet} dagbok={dagbok} />)}
          >
            Underlag (PDF)
          </button>
        </div>
      </div>
    </aside>
  );
}
