/** Sammanfattar befintliga fasgrindar. Framdrift är inte verifierade provresultat. */
export function metodStegLage(faser) {
  const totalt = faser.length;
  const passerade = faser.filter((f) => f.grind.passerad).length;
  const bas = { totalt, passerade, procent: totalt ? Math.round(100 * passerade / totalt) : 0 };
  if (!totalt) return { ...bas, ton: "neutral", text: "Inga moment" };
  if (passerade === totalt) return { ...bas, ton: "ok", text: "Grindar passerade" };
  if (faser.some((f) => !f.grind.passerad && f.status === "sen")) return { ...bas, ton: "bad", text: "Försenat enligt plan" };
  if (passerade || faser.some((f) => f.status === "pagar")) return { ...bas, ton: "warn", text: "Pågår" };
  return { ...bas, ton: "neutral", text: faser.every((f) => f.status === "odaterad") ? "Datum saknas" : "Kommande" };
}
