-- Tank size enum
create type public.tank_size as enum ('small', 'medium', 'large');

-- Aquariums (one per user for MVP)
create table public.aquariums (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade unique,
  tank_size public.tank_size not null default 'small',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.aquariums enable row level security;

create policy "Users can manage own aquarium"
  on public.aquariums for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create index aquariums_owner_id on public.aquariums (owner_id);

-- Create aquarium when profile is created
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.aquariums (owner_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();
