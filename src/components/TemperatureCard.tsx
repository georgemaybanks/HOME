interface TemperatureCardProps {
  outside: string | null
  inside: string | null
  overnight: string | null
}

export const TemperatureCard = ({ outside, inside, overnight }: TemperatureCardProps) => (
  <article className="flex min-w-0 flex-col justify-center gap-2 rounded-md border border-line bg-white px-4 py-4">
    <Reading label="Outside" value={outside} />
    <Reading label="Inside" value={inside} />
    <Reading label="Overnight" value={overnight} />
  </article>
)

const Reading = ({ label, value }: { label: string; value: string | null }) => (
  <div className="flex min-h-8 items-baseline justify-between gap-3">
    <span className="font-mono text-xs font-medium tracking-wide text-muted">{label.toUpperCase()}</span>
    <strong className="font-display text-2xl font-bold tracking-tight text-ink">{value ?? '—'}</strong>
  </div>
)
