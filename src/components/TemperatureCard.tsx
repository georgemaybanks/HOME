interface TemperatureCardProps {
  outside: string | null
  inside: string | null
  overnight: string | null
  condition: string | null
  sunLabel: string | null
}

export const TemperatureCard = ({ outside, inside, overnight, condition, sunLabel }: TemperatureCardProps) => (
  <article className="flex h-full min-h-0 min-w-0 flex-col justify-center gap-1.5 rounded-md border border-line bg-white px-3 py-3 max-md:h-auto">
    {condition || sunLabel ? <span className="font-mono text-xs font-medium tracking-wide text-muted">{[condition, sunLabel].filter(Boolean).join(' · ').toUpperCase()}</span> : null}
    <Reading label="Outside" value={outside} />
    <Reading label="Inside" value={inside} />
    <Reading label="Overnight" value={overnight} />
  </article>
)

const Reading = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex min-h-8 items-baseline justify-between gap-3">
    <span className="font-mono text-xs font-medium tracking-wide text-muted">{label.toUpperCase()}</span>
    <strong className="font-display text-xl font-bold tracking-tight text-ink">{value ?? '—'}</strong>
  </div>
)
