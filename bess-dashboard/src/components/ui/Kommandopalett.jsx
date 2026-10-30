import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePortfolj, usePortfoljAtgarder, useUi } from "../../state/hooks.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { nyAtaPost } from "../../lib/nyaPoster.js";
import { nyttId } from "../../lib/id.js";
import { idag } from "../../lib/datum.js";
import { medForslag, skapaForslag } from "../../lib/kommandon.js";
import { MILSTOLPE_MODELL, PILL } from "../../data/konstanter.js";
import { VYER } from "../../data/vyer.js";
import { riskvarde } from "../../lib/berakningar.js";
import { ALLA_PUNKTER } from "../../data/bessChecklistData.ts";
import { useSnabbUtskrift } from "../field/SnabbUtskrift.jsx";
import { FASBLANKETTER, utforareMedUppgifter } from "../../lib/snabbutskrift.js";

/* Kommandopalett (Ctrl/Cmd+K).
   Tillgänglighet: i standalone-versionen låg aria-selected på vanliga <li> utan
   listbox-roll, vilket skärmläsare ignorerar. Här är det en riktig combobox med
   aria-activedescendant, så det aktiva alternativet läses upp vid piltangenter.
   Paletten är en native <dialog> öppnad med showModal() (F1, granskning 2026-10-29):
   dialogroll, inert sida bakom, top layer och Escape/bakåtgest kommer från webbläsaren.
   Åtgärder (lib/kommandon.js): fasta åtgärder överst när sökfältet är tomt, och
   "Ny punkt"/"Ny ÄTA" ur det man skrivit — sist i listan, först efter "+". */
export function Kommandopalett() {
  const { state } = usePortfolj();
  const { visa, setValtProjekt, valtProjekt, oppnaPost, oppnaFaltmaterial, sokOppen: oppen, setSokOppen: setOppen, setHandelseOppen, setLage, vaxlaTema, visaToast } = useUi();
  const { laggTill } = usePortfoljAtgarder();
  const snabb = useSnabbUtskrift();
  const [q, setQ] = useState("");
  const [vald, setVald] = useState(0);
  const dlgRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const forraFokus = useRef(null);

  const index = useMemo(() => {
    const ut = [
      { t: "Åtgärd", label: "Registrera händelse", sub: "Vad hände, foto och plats", kor: () => setHandelseOppen(true) },
      { t: "Åtgärd", label: "Visa alla projekt i Idag", sub: "Portföljläge", kor: () => { setLage("portfolj"); visa("idag"); } },
      { t: "Åtgärd", label: "Byt mellan ljust och mörkt läge", sub: "Tema", kor: vaxlaTema },
    ];
    ut.push({ t: "Vy", label: "Projektets egenkontrollrapport", sub: "Beställare / slutdokumentation / hela projektet", kor: () => oppnaFaltmaterial({ mallpaket: "projekt" }) }, { t: "Vy", label: "Skapa fältmaterial", sub: "Arbetslista / egenkontroll / PDF", kor: () => oppnaFaltmaterial() });
    const vp = state.projekt.find((p) => p.id === valtProjekt);
    if (vp) {
      const pn = `${vp.nr ? vp.nr + " " : ""}${vp.namn}`;
      utforareMedUppgifter(state, vp.id).forEach((n) =>
        ut.push({ t: "Skriv ut", label: `Arbetslista till ${n}`, sub: `Öppna uppgifter · ${pn}`, kor: () => snabb.arbetslista(vp.id, { utforare: n }) })
      );
      ut.push({ t: "Skriv ut", label: "Arbetslista för alla", sub: `Öppna uppgifter · ${pn}`, kor: () => snabb.arbetslista(vp.id) });
      FASBLANKETTER.forEach((f) =>
        ut.push({ t: "Skriv ut", label: `Egenkontroll moment ${f.fas} – ${f.titel}`, sub: `Blank blankett · ${pn}`, kor: () => snabb.fasblankett(vp.id, f.fas) })
      );
    }
    VYER.filter((v) => v[0] !== "_sek").forEach(([id, namn, lead]) =>
      ut.push({ t: "Vy", label: namn, sub: lead, kor: () => visa(id) })
    );
    state.projekt.forEach((p) =>
      ut.push({
        t: "Projekt",
        label: (p.nr ? p.nr + " " : "") + p.namn,
        sub: p.ort || "",
        kor: () => {
          setValtProjekt(p.id);
          visa("oversikt");
        },
      })
    );
    (state.ur || []).forEach((u) =>
      ut.push({
        t: "ÄTA",
        label: `${u.nr} — ${u.benamning}`,
        sub: (PILL[u.status] || [undefined, u.status])[1],
        kor: () => {
          setValtProjekt(u.projektId);
          oppnaPost("ata", u.id);
        },
      })
    );
    MILSTOLPE_MODELL.forEach((m) =>
      ut.push({ t: "Milstolpe", label: `${m.kod} · ${m.namn}`, sub: m.andel + " %", kor: () => visa("milstolpar") })
    );
    (state.byggmoten || []).forEach((m) =>
      ut.push({
        t: "Protokoll",
        label: `${m.nr} — ${m.datum || ""}`,
        sub: m.plats || "",
        kor: () => {
          setValtProjekt(m.projektId);
          visa("moten");
        },
      })
    );
    (state.risker || []).forEach((r) =>
      ut.push({ t: "Risk", label: r.titel, sub: "RV " + riskvarde(r), kor: () => { setValtProjekt(r.projektId); oppnaPost("risker", r.id); } })
    );
    (state.punkter || []).forEach((p) =>
      ut.push({ t: "Punkt", label: p.titel, sub: p.agare || "", kor: () => visa("punkter") })
    );
    // Batteriparkens kontrollpunkter: sökbara på nummer och text, öppnas i guiden.
    ALLA_PUNKTER.forEach((kp) =>
      ut.push({
        t: "EPC",
        label: `${kp.id.replace("lop.", "∞.")} ${kp.text}`,
        sub: kp.badges.join(" "),
        kor: () => oppnaPost("epc", `kp-${kp.id}`),
      })
    );
    (state.kontakter || []).forEach((k) =>
      ut.push({ t: "Kontakt", label: k.namn, sub: `${k.roll} · ${k.org}`, kor: () => visa("kontakter") })
    );
    return ut;
  }, [state, visa, setValtProjekt, valtProjekt, oppnaPost, oppnaFaltmaterial, snabb, setHandelseOppen, setLage, vaxlaTema]);

  /* Skapa ur söktexten, i valt projekt. Moment sätts av reducern. */
  const forslagPoster = useMemo(() => {
    const vp = state.projekt.find((p) => p.id === valtProjekt);
    const f = skapaForslag(q, idag());
    if (!vp) return { forst: false, poster: [] };
    const pn = `${vp.nr ? vp.nr + " " : ""}${vp.namn}`;
    const poster = f.poster.map((x) =>
      x.typ === "punkt"
        ? {
            t: "Ny punkt",
            label: x.titel,
            sub: `${x.sub} · ${pn}`,
            kor: () => {
              laggTill("punkter", { id: nyttId("p"), projektId: vp.id, titel: x.titel, agare: hamtaNamn() || "Christoffer Karlsson", forfaller: x.forfaller, uppfoljning: x.uppfoljning, status: "oppen" });
              visaToast(`Punkt tillagd i ${pn} · ${x.sub}`);
            },
          }
        : {
            t: "Ny ÄTA",
            label: x.titel,
            sub: `${x.sub} · ${pn}`,
            kor: () => {
              const post = nyAtaPost(state, vp.id, { benamning: x.titel, ansvarig: hamtaNamn() || "" });
              laggTill("ur", post);
              setValtProjekt(vp.id);
              oppnaPost("ata", post.id);
              visaToast(`${post.nr} registrerad i ${pn} — fristen räknas från idag`);
            },
          }
    );
    return { forst: f.forst, poster };
  }, [q, state, valtProjekt, laggTill, visaToast, setValtProjekt, oppnaPost]);

  const traffar = useMemo(() => {
    const s = q.toLowerCase().trim().replace(/^\+\s*/, "");
    if (!s) return index.filter((c) => c.t === "Åtgärd" || c.t === "Vy" || c.t === "Projekt").slice(0, 16);
    const hittade = forslagPoster.forst ? [] : index.filter((c) => `${c.label} ${c.t} ${c.sub}`.toLowerCase().includes(s)).slice(0, 40);
    return medForslag(hittade, forslagPoster);
  }, [q, index, forslagPoster]);

  // Global genväg
  useEffect(() => {
    const ned = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        forraFokus.current = document.activeElement;
        setQ("");
        setVald(0);
        setOppen(true);
      }
    };
    window.addEventListener("keydown", ned);
    return () => window.removeEventListener("keydown", ned);
  }, [setOppen]);

  /* Öppnas som modal innan fokus flyttas till sökfältet (layout-effekten körs först).
     Stängs paletten tas rutan bort ur DOM:en, och därmed ur top layer. close() anropas
     inte: webbläsarens fokusåtergång rullar, och det är just det preventScroll nedan
     undviker. */
  useLayoutEffect(() => {
    const d = dlgRef.current;
    if (!oppen || !d || d.open) return;
    // Före showModal(): den flyttar fokus in i rutan direkt, och då vore utlösaren borta.
    forraFokus.current = document.activeElement;
    d.showModal?.();
  }, [oppen]);

  useEffect(() => {
    if (oppen) inputRef.current?.focus();
    // Utan preventScroll avbryter fokusåterställningen en rullning som målvyn
    // just startat — t.ex. checklistan som rullar fram en utpekad punkt.
    else if (forraFokus.current instanceof HTMLElement) forraFokus.current.focus({ preventScroll: true });
  }, [oppen]);

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [vald, traffar]);

  if (!oppen) return null;

  const kor = (i) => {
    const t = traffar[i];
    setOppen(false);
    if (t) t.kor();
  };

  // Escape hanteras av dialogens cancel-händelse.
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setVald((v) => Math.min(v + 1, traffar.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setVald((v) => Math.max(v - 1, 0));
    }
    if (e.key === "Enter" && traffar[vald]) {
      e.preventDefault();
      kor(vald);
    }
  };

  return (
    <dialog
      ref={dlgRef}
      className="cmdk"
      aria-label="Sök och hoppa"
      // Escape och bakåtgest: stängningen styrs av sokOppen, rutan tas bort i stället.
      onCancel={(e) => {
        e.preventDefault();
        setOppen(false);
      }}
      // Stänger webbläsaren ändå (upprepad Escape) följer läget med.
      onClose={() => setOppen(false)}
      // Klick på ::backdrop har dialogen som mål, eftersom .box fyller hela dialogen.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOppen(false);
      }}
    >
      <div className="box">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVald(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Sök, eller skriv en ny punkt eller ÄTA (+ först = punkt)…"
          role="combobox"
          aria-expanded="true"
          aria-controls="cmdlist"
          aria-autocomplete="list"
          aria-activedescendant={traffar.length ? `cmd-${vald}` : undefined}
          aria-label="Sök och hoppa"
        />
        <ul id="cmdlist" role="listbox" ref={listRef} aria-label="Träffar">
          {traffar.length ? (
            traffar.map((c, i) => (
              <li
                key={`${c.t}-${c.label}-${i}`}
                id={`cmd-${i}`}
                role="option"
                aria-selected={i === vald}
                /* Bara verklig musrörelse flyttar markeringen. mouseenter
                   utlöses också när listan byggs om under en stilla pekare,
                   och då kunde Enter hoppa till fel träff. */
                onMouseMove={(e) => {
                  if ((e.movementX || e.movementY) && i !== vald) setVald(i);
                }}
                onClick={() => kor(i)}
              >
                <span className="ct">{c.t}</span>
                <span className="cl">{c.label}</span>
                {c.sub ? <span className="cs">{c.sub}</span> : null}
              </li>
            ))
          ) : (
            <li className="ctom">Inga träffar</li>
          )}
        </ul>
      </div>
    </dialog>
  );
}
