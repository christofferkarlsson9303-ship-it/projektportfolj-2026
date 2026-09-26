import { FilePlus2, HardHat, NotebookPen, Upload } from "lucide-react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { projekt } from "../../lib/berakningar.js";
import { veckaNu } from "../../lib/datum.js";
import { nyAtaPost, nyDagboksrad, nySkyddsrond } from "../../lib/nyaPoster.js";

/* Överst på översikten: vem, när, läget i en mening och de fyra saker man
   oftast gör härifrån. Snabbåtgärderna skapar posten med samma fabrik som
   vyn själv använder och öppnar den där — inget eget formulär här. */

function halsning(timme) {
  if (timme < 10) return "God morgon";
  if (timme < 12) return "God förmiddag";
  if (timme < 18) return "God eftermiddag";
  return "God kväll";
}

const projektNamn = (p) => (p.nr ? p.nr + " " : "") + p.namn;

/** Synkläget från portföljlagret som en liten statusmarkör. */
function LiveMarke() {
  const { conn } = usePortfolj();
  const delad = conn.kl === "ok";
  const fel = conn.kl === "err";
  const text = delad ? "Live · delad portfölj" : fel ? "Synkfel — sparas lokalt" : "Lokalt läge";

  return (
    <span className={`ov-live ${delad ? "pa" : fel ? "fel" : ""}`.trim()} title={conn.txt} role="status">
      <i aria-hidden="true" />
      {text}
    </span>
  );
}

/** Kraftkurvan: ONE Nordics signaturelement, ritat in en gång när vyn öppnas. */
function Kraftkurva() {
  const kurvor = [
    ["M0 196 C180 190 300 168 380 118 S500 20 540 6", "var(--one-bla)"],
    ["M0 198 C200 194 320 176 400 138 S510 52 540 34", "var(--turkos)"],
    ["M0 199 C220 197 340 184 420 156 S515 88 540 70", "var(--himmel)"],
    ["M40 200 C240 198 360 188 440 170 S520 120 540 106", "var(--orange)"],
    ["M90 200 C280 199 390 194 460 182 S525 150 540 142", "var(--rod)"],
  ];
  return (
    <svg className="ov-kurva" viewBox="0 0 540 200" aria-hidden="true" focusable="false">
      {kurvor.map(([d, farg], k) => (
        <path key={farg} d={d} pathLength="1000" style={{ stroke: farg, "--k": k }} />
      ))}
    </svg>
  );
}

export function Hero({ akuta, bevaka, onVisaFlaggor }) {
  const { state, laggTill } = usePortfolj();
  const { valtProjekt, oppnaPost, visa, fraga, visaToast } = useUi();
  const p = projekt(state, valtProjekt);

  const nu = new Date();
  const fornamn = (hamtaNamn() || "").trim().split(/\s+/)[0];
  const datum = nu.toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long" });
  const vecka = Number(veckaNu().split("-v")[1]);
  const iProduktion = state.projekt.filter((x) => x.status === "Produktion").length;

  const utanProjekt = () => {
    visaToast("Välj vilket projekt åtgärden gäller först.", "warn");
  };

  const registreraAta = async () => {
    if (!p) return utanProjekt();
    const sv = await fraga({
      titel: `Ny ÄTA / UR-post — ${projektNamn(p)}`,
      lead: "Händelsedatum sätts till idag — 24-timmarsfristen för underrättelse börjar räknas därifrån.",
      falt: [{ namn: "benamning", etikett: "Kort beskrivning av händelsen", typ: "textarea" }],
      ok: "Registrera",
    });
    if (!sv || !sv.benamning) return;
    const post = nyAtaPost(state, p.id, { benamning: sv.benamning, ansvarig: hamtaNamn() || "" });
    laggTill("ur", post);
    visaToast(`${post.nr} registrerad — underrättelsen ska ut inom 24 h`);
    oppnaPost("ata", post.id);
  };

  const nyLogg = () => {
    if (!p) return utanProjekt();
    const rad = nyDagboksrad(p.id);
    laggTill("dagbok", rad);
    oppnaPost("dagbok", rad.id);
  };

  const nyRond = () => {
    if (!p) return utanProjekt();
    const rond = nySkyddsrond(p.id, { utfordAv: hamtaNamn() || "" });
    laggTill("hseqRonder", rond);
    oppnaPost("hseq", rond.id);
  };

  return (
    <section className="ov-hero" aria-labelledby="ov-halsning">
      <Kraftkurva />

      <div className="ov-hero-topp">
        <div className="min-w-0">
          <span className="ov-eyebrow">
            {datum} · vecka {vecka}
          </span>
          <h2 id="ov-halsning" className="ov-halsning">
            {halsning(nu.getHours())}
            {fornamn ? `, ${fornamn}` : ""}
          </h2>
        </div>
        <LiveMarke />
      </div>

      <ul className="ov-sammanfatt" aria-label="Läget just nu">
        <li>
          {akuta ? (
            <button type="button" className="ov-chip bad" onClick={onVisaFlaggor}>
              <i aria-hidden="true" />
              <b>{akuta}</b> akuta att hantera
            </button>
          ) : (
            <span className="ov-chip">
              <i aria-hidden="true" style={{ background: "var(--turkos)" }} />
              Inget akut just nu
            </span>
          )}
        </li>
        {bevaka ? (
          <li>
            <span className="ov-chip">
              <i aria-hidden="true" />
              <b>{bevaka}</b> att bevaka
            </span>
          </li>
        ) : null}
        <li>
          <span className="ov-chip">
            <b>{state.projekt.length}</b> projekt · <b>{iProduktion}</b> i produktion
          </span>
        </li>
      </ul>

      <div className="ov-snabb" role="group" aria-label="Snabbåtgärder">
        <button type="button" className="ov-atgard primar" onClick={registreraAta}>
          <span className="ov-ikon" aria-hidden="true">
            <FilePlus2 size={17} />
          </span>
          Registrera ÄTA
        </button>
        <button type="button" className="ov-atgard" onClick={nyLogg}>
          <span className="ov-ikon" aria-hidden="true">
            <NotebookPen size={17} />
          </span>
          Ny dagboksrad
        </button>
        <button type="button" className="ov-atgard" onClick={nyRond}>
          <span className="ov-ikon" aria-hidden="true">
            <HardHat size={17} />
          </span>
          Ny skyddsrond
        </button>
        <button type="button" className="ov-atgard" onClick={() => visa("data")}>
          <span className="ov-ikon" aria-hidden="true">
            <Upload size={17} />
          </span>
          Ladda upp protokoll
        </button>

        <span className="ov-valj">
          {p ? (
            <>
              Gäller <b>{projektNamn(p)}</b> — byt projekt i Gantt-schemat
            </>
          ) : (
            "Välj projekt i Gantt-schemat"
          )}
        </span>
      </div>
    </section>
  );
}
