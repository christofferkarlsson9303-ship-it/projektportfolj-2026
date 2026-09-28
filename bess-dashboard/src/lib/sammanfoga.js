/* Tre-vägs-sammanslagning av portföljdokumentet.

   Hela portföljen sparas som ett JSON-dokument. När två personer ändrar
   samtidigt räcker det inte att den ena vinner — då försvinner den andras
   ändring utan ett ord. I stället jämförs båda versionerna mot det senast
   gemensamma läget (bas) och ändringarna slås ihop:

   - bara jag ändrade      → min version
   - bara den andra ändrade → den andras version
   - båda ändrade lika     → samma sak
   - båda ändrade olika    → min version, och det räknas som en konflikt

   Listor där alla rader har ett id slås ihop rad för rad och fält för fält,
   så att två personer som ändrar olika risker (eller olika fält på samma
   risk) båda får behålla sina ändringar. Övriga listor behandlas som ett
   värde. */

const likadana = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

const arObjekt = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const arIdLista = (v) => Array.isArray(v) && v.every((r) => arObjekt(r) && r.id !== undefined && r.id !== null);

function slaIhop(bas, mina, deras, sokvag, konflikter) {
  if (likadana(mina, deras)) return mina;
  if (likadana(mina, bas)) return deras;
  if (likadana(deras, bas)) return mina;

  // Båda har ändrat. Gå ner en nivå om det går, annars vinner min version.
  if (arObjekt(mina) && arObjekt(deras)) {
    return slaIhopObjekt(arObjekt(bas) ? bas : {}, mina, deras, sokvag, konflikter);
  }
  if (arIdLista(mina) && arIdLista(deras) && (bas === undefined || arIdLista(bas))) {
    return slaIhopLista(bas || [], mina, deras, sokvag, konflikter);
  }
  konflikter.push(sokvag || "(roten)");
  return mina;
}

function slaIhopObjekt(bas, mina, deras, sokvag, konflikter) {
  const ut = {};
  const nycklar = new Set([...Object.keys(deras), ...Object.keys(mina)]);
  for (const k of nycklar) {
    const v = slaIhop(bas[k], mina[k], deras[k], sokvag ? `${sokvag}.${k}` : k, konflikter);
    if (v !== undefined) ut[k] = v;
  }
  return ut;
}

function slaIhopLista(bas, mina, deras, sokvag, konflikter) {
  const index = (lista) => new Map(lista.map((r) => [String(r.id), r]));
  const b = index(bas);
  const m = index(mina);
  const d = index(deras);

  // Deras ordning först, sedan rader som bara jag har lagt till.
  const ordning = [...d.keys(), ...[...m.keys()].filter((id) => !d.has(id))];
  const ut = [];
  for (const id of ordning) {
    const iBas = b.get(id);
    const iMina = m.get(id);
    const iDeras = d.get(id);
    const vag = `${sokvag}[${id}]`;

    if (iMina === undefined && iDeras === undefined) continue;

    if (iMina === undefined) {
      // Jag har tagit bort raden, eller så är den ny hos den andra.
      if (iBas === undefined) ut.push(iDeras);
      else if (!likadana(iDeras, iBas)) {
        // Borttagen hos mig men ändrad hos den andra — behåll ändringen.
        konflikter.push(vag);
        ut.push(iDeras);
      }
      continue;
    }
    if (iDeras === undefined) {
      if (iBas === undefined) ut.push(iMina);
      else if (!likadana(iMina, iBas)) {
        konflikter.push(vag);
        ut.push(iMina);
      }
      continue;
    }
    ut.push(slaIhop(iBas, iMina, iDeras, vag, konflikter));
  }
  return ut;
}

/**
 * Slår ihop två versioner av samma dokument mot deras gemensamma bas.
 * @returns {{ varde: any, konflikter: string[] }} konflikter är sökvägar där
 *   båda ändrat olika — där har min version behållits.
 */
export function sammanfoga(bas, mina, deras) {
  const konflikter = [];
  const varde = slaIhop(bas, mina, deras, "", konflikter);
  return { varde, konflikter };
}
