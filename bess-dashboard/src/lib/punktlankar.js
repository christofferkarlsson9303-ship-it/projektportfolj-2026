import { SAMMA_PUNKT } from "../data/punktlankar.js";

/* Kopplingar mellan Projektstart och Bygga batteripark (data/punktlankar.js).
   Båda sidor behåller sin egen lagring; en ändring skrivs igenom till den andra:
   EPC_PUNKT uppdaterar projektstartens kryss i reducern, och Projektstart skickar
   EPC_PUNKT när en kopplad punkt bockas. När guiden öppnas för ett projekt tas
   EPC-bockar med, så att en bock som gjorts medan guiden var stängd syns. */

const EPC_FOR = new Map(SAMMA_PUNKT.map(([b, id, epc]) => [`${b}|${id}`, epc]));
const PS_FOR = new Map(SAMMA_PUNKT.map(([b, id, epc]) => [epc, [b, id]]));

/** EPC-punkten som är samma som en Projektstart-punkt, eller null. */
export const epcForProjektstart = (bucket, id) => EPC_FOR.get(`${bucket}|${id}`) || null;

/** Projektstart-punkten [katalog, id] som är samma som en EPC-punkt, eller null. */
export const projektstartForEpc = (epc) => PS_FOR.get(epc) || null;

/** Utkastet med EPC-bockade kopplade punkter ikryssade. Rör aldrig ett kryss som redan finns. */
export function medLankadeKryss(u, state, pid) {
  const klara = new Set((state.epcPunkter || []).filter((r) => r.projektId === pid && r.status === "klar").map((r) => r.punkt));
  let kryss = u.kryss || {};
  for (const [b, id, epc] of SAMMA_PUNKT) {
    if (!klara.has(epc) || kryss[b]?.[id]) continue;
    kryss = { ...kryss, [b]: { ...(kryss[b] || {}), [id]: true } };
  }
  return kryss === u.kryss ? u : { ...u, kryss };
}

/** Projektstarten med en kopplad punkt satt efter EPC-statusen (klar → kryss, återöppnad → inget kryss). */
export function postMedEpc(post, epc, status) {
  const ps = projektstartForEpc(epc);
  if (!ps || !post?.utkast || status === "ejaktuell") return post;
  const [b, id] = ps;
  const kryss = post.utkast.kryss || {};
  const varde = status === "klar";
  if (!!kryss[b]?.[id] === varde) return post;
  const katalog = { ...(kryss[b] || {}) };
  if (varde) katalog[id] = true;
  else delete katalog[id];
  return { ...post, utkast: { ...post.utkast, kryss: { ...kryss, [b]: katalog } } };
}
