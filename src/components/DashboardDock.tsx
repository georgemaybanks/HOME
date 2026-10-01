import { Camera, CloudSun, House, LayoutGrid, Lightbulb, ListChecks, Music2, Plane, Shield, Sparkles } from 'lucide-react'
import type { DashboardTab } from '../types/dashboard'
import { cn } from '../lib/cn'

interface DashboardDockProps {
  tab: DashboardTab
  onSelectTab: (tab: DashboardTab) => void
}

const dockItems: { id: DashboardTab; label: string; icon: typeof House }[] = [
  { id: 'overview', label: 'Home', icon: House },
  { id: 'cameras', label: 'Cameras', icon: Camera },
  { id: 'lights', label: 'Lights', icon: Lightbulb },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'climate', label: 'Climate', icon: CloudSun },
  { id: 'cleaning', label: 'Clean', icon: Sparkles },
  { id: 'aircraft', label: 'Aircraft', icon: Plane },
  { id: 'speakers', label: 'Audio', icon: Music2 },
  { id: 'buttons', label: 'Buttons', icon: ListChecks },
  { id: 'house', label: 'House', icon: LayoutGrid },
]

export const DashboardDock = ({ tab, onSelectTab }: DashboardDockProps) => (
  <nav className="grid grid-cols-10 border-t border-sage-line bg-sage-mist max-md:sticky max-md:bottom-0" aria-label="Main navigation">
    {dockItems.map((item) => {
      const Icon = item.icon
      const isSelected = tab === item.id
      return (
        <button
          key={item.id}
          className={cn(
            'flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold text-sage-deep/80',
            isSelected && 'bg-sage-selected text-sage-deep',
          )}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelectTab(item.id)}
        >
          <Icon size={18} />
          <span className="max-md:sr-only">{item.label}</span>
        </button>
      )
    })}
  </nav>
)
