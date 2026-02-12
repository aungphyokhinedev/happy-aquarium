import { useState, useEffect, useCallback } from 'react'
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

const NAV_ITEMS: { key: Panel & string; icon: string; title: string; subtitle: string }[] = [
  { key: 'shop',        icon: '\u{1F6D2}', title: 'Shop',        subtitle: 'Buy fish & items' },
  { key: 'fish',        icon: '\u{1F41F}', title: 'My Fish',     subtitle: 'Manage your tank' },
  { key: 'decorations', icon: '\u{1FAB8}', title: 'Decorations', subtitle: 'Place & arrange' },
  { key: 'upgrade',     icon: '\u{2B06}\u{FE0F}',  title: 'Upgrade',     subtitle: 'Expand tank size' },
  { key: 'friends',     icon: '\u{1F465}', title: 'Friends',     subtitle: 'Social & requests' },
]

export function GameLayout({ profile, userId }: GameLayoutProps) {
  const { aquarium, fish, decorations, loading, refresh } = useAquarium(userId)
  const [panel, setPanel] = useState<Panel>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [credits, setCredits] = useState(profile?.daily_credits_balance ?? 0)

  useEffect(() => {
    if (profile) setCredits(profile.daily_credits_balance)
  }, [profile])

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('daily_credits_balance').eq('id', userId).single()
    if (data) setCredits(data.daily_credits_balance)
  }, [userId])

  function openPanel(p: Panel) {
    setPanel(p)
    setSidebarOpen(false)
  }

  function closePanel() {
    setPanel(null)
    refresh()
    refreshProfile()
  }

  function toggleSidebar() {
    setSidebarOpen((v) => !v)
  }

  if (loading || !aquarium) {
    return (
      <div className="game-layout">
        <header className="game-header">
          <div className="header-left">
            <button type="button" className="hamburger" aria-label="Menu" disabled>
              <span /><span /><span />
            </button>
            <div className="title-block">
              <h1>Happy Aquarium</h1>
              <p className="subtitle">Build your dream tank</p>
            </div>
          </div>
          <div className="header-right">
            <span className="credits-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 1-3 2.5s1.3 2.5 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5a3 3 0 0 1-3-1.5"/></svg>
              {credits}
            </span>
          </div>
        </header>
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading aquarium…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="game-layout">
      {/* ── Sidebar overlay backdrop ── */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Side navigation drawer ── */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Sidebar header – profile */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-username">{profile.display_name || 'Player'}</span>
            <span className="sidebar-credits">{credits} credits</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Daily credit claim */}
        <div className="sidebar-credit-section">
          <DailyCreditBanner userId={userId} credits={credits} onClaim={refreshProfile} />
        </div>

        {/* Navigation items */}
        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                className={`sidebar-nav-item ${panel === item.key ? 'active' : ''}`}
                onClick={() => openPanel(panel === item.key ? null : item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <div className="nav-text">
                  <span className="nav-title">{item.title}</span>
                  <span className="nav-subtitle">{item.subtitle}</span>
                </div>
                <span className="nav-arrow">›</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sign-out-btn"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
          <span className="version-tag">v1.0 MVP</span>
        </div>
      </nav>

      {/* ── Main content ── */}
      <header className="game-header">
        <div className="header-left">
          <button
            type="button"
            className={`hamburger ${sidebarOpen ? 'active' : ''}`}
            onClick={toggleSidebar}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
          <div className="title-block">
            <h1>Happy Aquarium</h1>
            <p className="subtitle">Build your dream tank</p>
          </div>
        </div>
        <div className="header-right">
          <span className="credits-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a3 3 0 0 0-3-1.5c-1.7 0-3 1-3 2.5s1.3 2.5 3 2.5 3 1 3 2.5-1.3 2.5-3 2.5a3 3 0 0 1-3-1.5"/></svg>
            {credits}
          </span>
          <button
            type="button"
            className="profile-btn"
            title={profile.display_name || 'Player'}
            onClick={toggleSidebar}
          >
            {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
          </button>
        </div>
      </header>

      {/* ── Canvas ── */}
      <div className="canvas-wrap">
        <AquariumScene
          tankSize={aquarium.tank_size}
          fish={fish}
          decorations={decorations}
          onDecorationMove={refresh}
        />
      </div>

      {/* ── Panels (slide-up overlays) ── */}
      {panel === 'shop' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Shop</h2>
              <p className="panel-subtitle">Buy fish, food, and decorations</p>
            </div>
            <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          </div>
          <div className="panel-body">
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
        </div>
      )}
      {panel === 'fish' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>My Fish</h2>
              <p className="panel-subtitle">Feed, sell, or manage your fish</p>
            </div>
            <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          </div>
          <div className="panel-body">
            <FishList
              fish={fish}
              credits={credits}
              onSell={refresh}
              onFeed={refresh}
              onCreditsChange={refreshProfile}
            />
          </div>
        </div>
      )}
      {panel === 'decorations' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Decorations</h2>
              <p className="panel-subtitle">Place and move decorations in your tank</p>
            </div>
            <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          </div>
          <div className="panel-body">
            <DecorationList
              aquariumId={aquarium.id}
              decorations={decorations}
              credits={credits}
              onUpdate={refresh}
              onCreditsChange={refreshProfile}
              onClose={closePanel}
            />
          </div>
        </div>
      )}
      {panel === 'upgrade' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Upgrade Tank</h2>
              <p className="panel-subtitle">Expand your aquarium size</p>
            </div>
            <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          </div>
          <div className="panel-body">
            <UpgradePanel
              aquariumId={aquarium.id}
              currentSize={aquarium.tank_size}
              credits={credits}
              onUpgrade={refresh}
              onCreditsChange={refreshProfile}
              onClose={closePanel}
            />
          </div>
        </div>
      )}
      {panel === 'friends' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Friends</h2>
              <p className="panel-subtitle">Add and manage friends</p>
            </div>
            <button type="button" className="close-btn" onClick={closePanel} aria-label="Close">×</button>
          </div>
          <div className="panel-body">
            <FriendsPanel userId={userId} onClose={closePanel} />
          </div>
        </div>
      )}
    </div>
  )
}
