-- Fish species (catalog, read by all)
create type public.rarity as enum ('common', 'uncommon', 'rare');

create table public.fish_species (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rarity public.rarity not null default 'common',
  base_price integer not null,
  model_ref text not null,
  min_tank_size public.tank_size not null default 'small',
  created_at timestamptz not null default now()
);

alter table public.fish_species enable row level security;

create policy "Anyone can read fish_species"
  on public.fish_species for select
  using (true);

-- Inserts/updates via migrations or service role only (no app user write)
