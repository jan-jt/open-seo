import { z } from "zod";
import { fetchUserData } from "@/server/lib/dataforseo/appendix";
import { asAppError } from "@/server/lib/errors";
import { isHostedServerAuthMode } from "@/server/lib/runtime-env";
import { mcpResponse } from "@/server/mcp/formatters";

const spendKeys = [
  "total_serp",
  "total_keywords_data",
  "total_dataforseo_labs",
  "total_backlinks",
  "total_on_page",
  "total_business_data",
  "total_domain_analytics",
  "total_merchant",
  "total_app_data",
  "total_content_analysis",
  "total_content_generation",
  "total_appendix",
];

const moneyValue = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;

function spendTotal(stats: Record<string, unknown> | null | undefined) {
  if (!stats) return null;
  const total = moneyValue(stats.total);
  if (total !== null) return total;
  const values = spendKeys.map((key) => moneyValue(stats[key]));
  return values.some((value) => value !== null)
    ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
}

export const getDataforseoUsageTool = {
  name: "get_dataforseo_usage",
  config: {
    title: "DataForSEO usage",
    description:
      "Checks the self-hosted server's DataForSEO connection, remaining USD balance, lifetime deposits and rolling day/minute spend. Calls only the free account-data endpoint; no SEO research or credits. Account-wide totals, not per-project budgets. Unavailable on hosted OpenSEO to protect its shared provider account.",
    inputSchema: {} as Record<string, never>,
    outputSchema: z.looseObject({
      status: z.enum(["connected", "unavailable", "self_host_only"]),
      checkedAt: z.string(),
      currency: z.literal("USD"),
      balance: z.number().nullable(),
      depositedTotal: z.number().nullable(),
      rollingDaySpend: z.number().nullable(),
      rollingMinuteSpend: z.number().nullable(),
      providerHttpStatus: z.number().nullable(),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
      destructiveHint: false,
    },
  },
  handler: async (_args: Record<string, never>) => {
    const snapshot = {
      checkedAt: new Date().toISOString(),
      currency: "USD" as const,
      balance: null as number | null,
      depositedTotal: null as number | null,
      rollingDaySpend: null as number | null,
      rollingMinuteSpend: null as number | null,
      providerHttpStatus: null as number | null,
    };
    if (await isHostedServerAuthMode()) {
      return mcpResponse({
        text: "Provider account usage is available only on self-hosted OpenSEO.",
        structuredContent: { ...snapshot, status: "self_host_only" as const },
      });
    }
    try {
      const account = await fetchUserData();
      if (!account) throw new Error("Empty provider account result");
      const money = account.money;
      const usage = {
        ...snapshot,
        status: "connected" as const,
        balance: moneyValue(money?.balance),
        depositedTotal: moneyValue(money?.total),
        rollingDaySpend: spendTotal(money?.statistics?.day),
        rollingMinuteSpend: spendTotal(money?.statistics?.minute),
      };
      return mcpResponse({
        text: `DataForSEO connected. USD balance: ${usage.balance ?? "unknown"}; rolling day spend: ${usage.rollingDaySpend ?? "unknown"}. This free read reports account-wide usage and does not enforce a spending cap.`,
        structuredContent: usage,
      });
    } catch (error) {
      // Provider bodies can contain account details or HTML with IP addresses.
      // Expose only the HTTP status; keep the original error in server logs.
      const rawStatus = asAppError(error)?.details?.providerStatus;
      const httpStatus = rawStatus ? Number(rawStatus) : null;
      const providerHttpStatus =
        httpStatus && httpStatus >= 100 && httpStatus <= 599
          ? httpStatus
          : null;
      console.error("[dataforseo-usage] free account read failed", error);
      return mcpResponse({
        text: providerHttpStatus
          ? `The server's free DataForSEO account read failed with HTTP ${providerHttpStatus}. Check provider API access and deployed credentials before running paid research. This does not establish that the balance is zero.`
          : "The server could not read DataForSEO account usage. Check configuration and provider availability before paid research; balance is unknown.",
        structuredContent: {
          ...snapshot,
          status: "unavailable" as const,
          providerHttpStatus,
        },
      });
    }
  },
};
