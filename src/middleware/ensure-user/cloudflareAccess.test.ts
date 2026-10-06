import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { resolveCloudflareAccessContext } from "./cloudflareAccess";

vi.mock("cloudflare:workers", () => ({
  env: {
    TEAM_DOMAIN: "https://jt-shared.cloudflareaccess.com",
    POLICY_AUD: "legacy-seo",
    JT_GROWTH_ACCESS_AUD: "shared-growth",
  },
}));
vi.mock("./delegated", () => ({
  resolveSharedWorkspaceContext: async (userId: string, userEmail: string) => ({
    userId,
    userEmail,
    emailVerified: true,
    organizationId: "shared-org",
    role: "owner",
  }),
}));

let privateKey: CryptoKey;
beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = {
    ...(await exportJWK(pair.publicKey)),
    kid: "shared-test",
    alg: "RS256",
  };
  vi.stubGlobal("fetch", async () => Response.json({ keys: [jwk] }));
});
afterAll(() => vi.unstubAllGlobals());

async function headers(audience: string, expiration = "1h") {
  const token = await new SignJWT({ email: "jan@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "shared-test" })
    .setIssuer("https://jt-shared.cloudflareaccess.com")
    .setAudience(audience)
    .setSubject("jan")
    .setExpirationTime(expiration)
    .sign(privateKey);
  return new Headers({ "cf-access-jwt-assertion": token });
}

describe("shared-host Access authentication", () => {
  it("resolves the same shared workspace through either exact trusted audience", async () => {
    for (const audience of ["legacy-seo", "shared-growth"]) {
      expect(
        await resolveCloudflareAccessContext(await headers(audience)),
      ).toEqual({
        userId: "jan",
        userEmail: "jan@example.com",
        emailVerified: true,
        organizationId: "shared-org",
        role: "owner",
      });
    }
  });

  it("still denies foreign audiences, expired assertions and spoofed identity headers", async () => {
    for (const input of [
      await headers("another-app"),
      await headers("shared-growth", "-1h"),
      new Headers({ "cf-access-authenticated-user-email": "jan@example.com" }),
    ])
      await expect(resolveCloudflareAccessContext(input)).rejects.toThrow();
  });
});
