import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function AuthForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage({ type: 'ok', text: 'Check your email to confirm sign up.' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  async function handleOAuth(provider: 'google' | 'github') {
    setLoading(true)
    await supabase.auth.signInWithOAuth({ provider })
    setLoading(false)
  }

  return (
    <div className="auth-form">
      <div style={{ textAlign: 'center', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{'\u{1F420}'}</div>
      <h1>Happy Aquarium</h1>
      <p className="subtitle">Dive in to start building your tank</p>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? '…' : isSignUp ? 'Sign up' : 'Sign in'}
        </button>
      </form>
      <button type="button" onClick={() => setIsSignUp((v) => !v)} className="toggle">
        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
      </button>
      <div className="oauth">
        <button type="button" onClick={() => handleOAuth('google')} disabled={loading}>
          Sign in with Google
        </button>
        <button type="button" onClick={() => handleOAuth('github')} disabled={loading}>
          Sign in with GitHub
        </button>
      </div>
      {message && (
        <p className={message.type === 'error' ? 'error' : 'ok'}>{message.text}</p>
      )}
    </div>
  )
}
