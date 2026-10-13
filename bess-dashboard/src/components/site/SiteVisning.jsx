import { Camera, Sparkles } from "lucide-react";
import { DataList, StatusBadge } from "../ds/index.js";
import { HARDVARUPROFILER, PROFILORDNING, vardeText } from "../../data/hardvaruprofiler.js";
import { LAGER } from "../../lib/siteLager.js";

/* Reglagen runt 3D-siten: filterraden (lager, Hög kvalitet, hårdvaruprofil), kameraknapparna
   till höger i scenen och kortet med profilens komponentdata. Inget här sparas i portfolj/state
   utom projektets hårdvaruprofil (ett fält på projektet). Filter och Hög kvalitet är
   visningsval per webbläsare. */

const chip = (pa) =>
  `inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-solid px-3 text-[12.5px] font-semibold transition-colors ${
    pa ? "border-one-djup bg-one-djup text-white" : "border-hairline-stark bg-surface text-ink hover:bg-sunken"
  }`;

export function SiteFilterrad({ lager, onLager, hogKvalitet, onHogKvalitet, profilId, onProfil, kallor }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="group" aria-label="Lager i 3D-vyn" className="flex flex-wrap items-center gap-1.5">
        {LAGER.map((l) => (
          <button key={l.id} type="button" aria-pressed={!!lager[l.id]} className={chip(lager[l.id])} onClick={() => onLager({ ...lager, [l.id]: !lager[l.id] })}>
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: `var(${l.farg})` }} />
            {l.namn}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={hogKvalitet}
        className={chip(hogKvalitet)}
        onClick={() => onHogKvalitet(!hogKvalitet)}
        title={hogKvalitet && kallor ? `Texturer: ${Object.values(kallor).includes("genererad") ? "genererade" : "ritade i appen"}` : undefined}
      >
        <Sparkles size={14} aria-hidden="true" />
        Hög kvalitet
      </button>
      <label className="ml-auto flex items-center gap-2 text-[12.5px] text-ink-soft">
        Hårdvaruprofil
        <select value={profilId} onChange={(e) => onProfil(e.target.value)} className="min-h-[32px] rounded-md border border-solid border-hairline-stark bg-surface px-2 text-[12.5px] text-ink">
          {PROFILORDNING.map((id) => (
            <option key={id} value={id}>
              {HARDVARUPROFILER[id].namn}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Kameraknapparna. Ligger ovanpå scenen till höger; en vinkel utan mål (ingen skid 3, inget
 *  ställverk) är avstängd och säger varför. */
export function SiteKameror({ vinklar, onFlyg }) {
  return (
    <nav aria-label="Kameravinklar" className="absolute right-3 top-3 z-[3] flex max-h-[calc(100%-24px)] flex-col gap-1.5 overflow-y-auto">
      {vinklar.map((v) => (
        <button
          key={v.id}
          type="button"
          disabled={!v.vy}
          title={v.vy ? `Flyg till ${v.namn}` : `${v.namn} finns inte på siten än`}
          onClick={() => v.vy && onFlyg(v.vy)}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-solid border-hairline bg-surface px-2.5 text-left text-[12.5px] font-semibold text-ink shadow-sm hover:border-one-bla hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera size={14} aria-hidden="true" className="shrink-0" />
          {v.namn}
        </button>
      ))}
    </nav>
  );
}

/** Profilens komponenter med källor. Overifierade värden märks "Att verifiera". */
export function SiteProfilData({ profil, kpi }) {
  const rad = ([etikett, x]) => ({
    label: etikett,
    value: vardeText(x),
    detail: x.kalla,
    badge: x.verifierad ? null : <StatusBadge ton="warn" label="Att verifiera" />,
  });
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {[
        ["Batterienhet", profil.container],
        ["MV-utrustning", profil.skid],
      ].map(([rubrik, del]) => (
        <section key={rubrik} aria-label={`${rubrik}: ${del.benamning}`} className="flex min-w-0 flex-col gap-2">
          <h4 className="m-0 font-head text-[14px] font-bold text-ink">
            {rubrik}: {del.benamning}
          </h4>
          <DataList items={[rad(["Mått (b × d × h)", del.mattKalla]), ...del.data.map(rad)]} />
        </section>
      ))}
      <p className="m-0 text-[12.5px] text-ink-soft lg:col-span-2">
        {kpi.antalCont} batterienheter och {kpi.antalSkid} {profil.skid.prefix === "SKID" ? "skid" : "MV-stationer"} på siten.
        {kpi.beraknadMwh !== null ? ` Beräknad energi: ${String(kpi.beraknadMwh).replace(".", ",")} MWh (${kpi.antalCont} × ${String(kpi.mwhPerEnhet).replace(".", ",")} MWh).` : " Kapacitet per enhet saknas i underlaget, så energin räknas inte."}
      </p>
    </div>
  );
}
