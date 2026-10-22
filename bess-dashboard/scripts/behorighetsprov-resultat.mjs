/** Ett nät-/schemafel är inte ett bevis på fungerande behörighet. */
export function bedomProvsvar(r, { tomtArNekat = false, tomtArTillatet = false } = {}) {
  if (r.error) return {
    ok: r.error.code === "42501" ? false : null,
    text: `${r.error.code || ""} ${r.error.message || "Okänt API-fel"}`.trim(),
  };
  if (Array.isArray(r.data) && r.data.length) return { ok: true, text: `${r.data.length} rader` };
  if (tomtArTillatet) return { ok: true, text: "anropet lyckades" };
  if (tomtArNekat) return { ok: false, text: "0 rader av en känd befintlig rad" };
  return { ok: null, text: "Tomt svar: saknar provdata för att avgöra behörigheten" };
}

export function slutresultat(avvikelser, ejProvade) {
  if (avvikelser) return { kod: 1, text: `**${avvikelser} avvikelser.** ${ejProvade} prov ej verifierade. Issue #75 ska vara öppen.` };
  if (ejProvade) return { kod: 2, text: `**Ofullständigt behörighetsprov: ${ejProvade} prov ej verifierade.** Issue #75 ska vara öppen.` };
  return { kod: 0, text: "Alla körda prov verifierade utan avvikelser. Kontrollera även SQL-inventering och backup innan issue #75 stängs." };
}

export function kontrolleraStadning(r) {
  if (r.error || !Array.isArray(r.data) || !r.data.length) throw new Error("Städningen misslyckades: kontrollera behörighetsprovets egna provrader/filer innan det körs igen");
}
