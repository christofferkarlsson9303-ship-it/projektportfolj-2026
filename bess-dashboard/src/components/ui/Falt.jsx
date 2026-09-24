import { useEffect, useRef, useState } from "react";

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
