import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { PILL } from "../../data/konstanter.js";

/* Fält som skriver tillbaka först vid blur eller Enter.
   Varför inte rak onChange mot state: originalets onchange-attribut commitade
   vid blur. Skulle vi dispatcha per tangenttryck skulle autosparet och den
   delade synken gå igång på varje bokstav, och hela trädet renderas om mitt i
   inmatningen. Lokalt utkast + commit vid blur ger samma beteende som förut
   och håller skrivningen snabb.

   Fältet synkas om utifrån när värdet ändras av någon annan (delad lagring),
   men bara när det inte har fokus — annars skulle någon annans ändring
   skriva över det man just håller på att skriva. */

function useUtkast(varde, harFokus) {
  const [utkast, setUtkast] = useState(varde ?? "");
  const [forra, setForra] = useState(varde);

  // Justering under render (Reacts dokumenterade mönster för att synka state
  // mot ändrade props) i stället för en effekt — undviker en extra commit.
  if (forra !== varde) {
    setForra(varde);
    if (!harFokus.current) setUtkast(varde ?? "");
  }

  return [utkast, setUtkast];
}

export function Falt({ varde, onCommit, typ = "text", etikett, flerrad = false, ...rest }) {
  const harFokus = useRef(false);
  const [utkast, setUtkast] = useUtkast(varde, harFokus);

  /* Commit även när fältet försvinner med fokus kvar. En Slideover som stängs
     med Escape tar bort fältet ur DOM:en utan att blur når React, och då
     skulle det man just skrivit gå förlorat. Senaste värdena hålls i en ref
     så att städfunktionen — som bara körs vid avmontering — ser dem. */
  const senaste = useRef(null);
  useEffect(() => {
    senaste.current = { utkast, varde, onCommit };
  });
  useEffect(
    () => () => {
      const s = senaste.current;
      if (harFokus.current && s && String(s.utkast ?? "") !== String(s.varde ?? "")) s.onCommit(s.utkast);
    },
    []
  );

  const commit = () => {
    harFokus.current = false;
    if (String(utkast ?? "") !== String(varde ?? "")) onCommit(utkast);
  };

  const gemensamt = {
    value: utkast ?? "",
    onChange: (e) => setUtkast(e.target.value),
    onFocus: () => {
      harFokus.current = true;
    },
    onBlur: commit,
    "aria-label": etikett,
    ...rest,
  };

  if (flerrad) {
    return (
      <textarea
        {...gemensamt}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter sparar utan att lämna fältet.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
        }}
      />
    );
  }

  return (
    <input
      type={typ}
      {...gemensamt}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          setUtkast(varde ?? "");
          e.currentTarget.blur();
        }
      }}
    />
  );
}

/** Numeriskt fält — tomt värde blir null, inte 0. */
export function NumFalt({ varde, onCommit, etikett, ...rest }) {
  return (
    <Falt
      varde={varde ?? ""}
      etikett={etikett}
      inputMode="decimal"
      onCommit={(v) => onCommit(v === "" ? null : Number(v))}
      {...rest}
    />
  );
}

export function DatumFalt({ varde, onCommit, etikett, ...rest }) {
  return <Falt typ="date" varde={varde || ""} onCommit={onCommit} etikett={etikett} {...rest} />;
}

/** Kryssruta med synlig etikett. */
export function Kryss({ id, checked, onChange, children }) {
  return (
    <div className="cbrow">
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <label htmlFor={id}>{children}</label>
    </div>
  );
}

/** Statusväljare. Kräver etikett — en naken <select> är otillgänglig.
 *  Alternativ är statusnycklar (texten hämtas ur PILL) eller [värde, text]. */
export function SelStatus({ alternativ, varde, onChange, etikett, ...rest }) {
  return (
    <select value={varde ?? ""} onChange={(e) => onChange(e.target.value)} aria-label={etikett} {...rest}>
      {alternativ.map((a) => {
        const v = Array.isArray(a) ? a[0] : a;
        const t = Array.isArray(a) ? a[1] : (PILL[a] || [undefined, a])[1];
        return (
          <option key={v} value={v}>
            {t}
          </option>
        );
      })}
    </select>
  );
}

/** Ikonknapp för att ta bort en tabellrad. Etiketten namnger raden, så att
 *  skärmläsare och verktygstips säger vad som tas bort. */
export function TaBortKnapp({ etikett, onClick }) {
  return (
    <button type="button" className="btn sec mini !px-2" aria-label={etikett} title={etikett} onClick={onClick}>
      <Trash2 size={14} aria-hidden="true" />
    </button>
  );
}
