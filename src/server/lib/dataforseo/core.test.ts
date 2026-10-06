import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: vi.fn(async () => "encoded-credentials"),
}));

import { dataforseoPost } from "@/server/lib/dataforseo/core";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DataForSEO transport", () => {
  it("explains an HTTP 403 account-verification rejection without retrying", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          status_code: 40104,
          status_message: "Please verify your account.",
          cost: 0,
          tasks: [],
        },
        { status: 403 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      dataforseoPost("/v3/serp/google/organic/live/advanced", []),
    ).rejects.toMatchObject({
      code: "DATAFORSEO_VERIFICATION_REQUIRED",
      message:
        "DataForSEO account verification required. Open https://app.dataforseo.com/ and complete phone or email verification, then retry.",
      details: { providerStatus: "40104" },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it.each([
    "Forbidden",
    JSON.stringify({
      status_code: 40207,
      status_message: "IP not whitelisted",
    }),
  ])(
    "does not mistake another HTTP 403 for account verification (%s)",
    async (body) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response(body, { status: 403 })),
      );
      await expect(
        dataforseoPost("/v3/serp/google/organic/live/advanced", []),
      ).rejects.toMatchObject({
        code: "INTERNAL_ERROR",
        message: "DataForSEO HTTP 403 on /v3/serp/google/organic/live/advanced",
      });
    },
  );

  it("retries a transient 5xx on idempotent reads and returns the parsed envelope", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("upstream failure", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ status_code: 20000, tasks: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      dataforseoPost("/v3/backlinks/summary/live", []),
    ).resolves.toEqual({ status_code: 20000, tasks: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dataforseo.com/v3/backlinks/summary/live");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Basic encoded-credentials",
    );
  });

  // The request-deadline abort arrives as a bare DOMException. Left unclassified
  // it escapes as an anonymous INTERNAL_ERROR; retrying it would replay a call
  // DataForSEO may already have billed. Both names are reachable: the shared
  // budget aborts with TimeoutError, Lighthouse's own controller with AbortError.
  it.each(["TimeoutError", "AbortError"])(
    "maps a %s abort to UPSTREAM_UNAVAILABLE without retrying",
    async (name) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new DOMException("aborted", name));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        dataforseoPost("/v3/serp/google/organic/live/advanced", []),
      ).rejects.toMatchObject({
        code: "UPSTREAM_UNAVAILABLE",
        name: "DataForSEOTimeoutError",
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );
});
