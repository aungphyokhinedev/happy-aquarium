/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const DAILY_CREDIT_AMOUNT = 50

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    const { data: profile } = await supabase.from('profiles').select('last_daily_credit_at, daily_credits_balance').eq('id', user.id).single()
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } })
    }

    const now = new Date()
    const last = (profile as { last_daily_credit_at: string | null }).last_daily_credit_at
    const lastDate = last ? new Date(last) : null
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    if (lastDate && lastDate >= startOfToday) {
      return new Response(JSON.stringify({ claimed: false, message: 'Already claimed today', balance: (profile as { daily_credits_balance: number }).daily_credits_balance }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const newBalance = (profile as { daily_credits_balance: number }).daily_credits_balance + DAILY_CREDIT_AMOUNT
    const { error } = await supabase.from('profiles').update({
      daily_credits_balance: newBalance,
      last_daily_credit_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq('id', user.id)

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ claimed: true, balance: newBalance }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
