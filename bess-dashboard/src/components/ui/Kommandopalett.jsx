import { useEffect, useMemo, useRef, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { MILSTOLPE_MODELL, PILL } from "../../data/konstanter.js";
import { VYER } from "../../data/vyer.js";
import { riskvarde } from "../../lib/berakningar.js";

/* Kommandopalett (Ctrl/Cmd+K).
   Tillgänglighet: i standalone-versionen låg aria-selected på vanliga <li> utan
   listbox-roll, vilket skärmläsare ignorerar. Här är det en riktig combobox med
   aria-activedescendant, så det aktiva alternativet läses upp vid piltangenter. */
export function Kommandopalett() {
  const { state } = usePortfolj();
  const { visa, setValtProjekt } = useUi();
  const [oppen, setOppen] = useState(false);
  const [q, setQ] = useState("");
  const [vald, setVald] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const forraFokus = useRef(null);

  const index = useMemo(() => {
    const ut = [];
    VYER.filter((v) => v[0] !== "_sek").forEach(([id, namn]) =>
      ut.push({ t: "Vy", label: namn, sub: "", kor: () => visa(id) })
    );
    state.projekt.forEach((p) =>
      ut.push({
        t: "Site",
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
          visa("ata");
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
      ut.push({ t: "Risk", label: r.titel, sub: "RV " + riskvarde(r), kor: () => visa("risker") })
    );
    (state.punkter || []).forEach((p) =>
      ut.push({ t: "Punkt", label: p.titel, sub: p.agare || "", kor: () => visa("punkter") })
    );
    (state.kontakter || []).forEach((k) =>
      ut.push({ t: "Kontakt", label: k.namn, sub: `${k.roll} · ${k.org}`, kor: () => visa("kontakter") })
    );
    return ut;
  }, [state, visa, setValtProjekt]);

  const traffar = useMemo(() => {
    const s = q.toLowerCase().trim();
    if (!s) return index.filter((c) => c.t === "Vy" || c.t === "Site").slice(0, 14);
    return index.filter((c) => `${c.label} ${c.t} ${c.sub}`.toLowerCase().includes(s)).slice(0, 40);
  }, [q, index]);

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
  }, []);

  useEffect(() => {
    if (oppen) inputRef.current?.focus();
    else if (forraFokus.current instanceof HTMLElement) forraFokus.current.focus();
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

  const onKeyDown = (e) => {
    if (e.key === "Escape") return setOppen(false);
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
    <div
      className="cmdk on"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOppen(false);
      }}
    >
      <div className="box" role="dialog" aria-modal="true" aria-label="Sök och hoppa">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setVald(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Sök vy, site, ÄTA, risk, punkt eller kontakt…"
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
                onMouseEnter={() => setVald(i)}
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
    </div>
  );
}
