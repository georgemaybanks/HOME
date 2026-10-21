import { useEffect, useState } from 'react'
import type { BinRound } from '../lib/bins'

interface BinResponse {
  bins?: Partial<BinRound>
  error?: string
  notice?: string
}

const EMPTY: BinRound = { waste: '', recycling: '', green: '' }

export const useBins = () => {
  const [round, setRound] = useState<BinRound | null>(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true

    const refresh = async () => {
      try {
        const response = await fetch('/api/bins')
        const result = await response.json() as BinResponse
        if (!active) return
        const bins = result.bins
        if (!response.ok || !bins?.waste || !bins.recycling || !bins.green) {
          throw new Error(result.error || 'Medway collection dates are unavailable.')
        }
        setRound({ ...EMPTY, ...bins })
        setNotice(result.notice ?? '')
      } catch (error) {
        if (!active) return
        setNotice(error instanceof Error ? error.message : 'Medway collection dates are unavailable.')
      }
    }

    void refresh()
    const timer = window.setInterval(() => void refresh(), 30 * 60 * 1000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [])

  return { round, notice }
}
