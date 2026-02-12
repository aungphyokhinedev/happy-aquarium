import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Aquarium, Fish, FishSpecies, Decoration, DecorationType } from '@/lib/supabase'

export function useAquarium(ownerId: string | undefined) {
  const [aquarium, setAquarium] = useState<Aquarium | null>(null)
  const [fish, setFish] = useState<(Fish & { fish_species?: FishSpecies })[]>([])
  const [decorations, setDecorations] = useState<(Decoration & { decoration_types?: DecorationType })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ownerId) {
      setAquarium(null)
      setFish([])
      setDecorations([])
      setLoading(false)
      return
    }

    let mounted = true

    async function load() {
      const { data: aq } = await supabase
        .from('aquariums')
        .select('*')
        .eq('owner_id', ownerId)
        .single()
      if (!mounted) return
      setAquarium(aq as Aquarium | null)
      if (!aq?.id) {
        setFish([])
        setDecorations([])
        setLoading(false)
        return
      }

      const [fishRes, decRes] = await Promise.all([
        supabase.from('fish').select('*, fish_species(*)').eq('aquarium_id', aq.id),
        supabase.from('decorations').select('*, decoration_types(*)').eq('aquarium_id', aq.id),
      ])
      if (!mounted) return
      setFish((fishRes.data ?? []) as (Fish & { fish_species?: FishSpecies })[])
      setDecorations((decRes.data ?? []) as (Decoration & { decoration_types?: DecorationType })[])
      setLoading(false)
    }

    load()
    return () => { mounted = false }
  }, [ownerId])

  async function refresh() {
    if (!ownerId || !aquarium?.id) return
    const [fishRes, decRes] = await Promise.all([
      supabase.from('fish').select('*, fish_species(*)').eq('aquarium_id', aquarium.id),
      supabase.from('decorations').select('*, decoration_types(*)').eq('aquarium_id', aquarium.id),
    ])
    setFish((fishRes.data ?? []) as (Fish & { fish_species?: FishSpecies })[])
    setDecorations((decRes.data ?? []) as (Decoration & { decoration_types?: DecorationType })[])
  }

  return { aquarium, fish, decorations, loading, refresh }
}
