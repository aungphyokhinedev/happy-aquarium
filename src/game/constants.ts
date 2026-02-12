export const FISH_LIMIT = 10
export const DECORATION_LIMIT = 10

export const TANK_UPGRADE_COST: Record<string, number> = {
  small: 0,
  medium: 150,
  large: 400,
}

export const DAILY_CREDIT_AMOUNT = 50
export const MAX_SELL_MULTIPLIER = 1.5 // max sell = base_price * this

export const ITEM_TYPES = {
  FOOD: 'food',
  MEDICINE: 'medicine',
} as const

export const FOOD_CREDIT_COST = 5
export const MEDICINE_CREDIT_COST = 15
export const FOOD_HUNGER_RESTORE = 40
export const MEDICINE_HEALTH_RESTORE = 30
