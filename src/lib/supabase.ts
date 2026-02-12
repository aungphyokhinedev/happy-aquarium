import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type TankSize = 'small' | 'medium' | 'large'
export type Rarity = 'common' | 'uncommon' | 'rare'
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  daily_credits_balance: number
  last_daily_credit_at: string | null
  created_at: string
  updated_at: string
}

export interface Aquarium {
  id: string
  owner_id: string
  tank_size: TankSize
  created_at: string
  updated_at: string
}

export interface FishSpecies {
  id: string
  name: string
  rarity: Rarity
  base_price: number
  model_ref: string
  min_tank_size: TankSize
  created_at: string
}

export interface Fish {
  id: string
  aquarium_id: string
  fish_species_id: string
  name: string | null
  health: number
  hunger: number
  list_price: number | null
  listed_at: string | null
  created_at: string
  fish_species?: FishSpecies
}

export interface DecorationType {
  id: string
  name: string
  asset_ref: string
  credit_cost: number
  created_at: string
}

export interface Decoration {
  id: string
  aquarium_id: string
  decoration_type_id: string
  position_x: number
  position_y: number
  position_z: number
  rotation_y: number
  created_at: string
  decoration_types?: DecorationType
}

export interface InventoryRow {
  id: string
  user_id: string
  item_type: string
  quantity: number
  created_at: string
  updated_at: string
}

export interface FriendRequest {
  id: string
  from_user_id: string
  to_user_id: string
  status: FriendRequestStatus
  created_at: string
  from_profile?: Profile
  to_profile?: Profile
}

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  created_at: string
  profiles?: Profile
}
