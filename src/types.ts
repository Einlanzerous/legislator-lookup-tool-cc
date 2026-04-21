// Shape of the Google Civic Information API response we actually care about.
// Trimmed to just the fields this app consumes.
export interface CivicApiOfficial {
  name: string
  address?: Array<{
    line1?: string
    line2?: string
    line3?: string
    city?: string
    state?: string
    zip?: string
  }>
  party?: string
  phones?: string[]
  urls?: string[]
  photoUrl?: string
  emails?: string[]
  channels?: Array<{ type: string; id: string }>
}

export interface CivicApiOffice {
  name: string
  divisionId: string
  levels?: string[]
  roles?: string[]
  officialIndices: number[]
}

export interface CivicApiResponse {
  normalizedInput?: {
    line1?: string
    city?: string
    state?: string
    zip?: string
  }
  offices?: CivicApiOffice[]
  officials?: CivicApiOfficial[]
  error?: { code: number; message: string }
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
