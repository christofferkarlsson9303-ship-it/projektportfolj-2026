import { useEffect, useRef, useState } from "react";
import { PdfExporter } from "../../components/print/PdfExporter.jsx";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { AtaPrisgodkannande, AtaUnderlag, AtaUnderrattelse } from "../../components/ui/AtaDokument.jsx";
import { DatumFalt, Falt, Kryss, NumFalt, SelStatus } from "../../components/ui/Falt.jsx";
import { ATA_ART, ATA_KLASS, ATA_STATUS, ORSAKER, PRISGRUND } from "../../data/konstanter.js";
import { prisGrind, underrattelseLage } from "../../lib/berakningar.js";
import { idag } from "../../lib/datum.js";
import { nyDagboksrad } from "../../lib/nyaPoster.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { flagga } from "./flode.js";
import { registerStatus } from "../../lib/status.js";
import { allaModellObjekt, arKopplad, byggKoppling } from "../../lib/modellKoppling.js";

import { Callout, StatusBadge } from "../../components/ds/index.js";
import { nyttId } from "../../lib/id.js";
/* ÄTA-panelen — glider in från höger och låter tavlan ligga kvar bakom.

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

const vek = (v) => (Array.isArray(v) ? v.map((n) => String(Math.round(n * 10) / 10).replace(".", ",")).join(" · ") : "—");

/** Koppling mellan ÄTA:n och ett objekt i 3D-modellen (objectGuid, kameravy, låda, modellversion). */
function Koppling3D({ u }) {
  const { state, dispatch } = usePortfolj();
  const { siteVal, visaISite, visaToast } = useUi();
  const o = arKopplad(u) ? allaModellObjekt(state, u.projektId).find((x) => x.id === u.objectGuid) : null;
  const markerat = siteVal ? allaModellObjekt(state, u.projektId).find((x) => x.id === siteVal) : null;

  const kopplaTillMarkerat = () => {
    dispatch({ type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: byggKoppling(markerat, { modelVersionId: (state.modellVersioner || []).filter((v) => v.projektId === u.projektId).at(-1)?.id || "" }) });
    visaToast(`${u.nr} kopplat till ${markerat.namn || "objektet"}.`);
  };

  return (
    <section aria-labelledby={`k3d-${u.id}`} className="mt-4 flex flex-col gap-2 rounded-lg border border-solid border-hairline bg-sunken p-3">
      <h4 id={`k3d-${u.id}`} className="m-0 font-head text-[13px] font-bold text-ink">
        Koppling till 3D-modellen
      </h4>
      {arKopplad(u) ? (
        <>
          <p className="m-0 text-[13px] text-ink">
            {o ? <>Objekt: <b>{o.namn || o.typ}</b></> : <>Objektet finns inte längre i modellen. Kopplingen ligger kvar tills du tar bort den.</>}
          </p>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
            <dt className="text-ink-soft">Objekt-ID (GUID)</dt>
            <dd className="m-0 break-all font-mono text-ink">{u.objectGuid}</dd>
            <dt className="text-ink-soft">Modellversion</dt>
            <dd className="m-0 text-ink">{u.modelVersionId || "—"}</dd>
            <dt className="text-ink-soft">Kamera</dt>
            <dd className="m-0 tabular-nums text-ink">{u.viewpoint ? `${vek(u.viewpoint.cameraPosition)} → ${vek(u.viewpoint.target)}` : "—"}</dd>
            <dt className="text-ink-soft">Låda (min – max)</dt>
            <dd className="m-0 tabular-nums text-ink">{u.boundingBox ? `${vek(u.boundingBox.min)} – ${vek(u.boundingBox.max)}` : "—"}</dd>
          </dl>
        </>
      ) : (
        <p className="m-0 text-[13px] text-ink-soft">ÄTA:n är inte kopplad till något objekt. Markera ett objekt i Siten i 3D för att koppla det hit.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {o ? (
          <button type="button" className="btn sec mini" onClick={() => visaISite(o.id)}>
            Visa i 3D
          </button>
        ) : null}
        {markerat && u.objectGuid !== markerat.id ? (
          <button type="button" className="btn sec mini" onClick={kopplaTillMarkerat}>
            Koppla till {markerat.namn || "markerat objekt"}
          </button>
        ) : null}
        {arKopplad(u) ? (
          <button type="button" className="btn sec mini" onClick={() => dispatch({ type: "ATA_LOSS_OBJEKT", id: u.id })}>
            Ta bort koppling
          </button>
        ) : null}
      </div>
    </section>
  );
}

export function AtaDrawerDetails({ u, onStang, onKalkyl }) {
  const { state, uppd, uppdStatus, uppdBool, taBort, laggTill } = usePortfolj();
  const { bekrafta, visaToast, oppnaPost, skrivUt } = useUi();
  const panelRef = useRef(null);
  const [pdfTyp, setPdfTyp] = useState("underrattelse");

  const und = underrattelseLage(u);
  const pris = prisGrind(u);
  const f = flagga(u);
  const dagbok = state.dagbok.filter((d) => d.ataRef === u.nr && d.projektId === u.projektId);
  const projektet = state.projekt.find((p) => p.id === u.projektId) || null;
  const orsak = ORSAKER.find((o) => o[0] === u.orsak);

  const satt = (falt, varde) =>
    falt === "status" ? uppdStatus("ur", u.id, falt, varde) : uppd("ur", u.id, falt, varde);

  /* Orsaken säger om omständigheten är ett hinder eller ett tillkommande arbete. Är posten ännu
     oklassificerad föreslås klassen ur orsaken; en klass någon redan satt skrivs aldrig över. */
  const valjOrsak = (v) => {
    satt("orsak", v);
    const forslag = ORSAKER.find((o) => o[0] === v)?.[2];
    if ((forslag === "ata" || forslag === "hinder") && (!u.klass || u.klass === "oklar")) satt("klass", forslag);
  };

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
  const nyDagboksradForArende = () => {
    const rad = nyDagboksrad(u.projektId, { ataRef: u.nr, titel: u.benamning || "" });
    laggTill("dagbok", rad);
    oppnaPost("dagbok", rad.id);
  };

  const nyUnderrattelse = () => {
    const nr = state.storningar.filter((s) => s.projektId === u.projektId).length + 1;
    const id = nyttId("s");
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
      aria-label={`ÄTA ${u.nr}`}
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
            <StatusBadge {...registerStatus(u.status)} />
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
            <Falt id={`nr-${u.id}`} varde={u.nr} etikett="ÄTA-nummer" onCommit={(v) => satt("nr", v)} />
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
          <label htmlFor={`art-${u.id}`}>Art</label>
          <select id={`art-${u.id}`} value={u.art || ""} onChange={(e) => satt("art", e.target.value)}>
            <option value="">— välj art —</option>
            {ATA_ART.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="f">
          <label htmlFor={`or-${u.id}`}>Orsak (hinder och störning är orsaker)</label>
          <select id={`or-${u.id}`} value={u.orsak || ""} onChange={(e) => valjOrsak(e.target.value)}>
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

        <div className="f">
          <label htmlFor={`kl-${u.id}`}>Behandlas som (följer orsaken)</label>
          <select id={`kl-${u.id}`} value={u.klass || ""} onChange={(e) => satt("klass", e.target.value)}>
            {ATA_KLASS.map(([v, n]) => (
              <option key={v} value={v}>
                {n}
              </option>
            ))}
          </select>
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

        <Koppling3D u={u} />

        <Callout ton="info" className="mt-4">
          <b>Dagboksunderlag.</b>{" "}
          {dagbok.length
            ? `${dagbok.length} dagboksrad${dagbok.length > 1 ? "er" : ""} är kopplade till ${u.nr}.`
            : `Ingen dagboksrad är kopplad till ${u.nr} ännu. Utan dagbok blir ÄTA:t svårt att driva.`}{" "}
          Dagboken ska per ÄTA innehålla startdatum, omfattning, väder och temperatur, kostnad samt
          förväntad och faktisk tidsåtgång.
        </Callout>

        <div className="rowbtns">
          {onKalkyl ? (
            <button type="button" className="btn" onClick={onKalkyl}>
              Öppna i kalkyl
            </button>
          ) : null}
          <button type="button" className="btn sec" onClick={nyDagboksradForArende}>
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
          <label className="text-sm">PDF-dokument<select value={pdfTyp} onChange={(e) => setPdfTyp(e.target.value)}><option value="underrattelse">Underrättelse</option><option value="pris">Prisgodkännande</option><option value="underlag">ÄTA-underlag</option></select></label>
          <PdfExporter dokument={{ ata: u, projekt: projektet || { id: u.projektId, namn: "" }, dagbok, datum: idag(), skapadAv: hamtaNamn() }} typ={pdfTyp} label="Ladda ned ÄTA-PDF" />
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
