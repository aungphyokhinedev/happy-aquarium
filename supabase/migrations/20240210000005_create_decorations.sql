-- Decoration types (catalog)
create table public.decoration_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  asset_ref text not null,
  credit_cost integer not null,
  created_at timestamptz not null default now()
);

alter table public.decoration_types enable row level security;

create policy "Anyone can read decoration_types"
  on public.decoration_types for select
  using (true);

-- Decorations (per aquarium, max 10)
create table public.decorations (
  id uuid primary key default gen_random_uuid(),
  aquarium_id uuid not null references public.aquariums (id) on delete cascade,
  decoration_type_id uuid not null references public.decoration_types (id) on delete restrict,
  position_x real not null default 0,
  position_y real not null default 0,
  position_z real not null default 0,
  rotation_y real not null default 0,
  created_at timestamptz not null default now()
);

alter table public.decorations enable row level security;

create index decorations_aquarium_id on public.decorations (aquarium_id);

create policy "Users can manage decorations in own aquarium"
  on public.decorations for all
  using (
    exists (select 1 from public.aquariums a where a.id = decorations.aquarium_id and a.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.aquariums a where a.id = decorations.aquarium_id and a.owner_id = auth.uid())
  );

-- Enforce max 10 decorations per aquarium
create or replace function public.check_decorations_limit()
returns trigger as $$
declare
  dec_count integer;
begin
  select count(*) into dec_count from public.decorations where aquarium_id = coalesce(new.aquarium_id, old.aquarium_id);
  if tg_op = 'INSERT' and dec_count >= 10 then
    raise exception 'Aquarium decoration limit (10) reached';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger decorations_limit_trigger
  before insert on public.decorations
  for each row execute procedure public.check_decorations_limit();
