import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Fish, FishSpecies } from '@/lib/supabase'
import { MAX_SELL_MULTIPLIER, FOOD_HUNGER_RESTORE, MEDICINE_HEALTH_RESTORE } from '@/game/constants'

interface FishWithSpecies extends Fish {
  fish_species?: FishSpecies
}

interface FishListProps {
  fish: FishWithSpecies[]
  credits: number
  onSell: () => void
  onFeed: () => void
  onCreditsChange: () => void
}

export function FishList({ fish, onSell, onFeed, onCreditsChange }: FishListProps) {
  const [sellPrice, setSellPrice] = useState<Record<string, number>>({})
  const [sellingId, setSellingId] = useState<string | null>(null)
  const [feedingId, setFeedingId] = useState<string | null>(null)
  const [foodQty, setFoodQty] = useState(0)
  const [medicineQty, setMedicineQty] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      if (!user) return
      supabase.from('inventory').select('item_type, quantity').eq('user_id', user.id).then(({ data }) => {
        const inv = (data ?? []) as { item_type: string; quantity: number }[]
        setFoodQty(inv.find((i) => i.item_type === 'food')?.quantity ?? 0)
        setMedicineQty(inv.find((i) => i.item_type === 'medicine')?.quantity ?? 0)
      })
    })
  }, [fish])

  async function sellFish(f: FishWithSpecies) {
    const species = f.fish_species
    if (!species || !userId) return
    const maxPrice = Math.floor(species.base_price * MAX_SELL_MULTIPLIER)
    const price = sellPrice[f.id] ?? species.base_price
    const capped = Math.min(maxPrice, Math.max(0, price))
    setSellingId(f.id)
    const { error } = await supabase.from('fish').delete().eq('id', f.id)
    if (error) { setSellingId(null); return }
    const { data: p } = await supabase.from('profiles').select('daily_credits_balance').eq('id', userId).single()
    const balance = (p as { daily_credits_balance: number } | null)?.daily_credits_balance ?? 0
    await supabase.from('profiles').update({
      daily_credits_balance: balance + capped,
      updated_at: new Date().toISOString(),
    }).eq('id', userId)
    setSellingId(null)
    onSell()
    onCreditsChange()
  }

  async function feedFish(fishId: string) {
    if (foodQty < 1 || !userId) return
    setFeedingId(fishId)
    const { data: row } = await supabase.from('inventory').select('id, quantity').eq('user_id', userId).eq('item_type', 'food').single()
    if (!row || (row as { quantity: number }).quantity < 1) { setFeedingId(null); return }
    const { data: fishRow } = await supabase.from('fish').select('hunger').eq('id', fishId).single()
    const hunger = Math.min(100, ((fishRow as { hunger: number } | null)?.hunger ?? 0) + FOOD_HUNGER_RESTORE)
    await supabase.from('fish').update({ hunger }).eq('id', fishId)
    await supabase.from('inventory').update({ quantity: (row as { quantity: number }).quantity - 1, updated_at: new Date().toISOString() }).eq('id', (row as { id: string }).id)
    setFoodQty((q) => Math.max(0, q - 1))
    setFeedingId(null)
    onFeed()
  }

  async function useMedicine(fishId: string) {
    if (medicineQty < 1 || !userId) return
    setFeedingId(fishId)
    const { data: row } = await supabase.from('inventory').select('id, quantity').eq('user_id', userId).eq('item_type', 'medicine').single()
    if (!row || (row as { quantity: number }).quantity < 1) { setFeedingId(null); return }
    const { data: fishRow } = await supabase.from('fish').select('health').eq('id', fishId).single()
    const health = Math.min(100, ((fishRow as { health: number } | null)?.health ?? 0) + MEDICINE_HEALTH_RESTORE)
    await supabase.from('fish').update({ health }).eq('id', fishId)
    await supabase.from('inventory').update({ quantity: (row as { quantity: number }).quantity - 1, updated_at: new Date().toISOString() }).eq('id', (row as { id: string }).id)
    setMedicineQty((q) => Math.max(0, q - 1))
    setFeedingId(null)
    onFeed()
  }

  return (
    <>
      <h2>My Fish</h2>
      <p>Food: {foodQty} · Medicine: {medicineQty}</p>
      <div className="fish-grid">
        {fish.map((f) => {
          const species = f.fish_species
          const maxPrice = species ? Math.floor(species.base_price * MAX_SELL_MULTIPLIER) : 0
          return (
            <div key={f.id} className="fish-card">
              <h3>{species?.name ?? 'Fish'}</h3>
              <p>Health: {f.health} · Hunger: {f.hunger}</p>
              <div className="sell-row">
                <input
                  type="number"
                  min={0}
                  max={maxPrice}
                  value={sellPrice[f.id] ?? species?.base_price ?? 0}
                  onChange={(e) => setSellPrice((prev) => ({ ...prev, [f.id]: Number(e.target.value) }))}
                />
                <button type="button" disabled={sellingId !== null} onClick={() => sellFish(f)}>
                  {sellingId === f.id ? '…' : 'Sell'}
                </button>
              </div>
              <button type="button" disabled={foodQty < 1 || feedingId !== null} onClick={() => feedFish(f.id)}>
                Feed
              </button>
              <button type="button" disabled={medicineQty < 1 || feedingId !== null} onClick={() => useMedicine(f.id)}>
                Medicine
              </button>
            </div>
          )
        })}
      </div>
      {fish.length === 0 && <p>No fish. Buy some from the Shop.</p>}
    </>
  )
}
