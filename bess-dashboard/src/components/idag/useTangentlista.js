import { useEffect, useRef } from "react";
import { nastaIndex } from "../../lib/snabbrad.js";

/* Tangentbordet i Idag. Lyssnar på dokumentet bara medan Idag är monterad.

     j / k        nästa / föregående rad (pilarna gör samma sak när en rad har fokus)
     Enter        öppnar raden (radens egen knapp)
     x            markerar punkten klar, eller ångrar en nyss klarmarkerad
     n            ny punkt i snabbraden
     p            skriv ut arbetslistan

   Rader hittas med [data-rad] under rotRef. Rader i Längre fram räknas bara när
   delen är utfälld. Tangenterna gör ingenting när man skriver i ett fält, när en
   dialog är öppen, i en sidopanel eller med Ctrl/Cmd/Alt nedtryckt — då ska
   tangenten göra det den vanligen gör. */

const SKRIVFALT = /^(INPUT|TEXTAREA|SELECT)$/;

function skaIgnoreras(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return true;
  const el = e.target;
  if (el instanceof HTMLElement && (SKRIVFALT.test(el.tagName) || el.isContentEditable)) return true;
  if (document.querySelector("dialog[open]")) return true;
  const fokus = document.activeElement;
  return !!(fokus && fokus.closest?.(".slideover, .atadrawer"));
}

/** Synliga rader i ordning. */
function rader(rot) {
  return rot ? [...rot.querySelectorAll("[data-rad]")].filter((r) => r.getClientRects().length > 0) : [];
}

/**
 * @param {{ rotRef: {current: HTMLElement|null}, onKlar: (id: string) => void,
 *           onAngra?: (id: string) => void, onNy: () => void, onSkrivUt?: () => void }} arg
 */
export function useTangentlista({ rotRef, onKlar, onAngra, onNy, onSkrivUt }) {
  // Senaste callbacks utan att lyssnaren byts vid varje rendering.
  const cb = useRef({ onKlar, onAngra, onNy, onSkrivUt });
  useEffect(() => {
    cb.current = { onKlar, onAngra, onNy, onSkrivUt };
  });

  useEffect(() => {
    const ned = (e) => {
      if (skaIgnoreras(e)) return;
      const lista = rader(rotRef.current);
      const nu = lista.indexOf(document.activeElement);
      const tangent = e.key;

      const flytta = (steg) => {
        const i = nastaIndex(lista.length, nu, steg);
        if (i < 0) return;
        e.preventDefault();
        lista[i].focus();
        lista[i].scrollIntoView({ block: "nearest" });
      };

      if (tangent === "j") return flytta(1);
      if (tangent === "k") return flytta(-1);
      // Pilarna bara när en rad redan har fokus — annars rullar de sidan som vanligt.
      if (nu >= 0 && tangent === "ArrowDown") return flytta(1);
      if (nu >= 0 && tangent === "ArrowUp") return flytta(-1);

      if (tangent === "x" && nu >= 0) {
        const { punkt, klar } = lista[nu].dataset;
        if (klar && cb.current.onAngra) {
          e.preventDefault();
          cb.current.onAngra(klar);
        } else if (punkt) {
          e.preventDefault();
          cb.current.onKlar(punkt);
        }
        return;
      }
      if (tangent === "n") {
        e.preventDefault();
        cb.current.onNy();
        return;
      }
      if (tangent === "p" && cb.current.onSkrivUt) {
        e.preventDefault();
        cb.current.onSkrivUt();
      }
    };
    document.addEventListener("keydown", ned);
    return () => document.removeEventListener("keydown", ned);
  }, [rotRef]);
}
