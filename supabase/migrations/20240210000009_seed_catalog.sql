-- Seed fish_species and decoration_types (run as part of migrations)
insert into public.fish_species (id, name, rarity, base_price, model_ref, min_tank_size) values
  ('a0000001-0001-4000-8000-000000000001', 'Goldfish', 'common', 20, 'goldfish', 'small'),
  ('a0000001-0001-4000-8000-000000000002', 'Neon Tetra', 'common', 15, 'neon_tetra', 'small'),
  ('a0000001-0001-4000-8000-000000000003', 'Guppy', 'common', 10, 'guppy', 'small'),
  ('a0000001-0001-4000-8000-000000000004', 'Angelfish', 'uncommon', 45, 'angelfish', 'medium'),
  ('a0000001-0001-4000-8000-000000000005', 'Betta', 'uncommon', 35, 'betta', 'small'),
  ('a0000001-0001-4000-8000-000000000006', 'Clownfish', 'uncommon', 50, 'clownfish', 'medium'),
  ('a0000001-0001-4000-8000-000000000007', 'Dragon Fish', 'rare', 120, 'dragon_fish', 'large'),
  ('a0000001-0001-4000-8000-000000000008', 'Crystal Tetra', 'rare', 100, 'crystal_tetra', 'medium');

insert into public.decoration_types (id, name, asset_ref, credit_cost) values
  ('b0000001-0001-4000-8000-000000000001', 'Small Plant', 'plant_small', 10),
  ('b0000001-0001-4000-8000-000000000002', 'Large Plant', 'plant_large', 25),
  ('b0000001-0001-4000-8000-000000000003', 'Rock Small', 'rock_small', 15),
  ('b0000001-0001-4000-8000-000000000004', 'Rock Large', 'rock_large', 30),
  ('b0000001-0001-4000-8000-000000000005', 'Shell', 'shell', 20),
  ('b0000001-0001-4000-8000-000000000006', 'Coral', 'coral', 40);
