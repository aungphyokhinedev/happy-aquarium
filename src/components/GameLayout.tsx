import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/supabase'
import { useAquarium } from '@/hooks/useAquarium'
import { AquariumScene } from '@/scenes/AquariumScene'
import { Shop } from '@/components/Shop'
import { FishList } from '@/components/FishList'
import { DecorationList } from '@/components/DecorationList'
import { FriendsPanel } from '@/components/FriendsPanel'
import { UpgradePanel } from '@/components/UpgradePanel'
import { DailyCreditBanner } from '@/components/DailyCreditBanner'

type Panel = 'shop' | 'fish' | 'decorations' | 'friends' | 'upgrade' | null

interface GameLayoutProps {
  profile: Profile
  userId: string
}

export function GameLayout({ profile, userId }: GameLayoutProps) {
  const { aquarium, fish, decorations, loading, refresh } = useAquarium(userId)
  const [panel, setPanel] = useState<Panel>(null)
  const [credits, setCredits] = useState(profile?.daily_credits_balance ?? 0)

  useEffect(() => {
    if (profile) setCredits(profile.daily_credits_balance)
  }, [profile])

  async function refreshProfile() {
    const { data } = await supabase.from('profiles').select('daily_credits_balance').eq('id', userId).single()
    if (data) setCredits(data.daily_credits_balance)
  }

  function openPanel(p: Panel) {
    setPanel(p)
  }

  function closePanel() {
    setPanel(null)
    refresh()
    refreshProfile()
  }

  if (loading || !aquarium) {
    return (
      <div className="game-layout">
        <div className="ui-bar">
          <span className="credits">Credits: {credits}</span>
        </div>
        <p style={{ padding: '2rem', textAlign: 'center' }}>Loading aquarium…</p>
      </div>
    )
  }

  return (
    <div className="game-layout">
      <DailyCreditBanner userId={userId} credits={credits} onClaim={refreshProfile} />
      <div className="ui-bar">
        <span className="credits">Credits: {credits}</span>
        <div className="nav-buttons">
          <button className={panel === 'shop' ? 'active' : ''} onClick={() => openPanel(panel === 'shop' ? null : 'shop')}>
            Shop
          </button>
          <button className={panel === 'fish' ? 'active' : ''} onClick={() => openPanel(panel === 'fish' ? null : 'fish')}>
            My Fish
          </button>
          <button className={panel === 'decorations' ? 'active' : ''} onClick={() => openPanel(panel === 'decorations' ? null : 'decorations')}>
            Decorations
          </button>
          <button className={panel === 'upgrade' ? 'active' : ''} onClick={() => openPanel(panel === 'upgrade' ? null : 'upgrade')}>
            Upgrade Tank
          </button>
          <button className={panel === 'friends' ? 'active' : ''} onClick={() => openPanel(panel === 'friends' ? null : 'friends')}>
            Friends
          </button>
        </div>
        <div className="user-row">
          <span>{profile.display_name || 'Player'}</span>
          <button type="button" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
      <div className="canvas-wrap">
        <AquariumScene
          tankSize={aquarium.tank_size}
          fish={fish}
          decorations={decorations}
          onDecorationMove={refresh}
        />
      </div>
      {panel === 'shop' && (
        <div className="panel">
          <div className="close-row"><button type="button" onClick={closePanel}>Close</button></div>
          <Shop
            aquariumId={aquarium.id}
            tankSize={aquarium.tank_size}
            fishCount={fish.length}
            decorationCount={decorations.length}
            credits={credits}
            onPurchase={refreshProfile}
            onClose={closePanel}
          />
        </div>
      )}
      {panel === 'fish' && (
        <div className="panel">
          <div className="close-row"><button type="button" onClick={closePanel}>Close</button></div>
          <FishList
            fish={fish}
            credits={credits}
            onSell={refresh}
            onFeed={refresh}
            onCreditsChange={refreshProfile}
          />
        </div>
      )}
      {panel === 'decorations' && (
        <div className="panel">
          <div className="close-row"><button type="button" onClick={closePanel}>Close</button></div>
          <DecorationList
            aquariumId={aquarium.id}
            decorations={decorations}
            credits={credits}
            onUpdate={refresh}
            onCreditsChange={refreshProfile}
            onClose={closePanel}
          />
        </div>
      )}
      {panel === 'upgrade' && (
        <div className="panel">
          <div className="close-row"><button type="button" onClick={closePanel}>Close</button></div>
          <UpgradePanel
            aquariumId={aquarium.id}
            currentSize={aquarium.tank_size}
            credits={credits}
            onUpgrade={refresh}
            onCreditsChange={refreshProfile}
            onClose={closePanel}
          />
        </div>
      )}
      {panel === 'friends' && (
        <div className="panel">
          <div className="close-row"><button type="button" onClick={closePanel}>Close</button></div>
          <FriendsPanel userId={userId} onClose={closePanel} />
        </div>
      )}
    </div>
  )
}
