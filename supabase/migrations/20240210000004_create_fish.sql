-- Fish (per aquarium, max 10 enforced in app + trigger)
create table public.fish (
  id uuid primary key default gen_random_uuid(),
  aquarium_id uuid not null references public.aquariums (id) on delete cascade,
  fish_species_id uuid not null references public.fish_species (id) on delete restrict,
  name text,
  health integer not null default 100 check (health >= 0 and health <= 100),
  hunger integer not null default 100 check (hunger >= 0 and hunger <= 100),
  list_price integer,
  listed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.fish enable row level security;

create index fish_aquarium_id on public.fish (aquarium_id);

-- RLS: user can only access fish in their aquarium
create policy "Users can manage fish in own aquarium"
  on public.fish for all
  using (
    exists (
      select 1 from public.aquariums a
      where a.id = fish.aquarium_id and a.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.aquariums a
      where a.id = fish.aquarium_id and a.owner_id = auth.uid()
    )
  );

-- Enforce max 10 fish per aquarium
create or replace function public.check_fish_limit()
returns trigger as $$
declare
  fish_count integer;
begin
  select count(*) into fish_count from public.fish where aquarium_id = coalesce(new.aquarium_id, old.aquarium_id);
  if tg_op = 'INSERT' and fish_count >= 10 then
    raise exception 'Aquarium fish limit (10) reached';
  end if;
  if tg_op = 'INSERT' then
    return new;
  end if;
  return old;
end;
$$ language plpgsql;

create trigger fish_limit_trigger
  before insert on public.fish
  for each row execute procedure public.check_fish_limit();
