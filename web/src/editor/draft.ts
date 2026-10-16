import { railSpots } from '../td/spots'
import { EMPTY_SHOW, type Show } from '../model/show'
import { normalize } from '../model/migrate'
import { setCustomProfiles } from '../model/fixtures'

export const withRails = (show: Show): Show => ({ ...show, rails: railSpots(show) })

export function load(raw: Partial<Show>) {
  setCustomProfiles(raw.profiles ?? [])
  return withRails(normalize(raw))
}

export const DRAFT_KEY = 'lsgleamShow'
export const OFFLINE_KEY = 'lsgleamOffline'

export function readDraft() {
  try {
    const text = localStorage.getItem(DRAFT_KEY)
    return text ? load(JSON.parse(text)) : EMPTY_SHOW
  } catch {
    return EMPTY_SHOW
  }
}

export function remember(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export const offlineEdits = () => { try { return localStorage.getItem(OFFLINE_KEY) === '1' } catch { return false } }
