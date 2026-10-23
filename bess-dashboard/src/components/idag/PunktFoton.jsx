import { useEffect, useState } from "react";
import { skapaRitningsArkiv } from "../../state/ritningsArkiv.js";

/* Fotona på en punkt (lib/siterunda.js). Bilderna hämtas ur arkivet när
   panelen öppnas; i portfolj/state finns bara sökvägen. */
export function PunktFoton({ foton }) {
  const [urler, setUrler] = useState([]);
  const [fel, setFel] = useState(false);
  useEffect(() => {
    let aktiv = true;
    const skapade = [];
    Promise.all(
      foton.map(async (f) => {
        const blob = await skapaRitningsArkiv(f.lagring).hamta(f.sokvag);
        if (!blob) return null;
        const u = URL.createObjectURL(blob);
        skapade.push(u);
        return u;
      })
    )
      .then((u) => aktiv && setUrler(u))
      .catch(() => aktiv && setFel(true));
    return () => {
      aktiv = false;
      skapade.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [foton]);

  if (fel) return <p className="m-0 text-[13px] text-ink-soft">Fotona kunde inte hämtas just nu.</p>;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Foton på punkten">
      {foton.map((f, i) =>
        urler[i] ? (
          <li key={f.sokvag}>
            <a href={urler[i]} target="_blank" rel="noreferrer">
              <img src={urler[i]} alt={`Foto ${i + 1} på punkten`} className="block h-24 w-24 rounded-lg object-cover" />
            </a>
          </li>
        ) : (
          <li key={f.sokvag} className="h-24 w-24 rounded-lg bg-sunken" aria-label={`Foto ${i + 1} laddas`} />
        )
      )}
    </ul>
  );
}
