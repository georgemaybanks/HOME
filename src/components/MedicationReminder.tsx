import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pill } from 'lucide-react'
import { MEDICATION_CLEARS } from '../lib/medicationReminder'
import { useMedicationReminder } from '../hooks/useMedicationReminder'

const prompts = [
  'Take your medication.',
  'That was only the first clear.',
  'Once more, then it stops.',
]

const buttonLabels = ['I have taken it', 'Clear it again', 'Clear it for today']

const buttonSpots = [
  'right-8 bottom-8',
  'left-8 bottom-8',
  'right-8 top-1/2 -translate-y-1/2',
]

const GAP_MS = 1400

const nag = (context: AudioContext) => {
  const start = context.currentTime
  ;[740, 880, 740].forEach((frequency, index) => {
    const osc = context.createOscillator()
    const gain = context.createGain()
    const at = start + index * 0.18
    osc.type = 'square'
    osc.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(0.045, at + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.15)
    osc.connect(gain)
    gain.connect(context.destination)
    osc.start(at)
    osc.stop(at + 0.16)
  })
}

export const MedicationReminder = () => {
  const { showing, clears, acknowledge } = useMedicationReminder()
  const [holding, setHolding] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const holdTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!showing) return
    const context = new AudioContext()
    const play = () => {
      void context.resume().then(() => {
        nag(context)
        navigator.vibrate?.([220, 90, 220, 90, 220])
      }).catch(() => {})
    }
    play()
    const interval = window.setInterval(play, 3500)
    return () => {
      window.clearInterval(interval)
      void context.close()
    }
  }, [showing])

  useEffect(() => {
    if (showing && !holding) buttonRef.current?.focus()
  }, [showing, holding, clears])

  useEffect(() => () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
  }, [])

  if (!showing) return null

  const clear = () => {
    if (holding) return
    acknowledge()
    if (clears + 1 >= MEDICATION_CLEARS) return
    setHolding(true)
    holdTimer.current = window.setTimeout(() => setHolding(false), GAP_MS)
  }

  return createPortal(
    <div
      className="medication-screen fixed inset-0 z-[80] text-paper"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="medication-title"
      aria-describedby="medication-copy"
    >
      <div className="flex h-full flex-col justify-between px-8 py-10">
        <div className="max-w-3xl">
          <Pill size={42} aria-hidden="true" />
          <p className="mt-6 font-display text-5xl font-extrabold tracking-tight max-md:text-4xl" id="medication-title">
            George, medication.
          </p>
          <p className="mt-4 max-w-xl text-2xl font-medium" id="medication-copy">
            {holding ? 'Wait. The next button is somewhere else.' : prompts[clears]}
          </p>
          <p className="mt-6 font-mono text-lg">
            {clears} of {MEDICATION_CLEARS} cleared
          </p>
        </div>
        <button
          ref={buttonRef}
          className={`absolute min-h-20 min-w-64 bg-paper px-8 text-2xl font-bold text-ink ${buttonSpots[clears]} ${holding ? 'pointer-events-none opacity-0' : ''}`}
          type="button"
          disabled={holding}
          onClick={clear}
        >
          {buttonLabels[clears]}
        </button>
      </div>
    </div>,
    document.body,
  )
}
