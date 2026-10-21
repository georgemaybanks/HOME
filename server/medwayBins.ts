const MEDWAY = 'https://api.medway.gov.uk/api'
const HEADERS = {
  Accept: 'application/json',
  Origin: 'https://www.medway.gov.uk',
  Referer: 'https://www.medway.gov.uk/',
}

interface MedwayAddress {
  uprn?: string | number
}

interface MedwayDay {
  day?: string
  nextCollection?: string
}

export interface MedwayRound {
  postcode: string
  day: string
  nextCollection: string
}

const medway = async (path: string) => {
  const response = await fetch(`${MEDWAY}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(10_000) })
  if (!response.ok) throw new Error(`Medway returned ${response.status}`)
  return response.json() as Promise<unknown>
}

const uprnFor = async (postcode: string, uprn: string) => {
  if (uprn) return uprn
  const compact = postcode.replace(/\s+/g, '').toLowerCase()
  const addresses = await medway(`/addressing/getaddresses/${compact}`)
  if (!Array.isArray(addresses) || addresses.length === 0) throw new Error('Medway did not recognise that postcode.')
  const ids = addresses
    .map((address) => String((address as MedwayAddress).uprn ?? ''))
    .filter(Boolean)
    .sort()
  const id = ids[0]
  if (!id) throw new Error('Medway did not return an address for that postcode.')
  return id
}

export const loadMedwayRound = async (postcode: string, uprn = ''): Promise<MedwayRound> => {
  const id = await uprnFor(postcode, uprn.trim())
  const body = await medway(`/waste/getwasteday/${id}`) as MedwayDay
  const nextCollection = body.nextCollection?.slice(0, 10) ?? ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextCollection)) throw new Error('Medway did not include a collection date.')
  return { postcode, day: body.day ?? '', nextCollection }
}
