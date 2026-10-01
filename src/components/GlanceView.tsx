import { HomeCamera } from './HomeCamera'
import { AlarmToggle } from './AlarmToggle'
import { RainhamBoard } from './RainhamBoard'
import { RoborockCard } from './RoborockCard'
import { TemperatureCard } from './TemperatureCard'
import type { RailDeparture } from '../hooks/useRailBoard'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface GlanceViewProps {
  camera: EntityState | undefined
  alarm: EntityState | undefined
  callService: CallService
  outsideTemperature: string | null
  insideTemperature: string | null
  overnightLow: string | null
  roborockEntities: EntityState[]
  departures: RailDeparture[]
  railStatus: 'connecting' | 'connected' | 'error'
  railError: string | null
  railNotice: string | null
}

export const GlanceView = ({
  camera,
  alarm,
  callService,
  outsideTemperature,
  insideTemperature,
  overnightLow,
  roborockEntities,
  departures,
  railStatus,
  railError,
  railNotice,
}: GlanceViewProps) => (
  <section className="grid min-h-0 flex-1 grid-cols-[1.45fr_1fr] gap-4 max-md:grid-cols-1" aria-label="Home">
    <HomeCamera camera={camera} />
    <div className="flex min-h-0 flex-col gap-4 overflow-auto">
      <div className="grid shrink-0 grid-cols-2 gap-4 max-md:grid-cols-1">
        <AlarmToggle alarm={alarm} callService={callService} />
        <TemperatureCard outside={outsideTemperature} inside={insideTemperature} overnight={overnightLow} />
      </div>
      <div className="shrink-0">
        <RoborockCard entities={roborockEntities} callService={callService} />
      </div>
      <div className="min-h-48 flex-1">
        <RainhamBoard departures={departures} status={railStatus} error={railError} notice={railNotice} />
      </div>
    </div>
  </section>
)
