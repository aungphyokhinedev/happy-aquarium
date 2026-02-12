import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RARE_CHANCE = 0.08
const ENV_HUNGER_MIN = 30
const ENV_HEALTH_MIN = 50
const BREED_CHANCE = 0.3

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization' } })
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { data: aquariums } = await supabase.from('aquariums').select('id, owner_id, tank_size')
    if (!aquariums?.length) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    let processed = 0
    for (const aq of aquariums as { id: string; owner_id: string; tank_size: string }[]) {
      const { data: fishList } = await supabase.from('fish').select('id, fish_species_id, health, hunger').eq('aquarium_id', aq.id)
      const fish = (fishList ?? []) as { id: string; fish_species_id: string; health: number; hunger: number }[]
      if (fish.length < 2 || fish.length >= 10) continue

      const avgHunger = fish.reduce((s, f) => s + f.hunger, 0) / fish.length
      const avgHealth = fish.reduce((s, f) => s + f.health, 0) / fish.length
      if (avgHunger < ENV_HUNGER_MIN || avgHealth < ENV_HEALTH_MIN) continue
      if (Math.random() > BREED_CHANCE) continue

      const bySpecies = new Map<string, typeof fish>()
      fish.forEach((f) => {
        const list = bySpecies.get(f.fish_species_id) ?? []
        list.push(f)
        bySpecies.set(f.fish_species_id, list)
      })
      let parentSpeciesId: string | null = null
      let parents: { id: string }[] = []
      for (const [, list] of bySpecies) {
        if (list.length >= 2) {
          parentSpeciesId = list[0].fish_species_id
          parents = [list[0], list[1]]
          break
        }
      }
      if (!parentSpeciesId || parents.length < 2) continue

      const { data: speciesList } = await supabase.from('fish_species').select('id, rarity').eq('rarity', 'rare')
      const rareSpecies = (speciesList ?? []) as { id: string; rarity: string }[]
      let offspringSpeciesId = parentSpeciesId
      if (rareSpecies.length > 0 && Math.random() < RARE_CHANCE) {
        offspringSpeciesId = rareSpecies[Math.floor(Math.random() * rareSpecies.length)].id
      }

      const { data: newFish, error: insertErr } = await supabase.from('fish').insert({
        aquarium_id: aq.id,
        fish_species_id: offspringSpeciesId,
        health: 100,
        hunger: 100,
      }).select('id').single()

      if (insertErr) continue

      await supabase.from('breeding_events').insert({
        aquarium_id: aq.id,
        parent_fish_ids: parents.map((p) => p.id),
        offspring_fish_id: (newFish as { id: string }).id,
        environment_snapshot: { avgHunger, avgHealth, tank_size: aq.tank_size },
      })
      processed++
    }

    return new Response(JSON.stringify({ processed }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
