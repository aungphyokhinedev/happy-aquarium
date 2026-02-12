-- Breeding events (history, for debugging)
create table public.breeding_events (
  id uuid primary key default gen_random_uuid(),
  aquarium_id uuid not null references public.aquariums (id) on delete cascade,
  parent_fish_ids uuid[] not null,
  offspring_fish_id uuid references public.fish (id) on delete set null,
  environment_snapshot jsonb,
  triggered_at timestamptz not null default now()
);

alter table public.breeding_events enable row level security;

create index breeding_events_aquarium_id on public.breeding_events (aquarium_id);

create policy "Users can read breeding events for own aquarium"
  on public.breeding_events for select
  using (
    exists (select 1 from public.aquariums a where a.id = breeding_events.aquarium_id and a.owner_id = auth.uid())
  );

-- Insert/update only from service role (Edge Function)
create policy "Service role can insert breeding_events"
  on public.breeding_events for insert
  with check (auth.role() = 'service_role');
