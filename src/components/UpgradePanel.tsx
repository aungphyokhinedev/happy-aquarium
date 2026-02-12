import { supabase } from '@/lib/supabase'
import type { TankSize } from '@/lib/supabase'
import { TANK_UPGRADE_COST } from '@/game/constants'

const ORDER: TankSize[] = ['small', 'medium', 'large']

interface UpgradePanelProps {
  aquariumId: string
  currentSize: TankSize
  credits: number
  onUpgrade: () => void
  onCreditsChange: () => void
  onClose: () => void
}

export function UpgradePanel({
  aquariumId,
  currentSize,
  credits,
  onUpgrade,
  onCreditsChange,
}: UpgradePanelProps) {
  const idx = ORDER.indexOf(currentSize)
  const nextSize = idx < ORDER.length - 1 ? ORDER[idx + 1] : null
  const cost = nextSize ? TANK_UPGRADE_COST[nextSize] ?? 0 : 0
  const canAfford = credits >= cost

  async function upgrade() {
    if (!nextSize || !canAfford) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('daily_credits_balance').eq('id', user.id).single()
    const balance = (p as { daily_credits_balance: number } | null)?.daily_credits_balance ?? 0
    if (balance < cost) return
    await supabase.from('aquariums').update({
      tank_size: nextSize,
      updated_at: new Date().toISOString(),
    }).eq('id', aquariumId)
    await supabase.from('profiles').update({
      daily_credits_balance: balance - cost,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)
    onUpgrade()
    onCreditsChange()
  }

  return (
    <div className="upgrade-panel">
      <h2>Upgrade Tank</h2>
      <p>Current: {currentSize}</p>
      {nextSize ? (
        <>
          <p>Next: {nextSize} — {cost} credits</p>
          <button type="button" disabled={!canAfford} onClick={upgrade}>
            Upgrade to {nextSize}
          </button>
        </>
      ) : (
        <p>Your tank is already at maximum size.</p>
      )}
    </div>
  )
}
