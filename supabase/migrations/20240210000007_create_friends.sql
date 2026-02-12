-- Friend requests
create type public.friend_request_status as enum ('pending', 'accepted', 'rejected');

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.profiles (id) on delete cascade,
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id)
);

alter table public.friend_requests enable row level security;

create index friend_requests_from on public.friend_requests (from_user_id);
create index friend_requests_to on public.friend_requests (to_user_id);

create policy "Users can see requests they sent or received"
  on public.friend_requests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can insert requests they send"
  on public.friend_requests for insert
  with check (auth.uid() = from_user_id);

create policy "Recipient can update (accept/reject)"
  on public.friend_requests for update
  using (auth.uid() = to_user_id);

-- Friends (symmetric for easy listing)
create table public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  friend_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id != friend_id)
);

alter table public.friends enable row level security;

create index friends_user_id on public.friends (user_id);

create policy "Users can see own friends"
  on public.friends for select
  using (auth.uid() = user_id);

create policy "Users can insert when accepting request (via function or app)"
  on public.friends for insert
  with check (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users can delete own friend link"
  on public.friends for delete
  using (auth.uid() = user_id or auth.uid() = friend_id);
