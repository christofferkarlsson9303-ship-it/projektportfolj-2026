/* Räknare ur entreprenadjuridiken. Rena funktioner in/ut — i standalone-
   versionen läste de värden direkt ur DOM:en via getElementById. */

/** Á-priskontroll, AB 04/ABT 06 kap. 6 § 6.
 *  Rätt att säga upp ett á-pris uppstår när mängden ändrats minst ±25 %
 *  OCH värdet av ändringen överstiger 0,5 % av kontraktssumman. */
export function aprisKontroll({ kontraktssumma, apris, mangdFore, mangdEfter }) {
  const ks = Number(kontraktssumma) || 0;
  const pris = Number(apris) || 0;
  const m0 = Number(mangdFore) || 0;
  const m1 = Number(mangdEfter) || 0;

  if (!ks || !pris || !m0) return { ofullstandig: true };

  const dm = m1 - m0;
  const dproc = (dm / m0) * 100;
  const varde = Math.abs(dm) * pris;
  const grans = ks * 0.005;

  return {
    ofullstandig: false,
    dm,
    dproc,
    varde,
    grans,
    gransMangd: grans / pris,
    mangdUppfylld: Math.abs(dproc) >= 25,
    vardeUppfyllt: varde > grans,
    uppfyllt: Math.abs(dproc) >= 25 && varde > grans,
  };
}

/** Slutavräkning enligt flödesschema 3.1.
 *  Är avgående arbeten större än tillkommande har ONE rätt till 10 % av
 *  mellanskillnaden. Överstiger den 20 % av kontraktssumman tillkommer rimlig
 *  ersättning för utebliven vinst på det överskjutande beloppet. */
export function slutavrakning({ kontraktssumma, tillkommande, avgaende }) {
  const ks = Number(kontraktssumma) || 0;
  const till = Number(tillkommande) || 0;
  const avg = Number(avgaende) || 0;

  if (!ks) return { ofullstandig: true };

  const mellan = avg - till;
  const g20 = ks * 0.2;

  if (mellan <= 0) return { ofullstandig: false, ratt: false, till, avg };

  return {
    ofullstandig: false,
    ratt: true,
    mellan,
    g20,
    tio: mellan * 0.1,
    over: mellan - g20,
  };
}
