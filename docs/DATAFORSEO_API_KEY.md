# DataForSEO API Key Setup

OpenSEO uses [DataForSEO](https://dataforseo.com/?aff=255379) to fetch SEO data. It's a pay-as-you-go third-party service unaffiliated with OpenSEO. You need an API key to connect OpenSEO to it.

New DataForSEO accounts include $1 of free credit to test with, and the minimum top-up is $50.

## Get your API key

1. Go to [DataForSEO API Access](https://app.dataforseo.com/api-access?aff=255379) (create an account if you don't have one).
2. Click "Send by email" to get your credentials.
3. Copy the longer credentials labelled "Base64" credentials. This is the base64 encoded value of your DataForSEO email and API password in the format `email:password`.

## Where to set it

Set the value as `DATAFORSEO_API_KEY`:

- **Docker self-hosting:** in `.env` (see [`SELF_HOSTING_DOCKER.md`](./SELF_HOSTING_DOCKER.md)).
- **Cloudflare self-hosting:** in `.env.selfhost` (see [`SELF_HOSTING_CLOUDFLARE.md`](./SELF_HOSTING_CLOUDFLARE.md)). Legacy button/Wrangler deployments: as a Worker secret in the dashboard under `Settings` -> `Variables & Secrets`.
- **Local development:** in `.env.local` (see [`LOCAL_DEVELOPMENT.md`](./LOCAL_DEVELOPMENT.md)).

## Verify access and inspect usage

Complete any email or phone verification requested in your DataForSEO account before fetching SEO data. Keep credentials and verification codes out of prompts and repositories.

On a connected self-hosted OpenSEO agent, ask it to check DataForSEO usage. The `get_dataforseo_usage` MCP tool calls only the free account-data endpoint and reports the remaining USD balance, lifetime deposits and rolling day/minute spend. These totals cover the provider account across all websites; they are not project budgets or enforced spending caps. The hosted service does not expose its shared provider account.

A successful account read confirms access to that free endpoint. It does not prove that every research API is enabled. If a rank or research request fails, check the provider's account-verification and API-access settings before repeating paid calls. An unavailable usage read means the balance is unknown, rather than zero. Review a concrete request estimate before starting rank checks or other research.
