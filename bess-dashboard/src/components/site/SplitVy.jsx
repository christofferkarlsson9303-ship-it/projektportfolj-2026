import { useCallback, useEffect, useRef, useState } from "react";
import { SPLIT_MAX, SPLIT_MIN, klammaAndel } from "../../lib/splitVy.js";

/* Delad vy: 3D till vänster, ÄTA-panel till höger, med en avdelare som går
   att dra (mus och touch) eller flytta med piltangenter. Under lg staplas
   delarna och avdelaren döljs — då finns inget att dra.

   Avdelaren är en `separator` med aria-valuenow (procent åt vänster). Läget
   sparas i localStorage per `nyckel`, och bara när användaren släpper eller
   släpper tangenten — inte under dragningen. Lagringen kan saknas eller vara
   blockerad, då gäller startvärdet. Bredden på vänstra delen rapporteras via
   `onBredd`, så att sidan kan välja layout efter vad som ryms. */

function lasAndel(nyckel, start) {
  try {
    const v = globalThis.localStorage?.getItem(nyckel);
    return v === null || v === undefined ? start : klammaAndel(v, start);
  } catch {
    return start;
  }
}

function sparaAndel(nyckel, v) {
  try {
    globalThis.localStorage?.setItem(nyckel, String(Math.round(v * 1000) / 1000));
  } catch {
    /* ingen lagring — läget gäller till nästa laddning */
  }
}

export function SplitVy({ vanster, hoger, nyckel = "bess-site-split", start = 0.62, onBredd, className = "" }) {
  const [andel, setAndel] = useState(() => lasAndel(nyckel, start));
  const [drar, setDrar] = useState(false);
  const rot = useRef(null);
  const vansterRef = useRef(null);
  const senaste = useRef(andel);

  useEffect(() => {
    senaste.current = andel;
  }, [andel]);

  // Rapportera vänstra delens bredd.
  useEffect(() => {
    const el = vansterRef.current;
    if (!el || !onBredd || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([e]) => onBredd(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [onBredd]);

  const flytta = useCallback(
    (clientX) => {
      const b = rot.current?.getBoundingClientRect();
      if (!b || !b.width) return;
      setAndel(klammaAndel((clientX - b.left) / b.width, start));
    },
    [start]
  );

  const ned = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrar(true);
    flytta(e.clientX);
  };
  const rorelse = (e) => {
    if (drar) flytta(e.clientX);
  };
  const upp = () => {
    if (!drar) return;
    setDrar(false);
    sparaAndel(nyckel, senaste.current);
  };

  const tangent = (e) => {
    let ny = null;
    if (e.key === "ArrowLeft") ny = andel - 0.02;
    else if (e.key === "ArrowRight") ny = andel + 0.02;
    else if (e.key === "Home") ny = SPLIT_MIN;
    else if (e.key === "End") ny = SPLIT_MAX;
    else if (e.key === "Enter" || e.key === " ") ny = start;
    if (ny === null) return;
    e.preventDefault();
    const v = klammaAndel(ny, start);
    setAndel(v);
    sparaAndel(nyckel, v);
  };

  return (
    <div ref={rot} className={`flex min-w-0 flex-col gap-4 lg:flex-row lg:gap-0 ${className}`.trim()} style={{ "--delad": `${(andel * 100).toFixed(2)}%` }} data-delad={Math.round(andel * 100)}>
      <div ref={vansterRef} className="min-w-0 lg:shrink-0 lg:grow-0 lg:basis-[var(--delad)]">
        {vanster}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Ändra bredd på 3D-vyn och ÄTA-panelen"
        aria-valuemin={Math.round(SPLIT_MIN * 100)}
        aria-valuemax={Math.round(SPLIT_MAX * 100)}
        aria-valuenow={Math.round(andel * 100)}
        tabIndex={0}
        onPointerDown={ned}
        onPointerMove={rorelse}
        onPointerUp={upp}
        onPointerCancel={upp}
        onKeyDown={tangent}
        title="Dra eller använd piltangenter för att ändra bredden. Enter återställer."
        className={`group relative hidden w-4 shrink-0 cursor-col-resize touch-none select-none items-center justify-center rounded-sm outline-none lg:flex focus-visible:outline focus-visible:outline-2 focus-visible:outline-one-bla ${drar ? "bg-info-bg" : ""}`}
      >
        <span
          aria-hidden="true"
          className={`h-16 w-1 rounded-full bg-hairline-stark transition-[transform,background-color] duration-150 motion-reduce:transition-none group-hover:scale-y-110 group-hover:bg-knapp-bla group-focus-visible:bg-knapp-bla ${drar ? "scale-y-110 bg-knapp-bla" : ""}`}
        />
      </div>
      <div className="min-w-0 lg:min-w-[260px] lg:flex-1">{hoger}</div>
    </div>
  );
}
