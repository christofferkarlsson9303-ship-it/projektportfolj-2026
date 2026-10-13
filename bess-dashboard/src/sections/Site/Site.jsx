import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { usePortfolj, useUi } from "../../state/hooks.js";
import { Callout, Card, StatusBadge } from "../../components/ds/index.js";
import { Falt, TaBortKnapp } from "../../components/ui/Falt.jsx";
import { SiteToppvy } from "../../components/site/SiteToppvy.jsx";
import { SiteMeny } from "../../components/site/SiteMeny.jsx";
import { SplitVy } from "../../components/site/SplitVy.jsx";
import { SiteVerktygsfalt } from "../../components/site/SiteVerktygsfalt.jsx";
import { SiteArenden } from "../../components/site/SiteArenden.jsx";
import { Skeleton } from "../../components/ui/Skeleton.jsx";
import { IfcModeller } from "../../components/site/IfcModeller.jsx";
import { IfcImportDialog } from "../../components/site/IfcImportDialog.jsx";
import { skapaIfcCache } from "../../lib/ifcCache.js";
import { ifcObjektForProjekt, kortKlass } from "../../lib/ifcModell.js";
import { diffStatusPerGuid, diffaModeller } from "../../lib/modellDiff.js";
import { SEKTION_STANDARD, arendenFor, arendenPerObjekt, boundingBoxFor, byggKoppling, kopplingFel, viewpointForBox } from "../../lib/modellKoppling.js";
import { nyAtaPost } from "../../lib/nyaPoster.js";
import { hamtaNamn } from "../../state/portfolj-reducer.js";
import { bcfFilnamn, byggBcf, dataUrlTillBytes, importSammanfattning, lasBcf, planeraImport } from "../../lib/bcfHanterare.js";
import { laddaNer } from "../../lib/export.js";
import { ParkSumma } from "../../components/site/ParkSumma.jsx";
import { Meter } from "../../components/ds/index.js";
import { useSnabbUtskrift } from "../../components/field/SnabbUtskrift.jsx";
import { datumKort } from "../../lib/datum.js";
import { SiteFilterrad, SiteKameror, SiteProfilData } from "../../components/site/SiteVisning.jsx";
import { HARDVARUPROFILER, profilIdFor } from "../../data/hardvaruprofiler.js";
import { STANDARDLAGER, kameravinklar, mattFor, profilKpi, standardlayout } from "../../lib/siteLager.js";
import {
  BESS_FALT,
  MALLAR,
  SITE_STATUS,
  TOMT,
  TYPFARG,
  arNal,
  arOppenPunkt,
  fmtTal,
  harBessData,
  innanforTomt,
  lasPlan,
  nyttObjekt,
  objektFel,
  planMatt,
  placeringsText,
  provaPlacering,
  punkterForSite,
  rensaPlan,
  roteraSteg,
  siteObjekt,
  sparaPlan,
  RUTNAT,
} from "../../lib/site.js";

/* Siten — projektets tomt i 3D. Volymer och nålar ligger i portfolj/state
   (siteObjekt), situationsplanen bara i sessionStorage. Scenen laddas för
   sig; allt annat här (verktyg, egenskaper, lista, planvy) fungerar även
   när webbläsaren saknar WebGL. */

const SiteScen = lazy(() => import("./SiteScen.jsx"));

const MAX_BILD = 2400;
const BESS_TALFALT = new Set(["mw", "mwh", "mva", "soc"]);
const STATUS_TON = { planerad: "neutral", levererad: "info", monterad: "warn", driftsatt: "ok" };
/* Visningsval per webbläsare (filter, Hög kvalitet). Bekvämlighet, inte data: kan saknas eller
   kasta i privat läge, och då gäller standardvärdena. */
const VISNING_NYCKEL = "bess-site-visning-v1";
function lasVisning() {
  try {
    const v = JSON.parse(window.localStorage.getItem(VISNING_NYCKEL) || "null");
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}
function sparaVisning(v) {
  try {
    window.localStorage.setItem(VISNING_NYCKEL, JSON.stringify(v));
  } catch {
    /* lagring saknas — valet gäller bara den här visningen */
  }
}

const fmtM = (n) => String(Math.round((Number(n) || 0) * 100) / 100).replace(".", ",");

/** "6,1" och "6.1" blir 6.1; tomt eller ogiltigt blir null. */
const tal = (v) => {
  const t = String(v ?? "").replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Talfält med decimalkomma, högerställt. */
function TalFalt({ id, varde, etikett, onCommit }) {
  return (
    <Falt
      id={id}
      varde={varde === null || varde === undefined ? "" : fmtM(varde)}
      etikett={etikett}
      inputMode="decimal"
      className="text-right tabular-nums"
      onCommit={(v) => onCommit(tal(v))}
    />
  );
}

/** Läser en bild och skalar ned den så att den får plats i sessionStorage. */
function lasBild(fil) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(fil);
    const img = new Image();
    img.onload = () => {
      const skala = Math.min(1, MAX_BILD / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * skala));
      c.height = Math.max(1, Math.round(img.naturalHeight * skala));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve({ bild: c.toDataURL("image/jpeg", 0.85), proportion: c.height / c.width });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Filen gick inte att läsa som bild."));
    };
    img.src = url;
  });
}

/** Färgruta i listan — samma variabel som scenen och toppvyn. */
function Farg({ typ }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 w-3 shrink-0 border border-solid border-hairline-stark ${typ === "nal" ? "rounded-full" : "rounded-sm"}`}
      style={{ background: `var(${TYPFARG[typ]})` }}
    />
  );
}

export function Site() {
  const { state, dispatch, laggTill } = usePortfolj();
  const { valtProjekt, visaToast, bekrafta, fraga, visa, oppnaPost, siteVal: valtId, setSiteVal: setValtId, siteFlyg } = useUi();
  const snabb = useSnabbUtskrift();

  const p = state.projekt.find((x) => x.id === valtProjekt) || state.projekt[0];
  const pid = p?.id;
  const objekt = useMemo(() => (pid ? siteObjekt(state, pid) : []), [state, pid]);
  /* Hårdvaruprofilen styr mått, etiketter, komponentdata och standardlayout (data/hardvaruprofiler.js). */
  const profilId = profilIdFor(p);
  const profil = HARDVARUPROFILER[profilId];
  const vinklar = useMemo(() => kameravinklar(objekt), [objekt]);
  const punkter = useMemo(() => (pid ? punkterForSite(state, pid) : []), [state, pid]);
  const ifcModeller = useMemo(() => (state.ifcModeller || []).filter((m) => m.projektId === pid), [state.ifcModeller, pid]);
  const ifcObjekt = useMemo(() => (pid ? ifcObjektForProjekt(state, pid) : []), [state, pid]);
  const ifcObjektById = useMemo(() => new Map(ifcObjekt.map((o) => [o.id, o])), [ifcObjekt]);
  const oppnaPunkter = punkter.filter(arOppenPunkt);

  const [lage, setLage] = useState("orbit");
  const [laddad, setLaddad] = useState(null);
  const [rutnat, setRutnat] = useState(true);
  const [spokRot, setSpokRot] = useState(0);
  const [nalPunkt, setNalPunkt] = useState("");
  const [sektion, setSektion] = useState(SEKTION_STANDARD);
  const [matning, setMatning] = useState(false);
  const [matt, setMatt] = useState(null);
  const [jamforId, setJamforId] = useState(null);
  const [flyg, setFlyg] = useState(null);
  const [visning, setVisning] = useState(() => {
    const v = lasVisning();
    return { lager: { ...STANDARDLAGER, ...(v?.lager || {}) }, hogKvalitet: !!v?.hogKvalitet };
  });
  const andraVisning = (andring) =>
    setVisning((v) => {
      const ny = { ...v, ...andring };
      sparaVisning(ny);
      return ny;
    });
  const [bred, setBred] = useState(0);
  const [bcfJobb, setBcfJobb] = useState("");
  const sceneApi = useRef(null);
  const [fel3d, setFel3d] = useState(null);
  const [plan, setPlan] = useState(() => (pid ? lasPlan(pid) : null));
  const [planPid, setPlanPid] = useState(pid);
  const [omritning, setOmritning] = useState(0);
  const filRef = useRef(null);
  // Projektet just nu, för en bild som läses klart efter ett projektbyte.
  const aktuelltPid = useRef(pid);
  useEffect(() => {
    aktuelltPid.current = pid;
  });

  // Byt plan när projektet byts — justering under render, inte i en effekt.
  if (planPid !== pid) {
    setPlanPid(pid);
    setPlan(pid ? lasPlan(pid) : null);
    setLaddad(null);
  }
  // Markeringen och jämförelsen hör till projektet — nollställ vid byte (delat läge i UiProvider, därför i en effekt).
  const forraPid = useRef(pid);
  useEffect(() => {
    if (forraPid.current === pid) return;
    forraPid.current = pid;
    setValtId(null);
    setJamforId(null);
    setMatning(false);
    setMatt(null);
  }, [pid, setValtId]);

  const valt = objekt.find((o) => o.id === valtId) || ifcObjektById.get(valtId) || null;
  const arIfc = valt?.typ === "ifc";

  /* ---------- IFC: geometri i webbläsarens IndexedDB, dold/visad per webbläsare ---------- */
  const ifcCache = useMemo(() => skapaIfcCache(), []);
  const [ifcGeo, setIfcGeo] = useState(() => new Map());
  const [ifcDialog, setIfcDialog] = useState(false);
  const [ifcDolda, setIfcDolda] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("bess-ifc-dolda") || "[]"));
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    let avbruten = false;
    for (const m of ifcModeller) {
      if (ifcGeo.has(m.id)) continue;
      ifcCache
        .hamta(m.id)
        .then((geometri) => {
          if (avbruten || !geometri) return;
          setIfcGeo((g) => (g.has(m.id) ? g : new Map(g).set(m.id, { geometri, guidPerEid: Object.fromEntries(m.objekt.map((o) => [o.eid, o.guid])) })));
        })
        .catch(() => {});
    }
    return () => {
      avbruten = true;
    };
  }, [ifcModeller, ifcGeo, ifcCache]);
  const ifcGeometriFinns = useMemo(() => new Set(ifcModeller.filter((m) => ifcGeo.has(m.id)).map((m) => m.id)), [ifcModeller, ifcGeo]);
  const ifcSynliga = useMemo(
    () => ifcModeller.filter((m) => ifcGeo.has(m.id) && !ifcDolda.has(m.id)).map((m) => ({ id: m.id, ...ifcGeo.get(m.id) })),
    [ifcModeller, ifcGeo, ifcDolda],
  );
  const vaxlaIfcDold = (id) =>
    setIfcDolda((d) => {
      const n = new Set(d);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        localStorage.setItem("bess-ifc-dolda", JSON.stringify([...n]));
      } catch {
        /* sparas inte i privat läge */
      }
      return n;
    });
  const laggTillIfc = async ({ modell, geometri, guidPerEid }) => {
    dispatch({ type: "IFC_MODELL_LAGG_TILL", modell });
    setIfcGeo((g) => new Map(g).set(modell.id, { geometri, guidPerEid }));
    try {
      await ifcCache.spara(modell.id, geometri);
    } catch (e) {
      visaToast(`Modellen lades till men geometrin sparades inte: ${e.message} Den syns tills sidan laddas om.`, "warn");
      return null;
    }
    visaToast(`IFC-modellen ”${modell.namn}” importerad (${modell.objekt.length} objekt).`);
    return null;
  };
  const taBortIfc = async (m) => {
    const ja = await bekrafta(`”${m.namn}” tas bort från projektet. Ärenden som pekar på dess objekt behåller sitt GlobalId och sin kameravy.`, { titel: "Ta bort IFC-modell", ok: "Ta bort", fara: true });
    if (!ja) return;
    dispatch({ type: "IFC_MODELL_TA_BORT", id: m.id });
    setIfcGeo((g) => {
      const n = new Map(g);
      n.delete(m.id);
      return n;
    });
    ifcCache.ta(m.id).catch(() => {});
  };

  /* ---------- Ärenden, versioner och jämförelse ---------- */
  const arendeRader = useMemo(() => (pid ? arendenFor(state.ur, pid) : []), [state.ur, pid]);
  const arendenMap = useMemo(() => (pid ? arendenPerObjekt(state.ur, pid) : new Map()), [state.ur, pid]);
  const objektById = useMemo(() => new Map([...ifcObjekt, ...objekt].map((o) => [o.id, o])), [objekt, ifcObjekt]);
  const versioner = useMemo(() => (state.modellVersioner || []).filter((v) => v.projektId === pid), [state.modellVersioner, pid]);
  const jamfor = versioner.find((v) => v.id === jamforId) || null;
  const diffData = useMemo(() => {
    if (!jamfor) return null;
    const d = diffaModeller(jamfor.objekt, objekt);
    return { ...d, status: diffStatusPerGuid(d), borttagnaObjekt: jamfor.objekt.filter((o) => d.borttagna.includes(o.id)) };
  }, [jamfor, objekt]);
  const diffProp = useMemo(() => (diffData ? { status: diffData.status, borttagna: diffData.borttagnaObjekt } : null), [diffData]);

  /** Be kameran flyga till en vy (och lämna gåläget, där kameran inte flyger). */
  const flygTill = (viewpoint) => {
    setLage("orbit");
    setFlyg({ tid: Date.now(), viewpoint });
  };

  /* Ett ärende i ÄTA-sektionen bad om "Visa i 3D": markera objektet och flyg till dess låda. */
  const [sedd, setSedd] = useState(null);
  if (siteFlyg && siteFlyg.tid !== sedd) {
    setSedd(siteFlyg.tid);
    const o = objekt.find((x) => x.id === siteFlyg.guid) || ifcObjektById.get(siteFlyg.guid);
    if (o) {
      setLage("orbit");
      setFlyg({ tid: siteFlyg.tid, viewpoint: viewpointForBox(boundingBoxFor(o)) });
    }
  }

  /* Tangenter på sidan: Esc avbryter placering, R roterar 90° (vald mall,
     annars markerat objekt), G slår rutnätet av och på. Inte i textfält och
     inte i gåläget, där tangenterna styr kameran. */
  const rotera = () => {
    if (laddad && laddad !== "nal") {
      setSpokRot((r) => roteraSteg(r));
      return;
    }
    if (valt && !arNal(valt) && !arIfc) {
      const kand = { ...valt, rotation: roteraSteg(valt.rotation) };
      const res = provaPlacering(kand, { x: valt.x, z: valt.z }, objekt, { ignorera: valt.id, rutnat: rutnat ? RUTNAT : 0 });
      if (!res.ok) {
        visaToast(placeringsText(res), "warn");
        return;
      }
      dispatch({ type: "SITE_ANDRA", id: valt.id, andring: { rotation: kand.rotation, x: res.x, z: res.z } });
    }
  };
  const roteraRef = useRef(rotera);
  useEffect(() => {
    roteraRef.current = rotera;
  });
  useEffect(() => {
    const tangent = (e) => {
      if (e.key === "Escape") {
        setLaddad(null);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || lage === "ga") return;
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target?.tagName || "") || e.target?.isContentEditable) return;
      if (e.code === "KeyR") {
        e.preventDefault();
        roteraRef.current();
      } else if (e.code === "KeyG") {
        e.preventDefault();
        setRutnat((v) => !v);
      }
    };
    window.addEventListener("keydown", tangent);
    return () => window.removeEventListener("keydown", tangent);
  }, [lage]);

  if (!p) return <Callout ton="info">Lägg upp ett projekt först.</Callout>;

  const visaArende = (u) => {
    const o = objektById.get(u.objectGuid);
    if (!o) return;
    setValtId(o.id);
    flygTill(viewpointForBox(boundingBoxFor(o)));
  };
  const visaArendeVy = (u) => {
    if (!objektById.get(u.objectGuid) || !u.viewpoint) return;
    setValtId(u.objectGuid);
    flygTill(u.viewpoint);
  };
  /** Kopplingen för ett objekt: dagens kameravy om scenen kan svara, annars en vy som ramar in lådan. */
  const kopplingFor = (o) => byggKoppling(o, { viewpoint: lage === "orbit" ? sceneApi.current?.hamtaVy?.() : undefined, modelVersionId: versioner.at(-1)?.id || "" });
  const kopplaArende = (u) => {
    if (!valt) return;
    dispatch({ type: "ATA_KOPPLA_OBJEKT", id: u.id, koppling: kopplingFor(valt) });
    visaToast(`${u.nr || "Ärendet"} kopplat till ${valt.namn || "objektet"}.`);
  };
  const losArende = (u) => dispatch({ type: "ATA_LOSS_OBJEKT", id: u.id });
  const nyttArende = async () => {
    if (!valt || arNal(valt)) return;
    const sv = await fraga({
      titel: `Nytt ärende på ${valt.namn}`,
      lead: "Ärendet kopplas till objektet och sparar kamerans vy, så att man hittar tillbaka dit i 3D-vyn.",
      falt: [{ namn: "benamning", etikett: "Kort beskrivning av händelsen", typ: "textarea" }],
      ok: "Registrera",
    });
    if (!sv || !sv.benamning) return;
    const koppling = kopplingFor(valt);
    if (kopplingFel(koppling)) {
      visaToast(kopplingFel(koppling), "warn");
      return;
    }
    laggTill("ur", nyAtaPost(state, pid, { benamning: sv.benamning, ansvarig: hamtaNamn() || "", ...koppling }));
    visaToast(`Ärende registrerat på ${valt.namn}.`);
  };
  /* ---------- BCF ---------- */
  const projektNamn = p ? `${p.nr ? `${p.nr} ` : ""}${p.namn}` : "";

  /** Exporterar de valda ärendena till en .bcfzip. Skärmdumpen tas från varje ärendes egen vy. */
  const exporteraBcf = async (ids) => {
    const valda = arendeRader.filter((u) => ids.includes(u.id));
    if (!valda.length) return;
    setBcfJobb("Exporterar …");
    try {
      const snapshots = {};
      for (const u of valda) {
        if (!u.viewpoint) continue;
        const bytes = dataUrlTillBytes(sceneApi.current?.skarmdump?.(u.viewpoint));
        if (bytes) snapshots[u.id] = bytes;
      }
      const { data, nyaGuid } = await byggBcf(valda, { snapshots, forfattare: hamtaNamn() || "Okänd", projektNamn });
      if (Object.keys(nyaGuid).length) dispatch({ type: "ATA_SATT_BCFGUID", guider: nyaGuid });
      const r = await laddaNer(bcfFilnamn(p.nr || p.namn), data, "application/zip");
      if (r.ok) visaToast(`${valda.length} ärenden exporterade${Object.keys(snapshots).length < valda.length ? " (utan skärmdump där 3D-vyn saknas)" : ""}.`);
      else if (!r.tyst) visaToast(r.txt || "Exporten misslyckades.", "warn");
    } catch (e) {
      visaToast(`BCF-exporten misslyckades: ${e.message}`, "warn");
    } finally {
      setBcfJobb("");
    }
  };

  /** Läser en .bcfzip, visar vad som händer och importerar efter bekräftelse. */
  const importeraBcf = async (fil) => {
    if (!fil) return;
    setBcfJobb("Läser …");
    try {
      const r = await lasBcf(new Uint8Array(await fil.arrayBuffer()));
      const state0 = { ur: state.ur };
      const plan = planeraImport(r.topics, {
        ur: state.ur,
        projektId: pid,
        objekt: [...ifcObjekt, ...objekt],
        lada: boundingBoxFor,
        skapaPost: (falt) => {
          const rad = { ...nyAtaPost(state0, pid, { ansvarig: hamtaNamn() || "", ...falt }), id: `u${Date.now().toString(36)}${state0.ur.length.toString(36)}` };
          state0.ur = [...state0.ur, rad];
          return rad;
        },
      });
      const ja = await bekrafta(importSammanfattning(plan, r), { titel: `Importera ${r.topics.length} ärenden från BCF`, ok: "Importera" });
      if (!ja) return;
      dispatch({ type: "ATA_IMPORTERA_BCF", projektId: pid, nya: plan.nya, uppdatera: plan.uppdatera });
      visaToast(`BCF importerad: ${plan.nya.length} nya, ${plan.uppdatera.length} uppdaterade.`);
    } catch (e) {
      visaToast(e.message || "Filen gick inte att läsa som BCF.", "warn");
    } finally {
      setBcfJobb("");
    }
  };

  const sparaVersion = async () => {
    const sv = await fraga({
      titel: "Spara modellversion",
      lead: `En bild av de ${objekt.length} objekten på siten just nu. Du kan jämföra senare ändringar mot den.`,
      falt: [{ namn: "namn", etikett: "Namn på versionen", typ: "text" }],
      ok: "Spara",
    });
    if (!sv) return;
    dispatch({ type: "MODELLVERSION_SKAPA", projektId: pid, id: `mv${Date.now().toString(36)}`, namn: sv.namn, datum: new Date().toISOString() });
    visaToast("Modellversion sparad.");
  };
  const taBortVersion = async (id) => {
    const v = versioner.find((x) => x.id === id);
    if (!v) return;
    const ja = await bekrafta(`Modellversionen ”${v.namn}” tas bort. Siten och ärendena påverkas inte.`, { titel: "Ta bort modellversion", ok: "Ta bort", fara: true });
    if (!ja) return;
    dispatch({ type: "MODELLVERSION_TA_BORT", id });
    setJamforId(null);
  };

  const placera = (x, z) => {
    if (!laddad) return;
    if (laddad === "nal" && !nalPunkt) {
      visaToast("Välj vilken punkt nålen ska peka på.", "warn");
      return;
    }
    let rad;
    if (laddad === "nal") {
      rad = nyttObjekt(laddad, pid, { x, z }, objekt, { punktId: nalPunkt });
    } else {
      // Samma snapp och kollisionsregler som spökobjektet i 3D-vyn visar.
      const m = mattFor(profilId, laddad) || MALLAR[laddad];
      const res = provaPlacering({ typ: laddad, bredd: m.bredd, djup: m.djup, hojd: m.hojd, rotation: spokRot }, { x, z }, objekt, {
        rutnat: rutnat ? RUTNAT : 0,
      });
      if (!res.ok) {
        visaToast(placeringsText(res), "warn");
        return;
      }
      rad = { ...nyttObjekt(laddad, pid, { x: res.x, z: res.z }, objekt, { exakt: true, rotation: spokRot }), bredd: m.bredd, djup: m.djup, hojd: m.hojd };

    }
    const fel = objektFel(rad, punkter);
    if (fel) {
      visaToast(fel, "warn");
      return;
    }
    dispatch({ type: "SITE_LAGG_TILL", rad });
    setValtId(rad.id);
  };

  const andra = (andring) => {
    if (!valt) return;
    const fel = objektFel({ ...valt, ...andring }, punkter);
    if (fel) {
      visaToast(fel, "warn");
      // Fälten ritas om med det sparade värdet.
      setOmritning((n) => n + 1);
      return;
    }
    dispatch({ type: "SITE_ANDRA", id: valt.id, andring });
  };

  /** Mått, rotation och läge ur ett talfält. */
  const andraMatt = (falt, v) => {
    if (falt === "rotation") return andra({ rotation: v === null ? 0 : ((v % 360) + 360) % 360 });
    if (falt === "x" || falt === "z") {
      if (v === null) return setOmritning((n) => n + 1);
      const q = innanforTomt(falt === "x" ? v : valt.x, falt === "z" ? v : valt.z);
      return andra({ x: q.x, z: q.z });
    }
    if (BESS_TALFALT.has(falt)) return andra({ [falt]: v === null ? undefined : v });
    return andra({ [falt]: v === null ? 0 : v });
  };

  const taBort = (o) => {
    dispatch({ type: "SITE_TA_BORT", id: o.id });
    if (valtId === o.id) setValtId(null);
  };

  /* Profilens standardlayout på en tom tomt. Skriver aldrig över befintliga volymer. */
  const laggStandardlayout = async () => {
    const ja = await bekrafta(
      `En exempellayout för ${profil.namn} läggs på tomten för ${p.nr || p.namn}: batterienheter, ${profil.skid.prefix === "SKID" ? "skid" : "MV-stationer"}, ställverk och transformator. Den är ett exempel, inte projektets ritning, och kan flyttas och ändras efteråt.`,
      { titel: "Lägg in standardlayout", ok: "Lägg in" }
    );
    if (!ja) return;
    dispatch({ type: "SITE_STANDARDLAYOUT", projektId: pid, rader: standardlayout(profilId, pid), profil: profil.kort });
    setValtId(null);
  };

  const bytProfil = (id) => {
    if (id === profilId) return;
    dispatch({ type: "UPPDATERA", lista: "projekt", id: pid, falt: "hardvaruprofil", varde: id });
    visaToast(`${p.nr || p.namn} använder nu ${HARDVARUPROFILER[id].namn}. Nya enheter får profilens mått.`);
  };

  const aterstall = async () => {
    const ja = await bekrafta(`Alla ${objekt.length} objekt på siten för ${p.nr || p.namn} tas bort. Tomten blir tom igen. Situationsplanen ligger kvar.`, {
      titel: "Återställ siten",
      ok: "Återställ",
      fara: true,
    });
    if (!ja) return;
    dispatch({ type: "SITE_ATERSTALL", projektId: pid });
    setValtId(null);
  };

  /* Bilden hör till projektet där den valdes. Byter användaren projekt
     medan den läses sparas den ändå där, men visas inte i det nya. */
  const valjBild = async (fil) => {
    if (!fil) return;
    const forPid = pid;
    const fore = plan;
    try {
      const { bild, proportion } = await lasBild(fil);
      const ny = { bild, proportion, namn: fil.name, bredd: fore?.bredd || TOMT.bredd, norr: fore?.norr || 0 };
      const fel = sparaPlan(forPid, ny);
      if (aktuelltPid.current !== forPid) return;
      if (fel) {
        visaToast(fel, "warn");
        return;
      }
      setPlan(lasPlan(forPid));
    } catch (e) {
      if (aktuelltPid.current === forPid) visaToast(e.message, "warn");
    }
  };

  const andraPlan = (andring) => {
    if (!plan) return;
    const fel = sparaPlan(pid, { ...plan, ...andring });
    if (fel) visaToast(fel, "warn");
    setPlan(lasPlan(pid));
  };

  const taBortPlan = () => {
    rensaPlan(pid);
    setPlan(null);
  };

  const punktFor = (o) => punkter.find((x) => x.id === o.punktId);
  const namnFor = (o) => (arNal(o) ? `Nål: ${punktFor(o)?.titel || "punkt saknas"}` : o.namn);
  const volymAntal = objekt.filter((o) => !arNal(o)).length;
  const nalAntal = objekt.length - volymAntal;

  const status = laddad
    ? laddad === "nal" && !nalPunkt
      ? "Välj punkten nålen ska peka på."
      : `Klicka på marken för att placera ${laddad === "ehouse" ? "E-House" : MALLAR[laddad].namn.toLowerCase()}. R roterar, G rutnät, Esc avbryter.`
    : valt
      ? arIfc
        ? `${namnFor(valt)} (IFC) är markerad.`
        : `${namnFor(valt)} är markerad. R roterar, dra för att flytta.`
      : "Välj en komponent till vänster för att placera, eller klicka på ett objekt.";

  /* Vänstra delen är bred nog för att sidopanelen ska få ligga som överlägg i 3D-vyn;
     annars ligger den som ett eget kort under. */
  const overlay = bred >= 820;
  const markeratKort = (
            <Card
              id="site-markerat"
              className={overlay ? `absolute bottom-3 right-3 top-3 z-[3] w-[340px] overflow-y-auto shadow-lg ${valt ? "" : "hidden"}` : ""}
              title={valt ? namnFor(valt) : "Markerat objekt"}
              subtitle={valt ? (arIfc ? `IFC · ${kortKlass(valt.klass)}` : arNal(valt) ? (arOppenPunkt(punktFor(valt)) ? "Nål på en öppen punkt" : "Nål på en punkt som inte är öppen") : `${MALLAR[valt.typ].namn} · mått i meter, rotation i grader`) : null}
              badge={valt && !arNal(valt) && !arIfc && valt.status ? <StatusBadge ton={STATUS_TON[valt.status] || "neutral"} label={SITE_STATUS.find(([id]) => id === valt.status)?.[1] || valt.status} /> : null}
              action={valt && !arIfc ? <TaBortKnapp etikett={`Ta bort ${namnFor(valt)}`} onClick={() => taBort(valt)} /> : null}
            >
              {!valt ? (
                <p className="m-0 text-[13px] text-ink-soft">
                  Inget markerat. Klicka på ett objekt i 3D-vyn, i planvyn eller i listan.
                </p>
              ) : arIfc ? (
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
                  <dt className="text-ink-soft">Klass</dt>
                  <dd className="m-0 text-ink">{valt.klass || "okänd"}</dd>
                  <dt className="text-ink-soft">GlobalId</dt>
                  <dd className="m-0 break-all font-mono text-[12px] text-ink">{valt.id}</dd>
                  <dt className="text-ink-soft">expressID</dt>
                  <dd className="m-0 text-ink">{valt.eid}</dd>
                  <dt className="text-ink-soft">Mått</dt>
                  <dd className="m-0 text-ink">{[0, 1, 2].map((i) => fmtM(valt.bb[i + 3] - valt.bb[i])).join(" × ")} m (B × H × D)</dd>
                </dl>
              ) : arNal(valt) ? (
                <NalPanel
                  o={valt}
                  punkt={punktFor(valt)}
                  punkter={punkter}
                  onPunkt={(punktId) => andra({ punktId })}
                  onOppna={() => visa("punkter")}
                  onSkrivUt={() => snabb.arbetslista(pid, { ids: [valt.punktId] })}
                />
              ) : (
                <div key={`${valt.id}-${omritning}`} className="frow c3">
                  <div className="f" style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="site-namn">Namn</label>
                    <Falt id="site-namn" varde={valt.namn} etikett="Namn" onCommit={(v) => andra({ namn: v.trim() || valt.namn })} />
                  </div>
                  {[
                    ["bredd", "Bredd (m)"],
                    ["djup", "Djup (m)"],
                    ["hojd", "Höjd (m)"],
                    ["rotation", "Rotation (grader)"],
                    ["x", "Öster om mitten (m)"],
                    ["z", "Söder om mitten (m)"],
                  ].map(([falt, text]) => (
                    <div className="f" key={falt}>
                      <label htmlFor={`site-${falt}`}>{text}</label>
                      <TalFalt id={`site-${falt}`} varde={valt[falt]} etikett={text} onCommit={(v) => andraMatt(falt, v)} />
                    </div>
                  ))}
                </div>
              )}
              {valt && !arIfc && harBessData(valt.typ) ? <BessSektion key={`bess-${valt.id}-${omritning}`} o={valt} onTal={andraMatt} onAndra={andra} /> : null}
            </Card>
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-4 lg:gap-6">
        <Card
          id="site-scen"
          title={`Siten — ${p.nr ? `${p.nr} ` : ""}${p.namn}`}
          subtitle={`Tomt ${TOMT.bredd} × ${TOMT.djup} m. ${volymAntal} ${volymAntal === 1 ? "volym" : "volymer"}, ${nalAntal} ${nalAntal === 1 ? "nål" : "nålar"}.${plan ? " Situationsplan som mark." : " Utan situationsplan: grus och körytor."}`}
          action={
            <button type="button" className="btn sec mini" onClick={aterstall} disabled={!objekt.length}>
              Återställ
            </button>
          }
        >
          <SiteVerktygsfalt
            lage={lage}
            onLage={(v) => {
              setLage(v);
              setLaddad(null);
              if (v === "ga") setMatning(false);
            }}
            sektion={sektion}
            onSektion={setSektion}
            matning={matning}
            onMatning={(v) => {
              setMatning(v);
              if (v) setLaddad(null);
              if (!v) setMatt(null);
            }}
            matt={matt}
            onRensaMatning={() => {
              setMatt(null);
              sceneApi.current?.rensaMatning?.();
            }}
            versioner={versioner}
            jamforId={jamforId}
            onJamfor={setJamforId}
            onSparaVersion={sparaVersion}
            onTaBortVersion={taBortVersion}
            diff={diffData}
          />

          <SiteFilterrad
            lager={visning.lager}
            onLager={(lager) => andraVisning({ lager })}
            hogKvalitet={visning.hogKvalitet}
            onHogKvalitet={(hogKvalitet) => andraVisning({ hogKvalitet })}
            profilId={profilId}
            onProfil={bytProfil}
          />
          {visning.lager.dc || visning.lager.hsp || visning.lager.lsp || visning.lager.fiber || visning.lager.jord ? (
            <p className="m-0 text-[12px] text-ink-soft">Kabelvägarna är schematiska, räknade ur enheternas lägen. De är inte en kabel- eller relationsritning.</p>
          ) : null}
          {!volymAntal ? (
            <Callout ton="info">
              <b>Inga enheter på tomten.</b> Placera enheter med menyn, eller lägg in en standardlayout för {profil.namn}.{" "}
              <button type="button" className="btn sec mini ml-1" onClick={laggStandardlayout}>
                Lägg in standardlayout
              </button>
            </Callout>
          ) : null}

          {laddad === "nal" ? (
            <div className="frow c2">
              <div className="f">
                <label htmlFor="site-nal-punkt">Punkt för nålen</label>
                <select id="site-nal-punkt" value={nalPunkt} onChange={(e) => setNalPunkt(e.target.value)}>
                  <option value="">Välj punkt …</option>
                  {oppnaPunkter.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.titel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
          {!oppnaPunkter.length ? (
            <p className="m-0 text-[12.5px] text-ink-soft">
              Nålar pekar på öppna punkter. Projektet har inga öppna punkter just nu.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <p className="m-0 text-ink-soft" aria-live="polite">
              {status}
            </p>
            {laddad && !(laddad === "nal" && !nalPunkt) ? (
              <button type="button" className="btn sec mini" onClick={() => placera(0, 0)}>
                Placera mitt på tomten
              </button>
            ) : null}
          </div>

          <SplitVy
            onBredd={setBred}
            vanster={
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-[176px_minmax(0,1fr)] xl:items-start">
            <SiteMeny
              laddad={laddad}
              onVal={setLaddad}
              lage={lage}
              kanNal={oppnaPunkter.length > 0}
              rutnat={rutnat}
              onRutnat={setRutnat}
              spokRot={spokRot}
              onRotera={rotera}
            />
            <div className="relative min-w-0">
              {fel3d ? (
                <Callout ton="warn">
                  <b>3D-vyn kan inte visas.</b> {fel3d} Planvyn nedan visar samma objekt och går att klicka i.
                </Callout>
              ) : (
                <Suspense fallback={<Skeleton etikett="Laddar 3D-vyn …" className="h-[62vh] max-h-[720px] min-h-[360px] w-full" />}>
                  <SiteScen
                    objekt={objekt}
                    punkter={punkter}
                    plan={plan}
                    valtId={valtId}
                    laddad={laddad && !(laddad === "nal" && !nalPunkt) ? laddad : null}
                    lage={lage}
                    rutnat={rutnat}
                    spokRot={spokRot}
                    sektion={sektion}
                    matning={matning}
                    diff={diffProp}
                    ifcModeller={ifcSynliga}
                    ifcObjekt={ifcObjektById}
                    arenden={arendenMap}
                    flyg={flyg}
                    lager={visning.lager}
                    hogKvalitet={visning.hogKvalitet}
                    profil={profilId}
                    spokMatt={laddad ? mattFor(profilId, laddad) : null}
                    onPlacera={placera}
                    onValj={setValtId}
                    onMatt={setMatt}
                    onKlar={(api) => {
                      sceneApi.current = api;
                    }}
                    onFlytta={(id, x, z) => dispatch({ type: "SITE_ANDRA", id, andring: { x, z } })}
                    onFel={setFel3d}
                  />
                </Suspense>
              )}
              {!fel3d ? <SiteKameror vinklar={vinklar} onFlyg={flygTill} /> : null}
              {overlay ? markeratKort : null}
            </div>
              </div>
            }
            hoger={
              <aside aria-label="Ärenden på siten" className="flex flex-col gap-3 rounded-lg border border-solid border-hairline bg-sunken p-3 lg:h-full">
                <h4 className="m-0 font-head text-[14px] font-bold text-ink">Ärenden</h4>
                <SiteArenden
                  rader={arendeRader}
                  valt={valt}
                  objektById={objektById}
                  onVisa={visaArende}
                  onVisaVy={visaArendeVy}
                  onKoppla={kopplaArende}
                  onLos={losArende}
                  onOppna={(u) => oppnaPost("ata", u.id)}
                  onNy={nyttArende}
                  onExportBcf={exporteraBcf}
                  onImportBcf={importeraBcf}
                  bcfJobb={bcfJobb}
                />
              </aside>
            }
          />
          {!overlay ? markeratKort : null}
        </Card>
        <IfcModeller
          modeller={ifcModeller}
          objekt={ifcObjekt}
          geometriFinns={ifcGeometriFinns}
          dolda={ifcDolda}
          valtId={valtId}
          onImportera={() => setIfcDialog(true)}
          onVisaDold={vaxlaIfcDold}
          onTaBort={taBortIfc}
          onValj={(id) => {
            setValtId(id);
            const o = ifcObjektById.get(id);
            if (o && lage === "orbit") flygTill(viewpointForBox(boundingBoxFor(o)));
          }}
        />
        <Card id="site-park" title="Parkens BESS-data" subtitle="Summerat ur objekten på siten.">
          <ParkSumma objekt={objekt} className="sm:grid-cols-4" />
        </Card>
        <Card
          id="site-profil"
          title={`Hårdvaruprofil — ${profil.namn}`}
          subtitle={`${profil.anvands}. Värden med källa; det som inte är bekräftat mot datablad eller kontrakt är märkt.`}
          badge={<StatusBadge ton="neutral" label={profil.kort} />}
        >
          <SiteProfilData profil={profil} kpi={profilKpi(profilId, objekt)} />
        </Card>
      </div>

      {ifcDialog ? <IfcImportDialog projektId={pid} filnamnFinns={ifcModeller.map((m) => m.filnamn)} onLagg={laggTillIfc} onStang={() => setIfcDialog(false)} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <Card id="site-planvy" title="Planvy" subtitle="Samma objekt sedda ovanifrån. Norr uppåt.">
          <SiteToppvy
            objekt={objekt}
            valtId={valtId}
            etikett={`Planvy över siten, ${volymAntal} volymer och ${nalAntal} nålar`}
            onMark={(x, z) => (laddad ? placera(x, z) : setValtId(null))}
            onValj={setValtId}
            className="rounded-lg"
          />
        </Card>

        <Card
          id="site-objekt"
          title="Objekt på siten"
          badge={<StatusBadge ton="neutral" label={String(objekt.length)} />}
        >
          {objekt.length ? (
            <ul className="m-0 list-none p-0" aria-label="Objekt">
              {objekt.map((o) => (
                <li key={o.id} className="border-0 border-t border-solid border-hairline first:border-t-0">
                  <button
                    type="button"
                    aria-pressed={o.id === valtId}
                    onClick={() => setValtId(o.id)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent px-2 py-2 text-left font-body text-[13px] text-ink hover:bg-sunken aria-pressed:bg-sunken"
                  >
                    <Farg typ={o.typ} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{namnFor(o)}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-ink-soft">
                      {arNal(o) ? (punktFor(o)?.forfaller ? datumKort(punktFor(o).forfaller) : "") : `${fmtM(o.bredd)} × ${fmtM(o.djup)} × ${fmtM(o.hojd)} m`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-[13px] text-ink-soft">
              Tomten är tom. Välj Skid, Container, E-House, Trafo eller Låda ovan och klicka på marken.
            </p>
          )}
        </Card>

        <Card
          id="site-situationsplan"
          title="Situationsplan"
          subtitle="En bild som mark under modellen. Ange bredden i meter; djupet följer bildens proportion."
          action={
            <>
              <input
                ref={filRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Välj bild för situationsplan"
                onChange={(e) => {
                  valjBild(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button type="button" className="btn sec mini" onClick={() => filRef.current?.click()}>
                {plan ? "Byt bild" : "Välj bild"}
              </button>
              {plan ? (
                <button type="button" className="btn sec mini" onClick={taBortPlan}>
                  Ta bort planen
                </button>
              ) : null}
            </>
          }
        >
          {plan ? (
            <div className="frow c3">
              <div className="f">
                <label htmlFor="site-plan-bredd">Bredd i meter</label>
                <TalFalt id="site-plan-bredd" varde={plan.bredd} etikett="Bredd i meter" onCommit={(v) => andraPlan({ bredd: v })} />
              </div>
              <div className="f">
                <label htmlFor="site-plan-norr">Norr i grader</label>
                <TalFalt id="site-plan-norr" varde={plan.norr} etikett="Norr i grader" onCommit={(v) => andraPlan({ norr: v || 0 })} />
              </div>
              <div className="f">
                <span className="text-[12px] font-semibold text-ink-soft">Djup</span>
                <span className="py-2 text-[13.5px] tabular-nums text-ink">{fmtM(planMatt(plan).djup)} m</span>
              </div>
            </div>
          ) : null}
          <Callout ton="info">
            Bilden ligger bara i den här fliken (sessionStorage). Den sparas inte i portföljen och följer inte med
            synken — andra ser modellen men inte bilden. Norr i grader: hur mycket bildens norrpil lutar medurs från
            bildens överkant.
          </Callout>
        </Card>
      </div>
    </div>
  );
}

/** BESS-data för en volym: effekt, energi, laddstatus, status och specifikation.
 *  Allt är valfritt. Tomt fält tar bort värdet, det blir inte 0. */
function BessSektion({ o, onTal, onAndra }) {
  const falt = BESS_FALT[o.typ] || [];
  const soc = o.soc === undefined || o.soc === null || o.soc === "" ? null : Number(o.soc);
  return (
    <section aria-labelledby="site-bess-rubrik" className="mt-4 flex flex-col gap-3 border-0 border-t border-solid border-hairline pt-4">
      <h4 id="site-bess-rubrik" className="m-0 font-head text-[13px] font-bold text-ink">
        BESS-data
      </h4>
      <div className="frow c2">
        {falt.map(([nyckel, text]) => (
          <div className="f" key={nyckel}>
            <label htmlFor={`site-${nyckel}`}>{text}</label>
            <TalFalt id={`site-${nyckel}`} varde={o[nyckel]} etikett={text} onCommit={(v) => onTal(nyckel, v)} />
          </div>
        ))}
        <div className="f">
          <label htmlFor="site-status">Status</label>
          <select id="site-status" value={o.status || ""} onChange={(e) => onAndra({ status: e.target.value || undefined })}>
            <option value="">Ej angiven</option>
            {SITE_STATUS.map(([id, text]) => (
              <option key={id} value={id}>
                {text}
              </option>
            ))}
          </select>
        </div>
      </div>
      {soc !== null && Number.isFinite(soc) ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between text-[12px] text-ink-soft">
            <span>Laddstatus</span>
            <span className="font-bold tabular-nums text-ink">{fmtTal(soc, 0)} %</span>
          </div>
          <Meter value={soc} label={`Laddstatus ${o.namn}`} ton={soc < 20 ? "pagar" : "klar"} />
        </div>
      ) : null}
      <div className="f">
        <label htmlFor="site-spec">Specifikation</label>
        <Falt
          id="site-spec"
          flerrad
          rows={3}
          varde={o.spec}
          etikett="Specifikation"
          placeholder="Fabrikat, modell, kemi, kylning, anteckningar …"
          maxLength={500}
          onCommit={(v) => onAndra({ spec: v.trim() || undefined })}
        />
      </div>
    </section>
  );
}

function NalPanel({ o, punkt, punkter, onPunkt, onOppna, onSkrivUt }) {
  const val = punkter.filter((x) => arOppenPunkt(x) || x.id === o.punktId);
  return (
    <div className="flex flex-col gap-3">
      <div className="frow c2">
        <div className="f" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="site-nal-byt">Punkt</label>
          <select id="site-nal-byt" value={o.punktId} onChange={(e) => onPunkt(e.target.value)}>
            {val.map((x) => (
              <option key={x.id} value={x.id}>
                {x.titel}
              </option>
            ))}
          </select>
        </div>
      </div>
      {punkt ? (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          <dt className="text-ink-soft">Ansvarig</dt>
          <dd className="m-0 text-ink">{punkt.agare || "—"}</dd>
          <dt className="text-ink-soft">Förfaller</dt>
          <dd className="m-0 tabular-nums text-ink">{punkt.forfaller ? datumKort(punkt.forfaller) : "—"}</dd>
          {punkt.utforare ? (
            <>
              <dt className="text-ink-soft">Utförare</dt>
              <dd className="m-0 text-ink">{punkt.utforare}</dd>
            </>
          ) : null}
        </dl>
      ) : (
        <Callout ton="warn">Punkten finns inte längre. Välj en annan punkt eller ta bort nålen.</Callout>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn sec mini" onClick={onOppna}>
          Gå till Öppna punkter
        </button>
        {punkt ? (
          <button type="button" className="btn djup mini" onClick={onSkrivUt}>
            Skriv ut arbetslista för punkten
          </button>
        ) : null}
      </div>
    </div>
  );
}
