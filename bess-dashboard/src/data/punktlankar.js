/* Punkter som är samma kontroll i Projektstart och Bygga batteripark
   (gemensam checklista, etapp 0). Godkända av Christoffer Karlsson 2026-10-23:
   förslag 1–7 som "samma punkt" — en bock på något av ställena slår igenom på
   båda. Förslag 8–9 (åt ett håll) är inte godkända och finns inte här.

   [projektstartens katalog, punktens id, EPC-punkt] */
export const SAMMA_PUNKT = [
  ["org", "security", "1.1"],
  ["contract", "id06", "5.3"],
  ["hseq", "hotwork", "5.10"],
  ["permits", "permit", "2.1"],
  ["commission", "planIn", "13.1"],
  ["closeout", "call", "14.4"],
];

/* Egenkontroller som styrker en EPC-punkt utöver fältet `epc` i momentmallarna.
   En verifierad egenkontroll bockar punkten; inte tvärtom (kontroll kräver bevis). */
export const EGENKONTROLL_STYRKER = [["B.02", "12.1"]];
