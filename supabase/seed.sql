-- Seed fish_species (run with supabase db seed or in migration with proper role)
insert into public.fish_species (id, name, rarity, base_price, model_ref, min_tank_size) values
  (gen_random_uuid(), 'Goldfish', 'common', 20, 'goldfish', 'small'),
  (gen_random_uuid(), 'Neon Tetra', 'common', 15, 'neon_tetra', 'small'),
  (gen_random_uuid(), 'Guppy', 'common', 10, 'guppy', 'small'),
  (gen_random_uuid(), 'Angelfish', 'uncommon', 45, 'angelfish', 'medium'),
  (gen_random_uuid(), 'Betta', 'uncommon', 35, 'betta', 'small'),
  (gen_random_uuid(), 'Clownfish', 'uncommon', 50, 'clownfish', 'medium'),
  (gen_random_uuid(), 'Dragon Fish', 'rare', 120, 'dragon_fish', 'large'),
  (gen_random_uuid(), 'Crystal Tetra', 'rare', 100, 'crystal_tetra', 'medium');

-- Seed decoration_types
insert into public.decoration_types (id, name, asset_ref, credit_cost) values
  (gen_random_uuid(), 'Small Plant', 'plant_small', 10),
  (gen_random_uuid(), 'Large Plant', 'plant_large', 25),
  (gen_random_uuid(), 'Rock Small', 'rock_small', 15),
  (gen_random_uuid(), 'Rock Large', 'rock_large', 30),
  (gen_random_uuid(), 'Shell', 'shell', 20),
  (gen_random_uuid(), 'Coral', 'coral', 40 );
