import { test } from "@playwright/test";
import fs from "node:fs";
const S = process.env.SVEP;
const VYER = ["metod","start","idag","oversikt","kontrakt","epc","site","tidplan","handlingsplan","resurser","kontakter","punkter","tavla","moten","vecka","dagbok","hseq","risker","storning","ata","atakalkyl","budget","tid","ekonomi","milstolpar","faktura","slutdok","rapport","rutiner","data"];
test("svep", async ({ page }, info) => {
  test.setTimeout(900000);
  const W = info.project.name === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 };
  await page.setViewportSize(W);
  const ut = [];
  let fel = [];
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_TUNNEL|fonts\.g/.test(m.text())) fel.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => fel.push("PAGEERROR " + String(e).slice(0, 200)));
  await page.goto("/");
  await page.waitForTimeout(1500);
  for (const vy of VYER) {
    fel = [];
    await page.goto("/#/" + vy);
    await page.waitForTimeout(1800);
    const info2 = await page.evaluate(() => {
      const h1 = document.querySelector("h1")?.textContent?.trim();
      const sidled = document.documentElement.scrollWidth - window.innerWidth;
      const brutna = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.slice(-60));
      const klippt = [...document.querySelectorAll("main button, main h2, main h3, main h4, main label, main th, main a")].filter((e) => { const s = getComputedStyle(e); return e.scrollWidth > e.clientWidth + 2 && s.textOverflow !== "ellipsis" && s.overflowX !== "visible" && e.offsetParent; }).slice(0, 6).map((e) => e.textContent.trim().slice(0, 40));
      const utanfor = [...document.querySelectorAll("main *")].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > window.innerWidth + 1)) return false; let p = e.parentElement; while (p) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) return false; p = p.parentElement; } return true; }).slice(0, 4).map((e) => e.tagName + "." + String(e.className).slice(0, 50));
      return { h1, sidled, brutna, klippt, utanfor };
    });
    await page.screenshot({ path: `${S}/${info.project.name}-${vy}.png`, fullPage: true });
    ut.push({ vy, ...info2, fel: [...new Set(fel)] });
  }
  fs.writeFileSync(`${S}/${info.project.name}.json`, JSON.stringify(ut, null, 1));
});
