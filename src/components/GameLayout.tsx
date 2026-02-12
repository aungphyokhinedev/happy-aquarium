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
        <div className="game-header">
          <div className="title-block">
            <h1>Happy Aquarium</h1>
            <p className="subtitle">Build your tank</p>
          </div>
          <div className="credits-badge">{credits}</div>
        </div>
        <p style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading aquarium…</p>
      </div>
    )
  }

  return (
    <div className="game-layout">
      <DailyCreditBanner userId={userId} credits={credits} onClaim={refreshProfile} />
      <div className="game-header">
        <div className="title-block">
          <h1>Happy Aquarium</h1>
          <p className="subtitle">Build your tank</p>
        </div>
        <div className="header-icons">
          <span className="credits-badge">{credits}</span>
          <button type="button" className="profile-btn" title={profile.display_name || 'Player'}>
            {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
          </button>
          <button type="button" className="sign-out-btn" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </div>
      </div>
      <div className="menu-cards">
        {([
          { key: 'shop' as Panel, icon: '\u{1F6D2}', label: 'store', title: 'Shop' },
          { key: 'fish' as Panel, icon: '\u{1F41F}', label: 'tank', title: 'My Fish' },
          { key: 'decorations' as Panel, icon: '\u{1FAB8}', label: 'decor', title: 'Decor' },
          { key: 'upgrade' as Panel, icon: '\u{2B06}\u{FE0F}', label: 'size', title: 'Upgrade' },
          { key: 'friends' as Panel, icon: '\u{1F465}', label: 'social', title: 'Friends' },
        ]).map((item) => (
          <button
            key={item.key}
            type="button"
            className={`menu-card ${item.key} ${panel === item.key ? 'active' : ''}`}
            onClick={() => openPanel(panel === item.key ? null : item.key)}
          >
            <span className="card-icon">{item.icon}</span>
            <span className="card-label">{item.label}</span>
            <span className="card-title">{item.title}</span>
          </button>
        ))}
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
          <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          <h2>Shop</h2>
          <p className="panel-subtitle">Buy fish, food, and decorations</p>
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
          <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          <h2>My Fish</h2>
          <p className="panel-subtitle">Feed, sell, or manage your fish</p>
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
          <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          <h2>Decorations</h2>
          <p className="panel-subtitle">Place and move decorations in your tank</p>
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
          <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          <h2>Upgrade Tank</h2>
          <p className="panel-subtitle">Expand your aquarium size</p>
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
          <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          <h2>Friends</h2>
          <p className="panel-subtitle">Add and manage friends</p>
          <FriendsPanel userId={userId} onClose={closePanel} />
        </div>
      )}
    </div>
  )
}
