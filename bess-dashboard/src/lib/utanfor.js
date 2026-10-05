/* Utanför appen — en enkel räknare för hur väl verktyget räcker.

   Varje gång projektledaren ändå går till Excel, Teams, mejl eller papper för
   att få fram något loggas det med ett klick: vart och vad. Efter ett par
   veckor visar sammanställningen vad som saknas i appen, eller vad som kan
   strykas. Raderna ligger i portföljen (state.utanfor) och följer med i
   synk och säkerhetskopia. */

export const VART = ["Excel", "Teams", "Mejl", "SharePoint", "Papper", "Telefon", "Annat"];

/** En ny rad. Tom "vad" är tillåtet — ett klick ska räcka. */
export function nyUtanfor({ vart, vad = "", projektId = "", nu = new Date() }) {
  return {
    id: "ut" + nu.getTime() + Math.random().toString(36).slice(2, 6),
    ts: nu.toISOString(),
    vart,
    vad: String(vad).trim(),
    projektId,
  };
}

/**
 * Sammanställning för de senaste `dagar` dagarna.
 * @returns {{ antal, perVart: [vart, n][], vanligast: [vad, n][], rader }}
 */
export function sammanstall(rader = [], { nu = new Date(), dagar = 14 } = {}) {
  const fran = nu.getTime() - dagar * 864e5;
  const inom = rader.filter((r) => Date.parse(r.ts) >= fran).sort((a, b) => b.ts.localeCompare(a.ts));
  const raknaUpp = (nyckel) => {
    const m = new Map();
    for (const r of inom) {
      const k = nyckel(r);
      if (!k) continue;
      const finns = m.get(k.toLocaleLowerCase("sv"));
      m.set(k.toLocaleLowerCase("sv"), { text: finns?.text || k, n: (finns?.n || 0) + 1 });
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.text.localeCompare(b.text, "sv")).map((x) => [x.text, x.n]);
  };
  return {
    antal: inom.length,
    perVart: raknaUpp((r) => r.vart),
    vanligast: raknaUpp((r) => r.vad).slice(0, 5),
    rader: inom,
  };
}
