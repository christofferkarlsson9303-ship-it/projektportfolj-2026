import { useEffect, useRef, useState } from "react";
import { Maximize2 } from "lucide-react";
import { Callout, Card, StatusBadge } from "../ds/index.js";
import { Skeleton } from "../ui/Skeleton.jsx";

/* Anbudsmodellen för projektet (lib/anbudsmodeller.js), orörd som den levererades. Filen hämtas
   först när kortet visas (egen chunk via ?raw) och körs i en iframe med sandbox="allow-scripts":
   ingen åtkomst till appens lagring, inloggning eller portfolj/state. Modellen hämtar three.js
   från cdnjs, så den kräver nät. */

const LADDARE = {
  "vaggeryd-100mw": () => import("../../sections/Site/anbud/vaggeryd-100mw-3d-2026-10-19.html?raw"),
};

export function SiteAnbudsmodell({ modell }) {
  const ram = useRef(null);
  // Det laddade hör till ett modell-id; byts modellen visas laddningen tills den nya filen kommit.
  const [laddat, setLaddat] = useState({ id: null, html: null, fel: "" });
  const ladda = LADDARE[modell?.id];

  useEffect(() => {
    if (!ladda) return undefined;
    let avbruten = false;
    const id = modell.id;
    ladda()
      .then((m) => {
        if (!avbruten) setLaddat({ id, html: m.default, fel: "" });
      })
      .catch(() => {
        if (!avbruten) setLaddat({ id, html: null, fel: "Modellfilen kunde inte laddas." });
      });
    return () => {
      avbruten = true;
    };
  }, [ladda, modell?.id]);

  const aktuell = laddat.id === modell?.id;
  const html = aktuell ? laddat.html : null;
  const fel = !ladda ? "Modellfilen saknas i appen." : aktuell ? laddat.fel : "";

  if (!modell) return null;

  const helskarm = () => {
    try {
      const r = ram.current?.requestFullscreen?.();
      r?.catch?.(() => {});
    } catch {
      /* helskärm nekad — modellen syns ändå i kortet */
    }
  };

  return (
    <Card
      id="site-anbudsmodell"
      title={`Anbudsmodell — ${modell.namn}`}
      subtitle={`${modell.plats}. ${modell.varianter}. Daterad ${modell.datum}.`}
      badge={<StatusBadge ton="info" label="Anbud" />}
      action={
        <button type="button" className="btn sec mini inline-flex items-center gap-1.5" onClick={helskarm} disabled={!html}>
          <Maximize2 size={14} aria-hidden="true" />
          Helskärm
        </button>
      }
    >
      {fel ? (
        <Callout ton="warn">
          <b>Modellen kan inte visas.</b> {fel}
        </Callout>
      ) : html ? (
        <iframe
          ref={ram}
          title={`3D-modell ${modell.namn}`}
          srcDoc={html}
          sandbox="allow-scripts"
          allow="fullscreen"
          loading="lazy"
          data-roll="anbudsmodell"
          className="block h-[62vh] max-h-[760px] min-h-[380px] w-full rounded-lg border border-solid border-hairline bg-sunken"
        />
      ) : (
        <Skeleton etikett="Laddar anbudsmodellen …" className="h-[62vh] max-h-[760px] min-h-[380px] w-full" />
      )}
      <p className="m-0 text-[12.5px] text-ink-soft">
        {modell.underlag} Modellen är ett underlag från anbudet. Den följer inte enheterna i siten nedan och sparas inte i portföljen.
      </p>
    </Card>
  );
}
