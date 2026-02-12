import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface FriendsPanelProps {
  userId: string
  onClose: () => void
}

interface RequestRow {
  id: string
  from_user_id: string
  to_user_id: string
  status: string
  created_at: string
}

export function FriendsPanel({ userId }: FriendsPanelProps) {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [friends, setFriends] = useState<{ id: string; friend_id: string }[]>([])
  const [emailToAdd, setEmailToAdd] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [userId])

  async function load() {
    const [sentRes, receivedRes, friendsRes] = await Promise.all([
      supabase.from('friend_requests').select('*').eq('from_user_id', userId),
      supabase.from('friend_requests').select('*').eq('to_user_id', userId),
      supabase.from('friends').select('*').eq('user_id', userId),
    ])
    const sent = (sentRes.data ?? []) as RequestRow[]
    const received = (receivedRes.data ?? []) as RequestRow[]
    const friendList = (friendsRes.data ?? []) as { id: string; friend_id: string }[]
    setRequests([...sent, ...received])
    setFriends(friendList)
    setLoading(false)
  }

  async function sendRequest() {
    if (!emailToAdd.trim()) return
    const { data: target } = await supabase.from('profiles').select('id').ilike('display_name', emailToAdd.trim()).limit(1).maybeSingle()
    if (!target) return
    const targetId = (target as { id: string }).id
    if (targetId === userId) return
    await supabase.from('friend_requests').insert({ from_user_id: userId, to_user_id: targetId, status: 'pending' }).then(() => load())
    setEmailToAdd('')
  }

  async function acceptRequest(requestId: string, fromUserId: string) {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId)
    await supabase.from('friends').insert([{ user_id: userId!, friend_id: fromUserId }, { user_id: fromUserId, friend_id: userId! }])
    load()
  }

  async function rejectRequest(requestId: string) {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    load()
  }

  if (loading) return <p>Loading…</p>

  const pendingReceived = requests.filter((r) => r.to_user_id === userId && r.status === 'pending')
  const pendingSent = requests.filter((r) => r.from_user_id === userId && r.status === 'pending')

  return (
    <div className="friends-list">
      <h2>Friends</h2>
      <div className="section">
        <h3>Add by display name</h3>
        <input
          placeholder="Display name"
          value={emailToAdd}
          onChange={(e) => setEmailToAdd(e.target.value)}
        />
        <button type="button" onClick={sendRequest}>Send request</button>
      </div>
      <div className="section">
        <h3>Pending received</h3>
        <ul>
          {pendingReceived.map((r) => (
            <li key={r.id}>
              {r.from_user_id}
              <button type="button" onClick={() => acceptRequest(r.id, r.from_user_id)}>Accept</button>
              <button type="button" onClick={() => rejectRequest(r.id)}>Reject</button>
            </li>
          ))}
        </ul>
      </div>
      <div className="section">
        <h3>Pending sent</h3>
        <ul>
          {pendingSent.map((r) => (
            <li key={r.id}>
              {r.to_user_id}
              <span> (pending)</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="section">
        <h3>Friends</h3>
        <ul>
          {friends.map((f) => (
            <li key={f.id}>{f.friend_id}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
