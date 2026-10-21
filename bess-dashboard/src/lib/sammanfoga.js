/* Tre-vägs-sammanslagning av portföljdokumentet.

   Hela portföljen sparas som ett JSON-dokument. När två personer ändrar
   samtidigt räcker det inte att den ena vinner — då försvinner den andras
   ändring utan ett ord. I stället jämförs båda versionerna mot det senast
   gemensamma läget (bas) och ändringarna slås ihop:

   - bara jag ändrade      → min version
   - bara den andra ändrade → den andras version
   - båda ändrade lika     → samma sak
   - båda ändrade olika    → min version, och det räknas som en konflikt
                             (kritiska fält: deras version tills någon väljer)

   Listor där alla rader har ett id slås ihop rad för rad och fält för fält,
   så att två personer som ändrar olika risker (eller olika fält på samma
   risk) båda får behålla sina ändringar. Övriga listor behandlas som ett
   värde. */

const likadana = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

const arObjekt = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const arIdLista = (v) => Array.isArray(v) && v.every((r) => arObjekt(r) && r.id !== undefined && r.id !== null);

/* Kritiska fält löses inte automatiskt (granskning #70). Vid konflikt behålls den
   version som redan ligger i databasen (deras) tills någon väljer i konfliktvyn —
   ett kontrollresultat, ett grinddatum eller ett godkännande ska aldrig tyst bytas
   mot det som råkade sparas sist. */
export const KRITISKA_FALT = {
  faltkontroller: ["resultat", "datum", "kontrollant", "referens", "notering"],
  epcFaser: ["grindDatum"],
  godkannanden: ["*"],
};

/** Är fältet på sökvägen `steg` kritiskt? steg = ["faltkontroller", {id}, "resultat"] */
export function arKritisk(steg) {
  const lista = typeof steg[0] === "string" ? KRITISKA_FALT[steg[0]] : null;
  if (!lista) return false;
  const falt = steg.find((x, i) => i > 0 && typeof x === "string");
  return lista.includes("*") || (falt !== undefined && lista.includes(falt));
}

function konflikt(ctx, vag, steg, bas, mina, deras) {
  const kritisk = arKritisk(steg);
  ctx.konflikter.push(vag || "(roten)");
  ctx.detaljer.push({ vag: vag || "(roten)", steg, bas, mina, deras, kritisk });
  return kritisk ? deras : mina;
}

function slaIhop(bas, mina, deras, sokvag, ctx, steg = []) {
  if (likadana(mina, deras)) return mina;
  if (likadana(mina, bas)) return deras;
  if (likadana(deras, bas)) return mina;

  // Båda har ändrat. Gå ner en nivå om det går, annars en konflikt.
  if (arObjekt(mina) && arObjekt(deras)) {
    return slaIhopObjekt(arObjekt(bas) ? bas : {}, mina, deras, sokvag, ctx, steg);
  }
  if (arIdLista(mina) && arIdLista(deras) && (bas === undefined || arIdLista(bas))) {
    return slaIhopLista(bas || [], mina, deras, sokvag, ctx, steg);
  }
  return konflikt(ctx, sokvag, steg, bas, mina, deras);
}

function slaIhopObjekt(bas, mina, deras, sokvag, ctx, steg) {
  const ut = {};
  const nycklar = new Set([...Object.keys(deras), ...Object.keys(mina)]);
  for (const k of nycklar) {
    const v = slaIhop(bas[k], mina[k], deras[k], sokvag ? `${sokvag}.${k}` : k, ctx, [...steg, k]);
    if (v !== undefined) ut[k] = v;
  }
  return ut;
}

function slaIhopLista(bas, mina, deras, sokvag, ctx, steg) {
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
    const radSteg = [...steg, { id: (iMina ?? iDeras ?? iBas).id }];

    if (iMina === undefined && iDeras === undefined) continue;

    if (iMina === undefined) {
      // Jag har tagit bort raden, eller så är den ny hos den andra.
      if (iBas === undefined) ut.push(iDeras);
      else if (!likadana(iDeras, iBas)) {
        // Borttagen hos mig men ändrad hos den andra — behåll ändringen.
        ctx.konflikter.push(vag);
        ctx.detaljer.push({ vag, steg: radSteg, bas: iBas, mina: undefined, deras: iDeras, kritisk: arKritisk(radSteg) });
        ut.push(iDeras);
      }
      continue;
    }
    if (iDeras === undefined) {
      if (iBas === undefined) ut.push(iMina);
      else if (!likadana(iMina, iBas)) {
        ctx.konflikter.push(vag);
        ctx.detaljer.push({ vag, steg: radSteg, bas: iBas, mina: iMina, deras: undefined, kritisk: arKritisk(radSteg) });
        ut.push(iMina);
      }
      continue;
    }
    ut.push(slaIhop(iBas, iMina, iDeras, vag, ctx, radSteg));
  }
  return ut;
}

/** Sätter `varde` på sökvägen `steg` i ett dokument, utan att ändra originalet.
 *  `undefined` på en rad tar bort raden; på ett fält tas fältet bort. */
export function sattVidSteg(dok, steg, varde) {
  if (!steg.length) return varde;
  const [forst, ...rest] = steg;
  if (typeof forst === "object") {
    const lista = Array.isArray(dok) ? dok : [];
    const finns = lista.some((r) => String(r.id) === String(forst.id));
    if (!rest.length) {
      if (varde === undefined) return lista.filter((r) => String(r.id) !== String(forst.id));
      return finns ? lista.map((r) => (String(r.id) === String(forst.id) ? varde : r)) : [...lista, varde];
    }
    if (!finns) return lista;
    return lista.map((r) => (String(r.id) === String(forst.id) ? sattVidSteg(r, rest, varde) : r));
  }
  const ut = { ...(arObjekt(dok) ? dok : {}) };
  const ny = sattVidSteg(ut[forst], rest, varde);
  if (ny === undefined) delete ut[forst];
  else ut[forst] = ny;
  return ut;
}

/**
 * Slår ihop två versioner av samma dokument mot deras gemensamma bas.
 * @returns {import("./typer.js").Sammanslagning} konflikter är sökvägar där
 *   båda ändrat olika. Min version behålls, utom för kritiska fält (KRITISKA_FALT)
 *   där databasens version ligger kvar tills någon väljer. `detaljer` har värdena.
 */
export function sammanfoga(bas, mina, deras) {
  const ctx = { konflikter: [], detaljer: [] };
  const varde = slaIhop(bas, mina, deras, "", ctx);
  return { varde, konflikter: ctx.konflikter, detaljer: ctx.detaljer };
}
