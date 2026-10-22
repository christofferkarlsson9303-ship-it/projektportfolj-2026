import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { createElement } from "react";

vi.mock("../../assets/one-nordic-logo.png", () => ({ default: path.resolve("src/assets/one-nordic-logo.png") }));

const { renderToBuffer } = await import("@react-pdf/renderer");
const { StyrningsrapportPdf } = await import("./StyrningsrapportPdf.jsx");

describe("StyrningsrapportPdf", () => {
  it("renderar hela rapporten som PDF", async () => {
    const buf = await renderToBuffer(createElement(StyrningsrapportPdf, { datum: "2026-10-22" }));
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  }, 60_000);
});
