/* Vilka kontraktsvillkor i mallarna som är kontrollerade för ett projekt.

   Betalningsmodellen M1–M7, vitesbelopp och vissa frister kommer ur Batch C
   (36037 Växjö, 36038 Alvesta). Ett nytt projekt får samma mallar som
   utgångspunkt, men sidan får inte påstå att villkoren gäller dess kontrakt
   förrän någon har kontrollerat dem. */

export const BATCH_C = new Set(["36037", "36038"]);

/** Sant när projektets kontraktsvillkor är de som mallarna bygger på. */
export const harBatchCKontrakt = (pid) => BATCH_C.has(pid);

/** Text för ett villkor: kontraktets lydelse för Batch C, annars en tydlig mallmarkering. */
export function kontraktsText(pid, iKontraktet, iMallen) {
  return harBatchCKontrakt(pid) ? iKontraktet : iMallen;
}
