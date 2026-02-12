import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DailyCreditBannerProps {
  userId: string
  credits: number
  onClaim: () => void
}

export function DailyCreditBanner({ credits, onClaim }: DailyCreditBannerProps) {
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)

  async function claimDaily() {
    setClaiming(true)
    try {
      const { error } = await supabase.functions.invoke('daily-credit', { body: {} })
      if (error) throw error
      setClaimed(true)
      onClaim()
    } catch {
      setClaimed(false)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="daily-credit-banner">
      <span>Daily credits: {credits}</span>
      <button type="button" disabled={claiming} onClick={claimDaily}>
        {claiming ? '…' : 'Claim daily'}
      </button>
      {claimed && <span>Claimed!</span>}
    </div>
  )
}
