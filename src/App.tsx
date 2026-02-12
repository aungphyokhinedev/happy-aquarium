import { useAuth } from '@/hooks/useAuth'
import { AuthForm } from '@/components/AuthForm'
import { GameLayout } from '@/components/GameLayout'
import './App.css'

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app-auth">
        <AuthForm />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="app-loading">
        <p>Setting up your aquarium…</p>
      </div>
    )
  }

  return (
    <div className="app">
      <GameLayout profile={profile} userId={user.id} />
    </div>
  )
}
