export class CivicApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly hint?: string
  ) {
    super(message)
    this.name = 'CivicApiError'
  }
}

// Normalized representative record used throughout the UI.
export interface Representative {
  id: string
  name: string
  officeName: string
  party?: string
  phone?: string
  email?: string
  website?: string
  photoUrl?: string
  socials: Array<{ type: string; id: string; url: string }>
}

// Five display categories, in the display order the product spec requires.
export type RepCategory =
  | 'alderman'
  | 'stateSenate'
  | 'stateHouse'
  | 'usSenate'
  | 'usHouse'

export interface RepGroup {
  category: RepCategory
  title: string
  subtitle?: string
  reps: Representative[]
}

export interface LookupResult {
  normalizedAddress: string
  groups: RepGroup[]
}
