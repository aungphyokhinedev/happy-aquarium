-- Inventory: food, medicine, etc. (item_type = 'food' | 'medicine' | uuid for decoration_type_id stored as text)
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  item_type text not null,
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, item_type)
);

alter table public.inventory enable row level security;

create index inventory_user_id on public.inventory (user_id);

create policy "Users can manage own inventory"
  on public.inventory for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
