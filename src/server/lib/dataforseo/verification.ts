import { z } from "zod";
import { AppError } from "@/server/lib/errors";

const statusSchema = z.object({ status_code: z.number().int() });

/** Account verification can arrive as HTTP 403 or an HTTP 200 API/task error. */
export function classifyDataforseoVerificationError(
  status: number | undefined,
  details: string,
  path: string,
): AppError | null {
  let apiStatus = status;
  if (status !== undefined && status < 1000) {
    try {
      const parsed = statusSchema.safeParse(JSON.parse(details));
      apiStatus = parsed.success ? parsed.data.status_code : undefined;
    } catch {
      return null;
    }
  }
  // A generic 403 does not prove a verification problem. Only trust the
  // provider's documented account-verification code, never arbitrary copy.
  if (apiStatus !== 40104) return null;

  return new AppError(
    "DATAFORSEO_VERIFICATION_REQUIRED",
    "DataForSEO account verification required. Open https://app.dataforseo.com/ and complete phone or email verification, then retry.",
    { provider: "dataforseo", providerStatus: "40104", providerPath: path },
  );
}
