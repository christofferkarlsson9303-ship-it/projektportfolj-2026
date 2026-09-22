/* Triage för veckokollen.

   VECKOFRAGOR lagrar svaren som ja/nej/osaker och veckaFlaggor avgör vad som
   kräver åtgärd. Båda är extraherade ur standalone-filen och ska vara orörda.
   Det här lagret översätter bara ett svar till en allvarsgrad för
   gränssnittet — ingenting lagras i den här formen.

   Varje fråga har exakt ett svar som inte är flaggat (OK) och ett som är det
   (Avvikelse). Fem av frågorna har dessutom "osäker", som är flaggad men
   betyder något annat än ett rakt ja: den som är osäker ska kontrollera, inte
   rapportera. Därför får den en egen grad. */

export const SVARSORD = { ja: "Ja", nej: "Nej", osaker: "Osäker" };

export const ALLVARSNAMN = { ok: "OK", varning: "Varning", avvikelse: "Avvikelse" };

/** "ok" | "varning" | "avvikelse", eller null för obesvarat. */
export function allvar(fraga, svar) {
  if (!svar) return null;
  if (svar === "osaker") return "varning";
  return fraga.flagga.includes(svar) ? "avvikelse" : "ok";
}
