/* Arbetssätt per projekt (ONE P Enkel, docs/one-p-enkel/README.md). Fältet `metod` på projektet
   är en etikett som säger vad som är fast och vad som är rörligt. Det styr inga beräkningar:
   tidplan, ÄTA och betalningar fungerar likadant i alla tre. */

export const ARBETSSATT = [
  {
    id: "vattenfall",
    namn: "Vattenfall",
    passar: "Fasta krav, tydliga slutleveranser och hög förutsägbarhet i budget och tid.",
    fast: "Omfattning, budget och slutdatum.",
    rorligt: "Inget utan en ÄTA.",
  },
  {
    id: "agilt",
    namn: "Agilt",
    passar: "Korta cykler och löpande leveranser med snabb anpassning.",
    fast: "Takten (cykel eller flöde) och prioritetsordningen.",
    rorligt: "Innehållet i varje cykel. Omprioritering inom ramen är ingen ÄTA.",
  },
  {
    id: "hybrid",
    namn: "Hybrid",
    passar: "Fast ram för budget och tid, agilt arbete i teamet. Förslaget för BESS-entreprenader enligt ABT 06.",
    fast: "Kontrakt, budget, milstolpar och hållpunkter.",
    rorligt: "Innehållet inom varje fas.",
  },
];

export const arbetssattFor = (id) => ARBETSSATT.find((a) => a.id === id) || null;
