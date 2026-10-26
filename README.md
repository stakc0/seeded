# seeded

Seeded is a project seed-round launchpad shell. It keeps the useLaunch information architecture while presenting project funding through Pump.fun.

- Main CA: `619k8nfLocMxXCqDWei37QxTnZ114LfuHQSdU19pump`
- X: `https://x.com/seededtrade`
- Market source: Dexscreener token-pairs API
- Market cache: Supabase table `seeded_market_cache` when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured server-side

## Run

```bash
npm run build
npm run dev
```

Apply `supabase/schema.sql` to the configured Supabase project before expecting durable cache writes. Until those server variables exist, `/api/market` still returns a truthful Dexscreener read with a process-local fallback cache; it does not pretend that durable DB caching is enabled.
