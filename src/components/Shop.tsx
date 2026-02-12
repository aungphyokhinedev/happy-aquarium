import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { FishSpecies, TankSize } from '@/lib/supabase'
import { FISH_LIMIT, FOOD_CREDIT_COST, MEDICINE_CREDIT_COST } from '@/game/constants'

interface ShopProps {
  aquariumId: string
  tankSize: TankSize
  fishCount: number
  decorationCount: number
  credits: number
  onPurchase: () => void
  onClose: () => void
}

const TANK_ORDER: TankSize[] = ['small', 'medium', 'large']

function canBuyFish(species: FishSpecies, tankSize: TankSize, fishCount: number): boolean {
  if (fishCount >= FISH_LIMIT) return false
  return TANK_ORDER.indexOf(tankSize) >= TANK_ORDER.indexOf(species.min_tank_size)
}

export function Shop({ aquariumId, tankSize, fishCount, decorationCount, credits, onPurchase }: ShopProps) {
  const [species, setSpecies] = useState<FishSpecies[]>([])
  const [decorationTypes, setDecorationTypes] = useState<{ id: string; name: string; asset_ref: string; credit_cost: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('fish_species').select('*'),
      supabase.from('decoration_types').select('id, name, asset_ref, credit_cost'),
    ]).then(([sRes, dRes]) => {
      setSpecies((sRes.data ?? []) as FishSpecies[])
      setDecorationTypes((dRes.data ?? []) as { id: string; name: string; asset_ref: string; credit_cost: number }[])
      setLoading(false)
    })
  }, [])

  async function buyFishAndDeduct(s: FishSpecies) {
    if (credits < s.base_price || !canBuyFish(s, tankSize, fishCount)) return
    setBuying(s.id)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBuying(null); return }
    const { data: prof } = await supabase.from('profiles').select('daily_credits_balance').eq('id', user.id).single()
    const balance = (prof as { daily_credits_balance: number } | null)?.daily_credits_balance ?? 0
    if (balance < s.base_price) { setBuying(null); return }
    const { error: insertErr } = await supabase.from('fish').insert({
      aquarium_id: aquariumId,
      fish_species_id: s.id,
      health: 100,
      hunger: 100,
    })
    if (insertErr) { setBuying(null); return }
    await supabase.from('profiles').update({
      daily_credits_balance: balance - s.base_price,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setBuying(null)
    onPurchase()
  }

  async function buyFood() {
    if (credits < FOOD_CREDIT_COST) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inv } = await supabase.from('inventory').select('id, quantity').eq('user_id', user.id).eq('item_type', 'food').maybeSingle()
    if (inv) {
      await supabase.from('inventory').update({ quantity: (inv as { quantity: number }).quantity + 1, updated_at: new Date().toISOString() }).eq('id', (inv as { id: string }).id)
    } else {
      await supabase.from('inventory').insert({ user_id: user.id, item_type: 'food', quantity: 1 })
    }
    const { data: p } = await supabase.from('profiles').select('daily_credits_balance').eq('id', user.id).single()
    await supabase.from('profiles').update({
      daily_credits_balance: ((p as { daily_credits_balance: number })?.daily_credits_balance ?? 0) - FOOD_CREDIT_COST,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    onPurchase()
  }

  async function buyMedicine() {
    if (credits < MEDICINE_CREDIT_COST) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inv } = await supabase.from('inventory').select('id, quantity').eq('user_id', user.id).eq('item_type', 'medicine').maybeSingle()
    if (inv) {
      await supabase.from('inventory').update({ quantity: (inv as { quantity: number }).quantity + 1, updated_at: new Date().toISOString() }).eq('id', (inv as { id: string }).id)
    } else {
      await supabase.from('inventory').insert({ user_id: user.id, item_type: 'medicine', quantity: 1 })
    }
    const { data: p } = await supabase.from('profiles').select('daily_credits_balance').eq('id', user.id).single()
    await supabase.from('profiles').update({
      daily_credits_balance: ((p as { daily_credits_balance: number })?.daily_credits_balance ?? 0) - MEDICINE_CREDIT_COST,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    onPurchase()
  }

  if (loading) return <p>Loading shop…</p>

  return (
    <>
      <h2>Shop</h2>
      <p className="limit-hint">Fish: {fishCount} / {FISH_LIMIT}</p>
      <div className="shop-grid">
        {species.map((s) => (
          <div key={s.id} className="shop-card">
            <h3>{s.name}</h3>
            <p>{s.rarity} · {s.base_price} credits</p>
            <p>Tank: {s.min_tank_size}+</p>
            <button
              type="button"
              disabled={credits < s.base_price || fishCount >= FISH_LIMIT || !canBuyFish(s, tankSize, fishCount) || buying !== null}
              onClick={() => buyFishAndDeduct(s)}
            >
              {buying === s.id ? '…' : 'Buy'}
            </button>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: '1rem' }}>Supplies</h3>
      <div className="shop-grid">
        <div className="shop-card">
          <h3>Fish Food</h3>
          <p>{FOOD_CREDIT_COST} credits</p>
          <button type="button" disabled={credits < FOOD_CREDIT_COST} onClick={buyFood}>Buy</button>
        </div>
        <div className="shop-card">
          <h3>Medicine</h3>
          <p>{MEDICINE_CREDIT_COST} credits</p>
          <button type="button" disabled={credits < MEDICINE_CREDIT_COST} onClick={buyMedicine}>Buy</button>
        </div>
      </div>
      <h3 style={{ marginTop: '1rem' }}>Decorations</h3>
      <p className="limit-hint">Buy here; place from Decorations panel.</p>
      <div className="shop-grid">
        {decorationTypes.map((d) => (
          <div key={d.id} className="shop-card">
            <h3>{d.name}</h3>
            <p>{d.credit_cost} credits</p>
            <DecorationBuyButton
              decorationTypeId={d.id}
              creditCost={d.credit_cost}
              aquariumId={aquariumId}
              decorationCount={decorationCount}
              credits={credits}
              onPurchase={onPurchase}
            />
          </div>
        ))}
      </div>
    </>
  )
}

function DecorationBuyButton({
  decorationTypeId,
  creditCost,
  aquariumId,
  decorationCount,
  credits,
  onPurchase,
}: {
  decorationTypeId: string
  creditCost: number
  aquariumId: string
  decorationCount: number
  credits: number
  onPurchase: () => void
}) {
  const [loading, setLoading] = useState(false)
  async function buy() {
    if (credits < creditCost || decorationCount >= 10) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('profiles').select('daily_credits_balance').eq('id', user.id).single()
    const balance = (p as { daily_credits_balance: number } | null)?.daily_credits_balance ?? 0
    if (balance < creditCost) { setLoading(false); return }
    await supabase.from('decorations').insert({
      aquarium_id: aquariumId,
      decoration_type_id: decorationTypeId,
      position_x: 0,
      position_y: 0,
      position_z: 0,
      rotation_y: 0,
    })
    await supabase.from('profiles').update({
      daily_credits_balance: balance - creditCost,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    setLoading(false)
    onPurchase()
  }
  return <button type="button" disabled={credits < creditCost || loading || decorationCount >= 10} onClick={buy}>{loading ? '…' : 'Buy & place'}</button>
}
