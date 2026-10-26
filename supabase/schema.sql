create table if not exists public.seeded_market_cache (
  mint text primary key,
  status text not null check (status in ('live','unavailable')),
  market_cap_usd numeric,
  volume_24h_usd numeric,
  liquidity_usd numeric,
  price_usd numeric,
  pair_address text,
  dex_id text,
  url text,
  source text not null default 'dexscreener',
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists seeded_market_cache_fetched_at_idx on public.seeded_market_cache (fetched_at desc);
revoke all on table public.seeded_market_cache from anon, authenticated;
