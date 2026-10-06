import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: vi.fn(async () => "encoded-credentials"),
  isHostedServerAuthMode: vi.fn(),
}));

import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { getDataforseoUsageTool } from "@/server/mcp/tools/dataforseo-usage";

beforeEach(() => {
  vi.mocked(isHostedServerAuthMode).mockResolvedValue(false);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("self-host provider usage", () => {
  it("never reads the shared provider account in hosted mode", async () => {
    vi.mocked(isHostedServerAuthMode).mockResolvedValue(true);
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const result = await getDataforseoUsageTool.handler({});
    expect(result.structuredContent.status).toBe("self_host_only");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses only the free account endpoint and omits provider identity and extra fields", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        status_code: 20000,
        tasks: [
          {
            status_code: 20000,
            result: [
              {
                login: "private@example.com",
                money: {
                  balance: 1,
                  total: 5,
                  statistics: {
                    day: {
                      total_serp: 0.2,
                      total_backlinks: 0.1,
                      private: "secret",
                    },
                    minute: { total: 0 },
                  },
                },
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const result = await getDataforseoUsageTool.handler({});
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.dataforseo.com/v3/appendix/user_data",
    );
    expect(fetchMock.mock.calls[0][1]?.method).toBe("GET");
    expect(result.structuredContent).toMatchObject({
      status: "connected",
      balance: 1,
      depositedTotal: 5,
      rollingMinuteSpend: 0,
    });
    expect(result.structuredContent.rollingDaySpend).toBeCloseTo(0.3);
    expect(JSON.stringify(result)).not.toMatch(
      /private@example|secret|encoded-credentials/,
    );
  });

  it("reports a provider refusal without exposing the response body or assuming an empty balance", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response("<html>private-ip secret</html>", { status: 403 }),
        ),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await getDataforseoUsageTool.handler({});
    expect(result.structuredContent).toMatchObject({
      status: "unavailable",
      providerHttpStatus: 403,
      balance: null,
    });
    expect(JSON.stringify(result)).not.toMatch(/private-ip|secret/);
    vi.restoreAllMocks();
  });
});
