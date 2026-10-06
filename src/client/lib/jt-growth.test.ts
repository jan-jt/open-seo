import { describe, expect, it } from "vitest";
import { getJtGeoDestination } from "./jt-growth";

describe("JT growth bridge", () => {
  it("matches each website, keeping the two ARS sites separate", () => {
    for (const [domain, workspace] of [
      ["https://www.BarcelonaInContext.com/en/", "barcelona-in-context"],
      ["valldelamurtra.cat", "vall-de-la-murtra"],
      ["piroars.com", "piro-ars"],
      ["arspirotecnia.com", "ars-pirotecnia-b2b"],
    ]) {
      const target = getJtGeoDestination(domain);
      expect(new URL(target.href).searchParams.get("workspace")).toBe(
        workspace,
      );
      expect(new URL(target.href).pathname).toBe("/geo/");
      expect(target.matched).toBe(true);
    }
  });

  it("opens the portfolio for an unknown or invalid website without a client default", () => {
    for (const domain of [
      null,
      "",
      "new-client.example",
      "https://barcelonaincontext.com.other.example",
      "javascript:alert(1)",
    ]) {
      const target = getJtGeoDestination(domain);
      expect(new URL(target.href).pathname).toBe("/geo/portfolio");
      expect(new URL(target.href).search).toBe("");
      expect(target.matched).toBe(false);
    }
  });
});
