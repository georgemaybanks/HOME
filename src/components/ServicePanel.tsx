import type { ReactNode } from 'react'

interface ServicePanelProps {
  icon: ReactNode
  title: string
  detail: string
}

export const ServicePanel = ({ icon, title, detail }: ServicePanelProps) => (
  <div className="flex min-h-24 items-center gap-3.5 border-l-2 border-sage/40 bg-sage-mist px-4">
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-sage-soft text-sage">{icon}</span>
    <div>
      <strong className="text-base font-semibold text-ink">{title}</strong>
      <p className="mt-1 text-base leading-snug text-muted">{detail}</p>
    </div>
  </div>
)
