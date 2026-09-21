import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UiContext } from "./kontexter.js";
import { GILTIGA_VYER } from "../data/vyer.js";

/* ---------- Adressfältet som sanning för var man är ---------- */

/** Läser "#/vy/projekt" ur adressfältet. */
function lasAdress() {
  try {
    const [, vy, projekt] = (window.location.hash || "").replace(/^#\/?/, "/").split("/");
    return {
      vy: GILTIGA_VYER.has(vy) ? vy : null,
      projekt: projekt ? decodeURIComponent(projekt) : null,
    };
  } catch {
    return { vy: null, projekt: null };
  }
}

const TEMA_KEY = "batchc-portfolj-tema";

const TATHET_KEY = "batchc-portfolj-tathet";

function lasTema() {
  try {
    return localStorage.getItem(TEMA_KEY) || "system";
  } catch {
    return "system";
  }
}

function lasTathet() {
  try {
    return localStorage.getItem(TATHET_KEY) === "kompakt" ? "kompakt" : "normal";
  } catch {
    return "normal";
  }
}

export function UiProvider({ children }) {
  // Startvyn är arbetslistan, inte portföljöversikten — det är den frågan man
  // har när man öppnar verktyget på morgonen.
  const [aktivVy, setAktivVy] = useState(() => lasAdress().vy || "idag");
  const [valtProjekt, setValtProjekt] = useState(() => lasAdress().projekt || "36037");
  const [tema, setTemaState] = useState(lasTema);
  const [tathet, setTathetState] = useState(lasTathet);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState(null);
  const [navOppen, setNavOppen] = useState(false);
  /* Vad som ska markeras och rullas till när en flagga öppnas. */
  const [fokus, setFokus] = useState(null);
  /* Post som en annan sektion bett oss öppna, t.ex. ÄTA → ny dagboksrad. */
  const [postFokus, setPostFokus] = useState(null);
  /* Dokument som ska skrivas ut. */
  const [utskrift, setUtskrift] = useState(null);

  const toastTimer = useRef(null);
  const modalSvara = useRef(null);

  /* ---------- Tema ---------- */

  useEffect(() => {
    const rot = document.documentElement;
    if (tema === "system") rot.removeAttribute("data-theme");
    else rot.setAttribute("data-theme", tema);
    try {
      localStorage.setItem(TEMA_KEY, tema);
    } catch {
      /* temat blir då bara inte ihågkommet */
    }
  }, [tema]);

  /* Kompakt vy: tätare rader i tabeller och listor. Sparas per webbläsare —
     det är en personlig arbetspreferens, inte delad projektdata. */
  const setTathet = useCallback((t) => {
    setTathetState(t);
    try {
      localStorage.setItem(TATHET_KEY, t);
    } catch {
      /* blockerad lagring — vyn gäller bara den här sessionen */
    }
  }, []);

  const vaxlaTema = useCallback(() => {
    setTemaState((t) => {
      if (t === "system") {
        const morkt = window.matchMedia("(prefers-color-scheme: dark)").matches;
        return morkt ? "light" : "dark";
      }
      return t === "dark" ? "light" : "dark";
    });
  }, []);

  /* ---------- Toast ---------- */

  const visaToast = useCallback((txt, typ = "") => {
    clearTimeout(toastTimer.current);
    setToast({ txt, typ, id: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  /* ---------- Dialog (ersätter prompt/confirm, som är blockerade i sandlådan) ---------- */

  /** Öppnar en formulärdialog och returnerar ett löfte med svaren, eller null. */
  const fraga = useCallback((o) => {
    return new Promise((resolve) => {
      modalSvara.current = resolve;
      setModal({ typ: "formular", ...o });
    });
  }, []);

  /** Ja/nej-dialog. Returnerar true eller false. */
  const bekrafta = useCallback((txt, o = {}) => {
    return new Promise((resolve) => {
      modalSvara.current = resolve;
      setModal({ typ: "bekrafta", titel: o.titel || "Bekräfta", lead: txt, ok: o.ok || "Ja", fara: o.fara });
    });
  }, []);

  const stangModal = useCallback((svar) => {
    setModal(null);
    const r = modalSvara.current;
    modalSvara.current = null;
    if (r) r(svar);
  }, []);

  /* ---------- Navigation ---------- */

  /* Vy och valt projekt speglas i adressfältet. Utan det tappade en omladdning
     var man var, bakåtknappen lämnade appen helt och det gick inte att dela en
     länk till en viss vy. */
  useEffect(() => {
    const onskad = `#/${aktivVy}/${encodeURIComponent(valtProjekt)}`;
    if (window.location.hash !== onskad) window.location.hash = onskad;
  }, [aktivVy, valtProjekt]);

  useEffect(() => {
    const vidHash = () => {
      const { vy, projekt } = lasAdress();
      if (vy) setAktivVy(vy);
      if (projekt) setValtProjekt(projekt);
    };
    window.addEventListener("hashchange", vidHash);
    return () => window.removeEventListener("hashchange", vidHash);
  }, []);

  const visa = useCallback((id) => {
    setAktivVy(id);
    setNavOppen(false);
  }, []);

  /** Byt vy och be den öppna en viss post. Används när ett ärende i en sektion
   *  skapar en post i en annan — ÄTA som lägger upp en dagboksrad, till exempel. */
  const oppnaPost = useCallback((vy, id) => {
    setAktivVy(vy);
    setNavOppen(false);
    setPostFokus({ vy, id, tid: Date.now() });
  }, []);

  /** Rendera ett dokument i utskriftsytan och öppna utskriftsdialogen. */
  const skrivUt = useCallback((element) => setUtskrift(element), []);

  /** Öppna en flagga: byt projekt och vy, fäll ut det som behöver åtgärdas. */
  const oppnaFlagga = useCallback((pid, vy, extra) => {
    if (pid) setValtProjekt(pid);
    setAktivVy(vy);
    setNavOppen(false);
    setFokus({ extra: extra || "", tid: Date.now() });
  }, []);

  const api = useMemo(
    () => ({
      aktivVy,
      visa,
      valtProjekt,
      setValtProjekt,
      tema,
      setTema: setTemaState,
      vaxlaTema,
      tathet,
      setTathet,
      toast,
      visaToast,
      modal,
      fraga,
      bekrafta,
      stangModal,
      navOppen,
      setNavOppen,
      fokus,
      setFokus,
      oppnaFlagga,
      postFokus,
      oppnaPost,
      utskrift,
      skrivUt,
      rensaUtskrift: () => setUtskrift(null),
    }),
    [
      aktivVy, visa, valtProjekt, tema, vaxlaTema, tathet, setTathet, toast, visaToast,
      modal, fraga, bekrafta, stangModal, navOppen, fokus, oppnaFlagga,
      postFokus, oppnaPost, utskrift, skrivUt,
    ]
  );

  return <UiContext.Provider value={api}>{children}</UiContext.Provider>;
}
