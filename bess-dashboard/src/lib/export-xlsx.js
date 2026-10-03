import { idag } from "./datum.js";
import { laddaNer } from "./export.js";

export async function skapaExcel(kolumner, rader, namn) {
  const { default: ExcelJS } = await import("exceljs");
  const bok = new ExcelJS.Workbook();
  bok.creator = "ONE Nordic AB";
  const blad = bok.addWorksheet(String(namn).replace(/[\\/*?:[\]]/g, " ").slice(0, 31) || "Tabell");
  blad.columns = kolumner.map((k) => ({ header: k.rubrik, key: k.nyckel, width: Math.min(55, Math.max(15, (k.bredd || 160) / 8)) }));
  for (const rad of rader) blad.addRow(kolumner.map((k) => {
    const v = k.exportVarde ? k.exportVarde(rad) : rad[k.nyckel];
    // Numerisk export ska förbli tal; text lagras som text, aldrig som formel.
    if ((k.typ === "num" || k.typ === "sek") && v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v))) return Number(v);
    return v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : v;
  }));
  blad.views = [{ state: "frozen", ySplit: 1 }];
  blad.autoFilter = { from: { row: 1, column: 1 }, to: { row: rader.length + 1, column: kolumner.length } };
  if (kolumner.some((k) => k.summera) && rader.length) {
    const rad = blad.addRow(kolumner.map((k, i) => k.summera ? {
      formula: `SUBTOTAL(109,${blad.getColumn(i + 1).letter}2:${blad.getColumn(i + 1).letter}${rader.length + 1})`,
      result: rader.reduce((s, r) => s + (Number(k.sortVarde ? k.sortVarde(r) : r[k.nyckel]) || 0), 0),
    } : i === 0 ? `Summa (${rader.length})` : ""));
    rad.font = { bold: true };
  }
  blad.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  blad.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF005F76" } };
  kolumner.forEach((k, i) => {
    if (k.typ === "sek" || k.typ === "num") {
      blad.getColumn(i + 1).numFmt = k.typ === "sek" ? '#,##0.00 "kr"' : '#,##0.##';
      blad.getColumn(i + 1).alignment = { horizontal: "right" };
    }
  });
  return bok.xlsx.writeBuffer();
}

export async function exporteraExcel(namn, kolumner, rader) {
  const buffer = await skapaExcel(kolumner, rader, namn);
  const rent = String(namn).replace(/[^\p{L}\p{N}_-]+/gu, "_");
  return laddaNer(`Portfolj_${rent}_${idag()}.xlsx`, buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}
