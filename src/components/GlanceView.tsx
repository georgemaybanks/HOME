import { AlarmToggle } from './AlarmToggle'
import { BinsCard } from './BinsCard'
import { EnergyCard } from './EnergyCard'
import { HomeLights } from './HomeLights'
import { ParcelsCard } from './ParcelsCard'
import { RainhamBoard } from './RainhamBoard'
import { RoborockCard } from './RoborockCard'
import { TemperatureCard } from './TemperatureCard'
import type { BinRound } from '../lib/bins'
import type { EnergyUsage } from '../hooks/useEnergy'
import type { ParcelSummary } from '../hooks/useParcels'
import type { RailDeparture } from '../hooks/useRailBoard'
import type { CallService } from '../types/dashboard'
import type { EntityState } from '../types/homeAssistant'

interface GlanceViewProps {
  alarm: EntityState | undefined
  callService: CallService
  outsideTemperature: string | null
  insideTemperature: string | null
  overnightLow: string | null
  weatherLabel: string | null
  sunLabel: string | null
  lights: EntityState[]
  roborockEntities: EntityState[]
  departures: RailDeparture[]
  railStatus: 'connecting' | 'connected' | 'error'
  railError: string | null
  railNotice: string | null
  parcels: ParcelSummary | null
  parcelStatus: 'connecting' | 'connected' | 'error'
  parcelError: string | null
  onOpenParcels: () => void
  energyToday: EnergyUsage
  energyNotice: string
  onOpenEnergy: () => void
  now: Date
  bins: BinRound | null
  binNotice: string
}

export const GlanceView = ({
  alarm,
  callService,
  outsideTemperature,
  insideTemperature,
  overnightLow,
  weatherLabel,
  sunLabel,
  lights,
  roborockEntities,
  departures,
  railStatus,
  railError,
  railNotice,
  parcels,
  parcelStatus,
  parcelError,
  onOpenParcels,
  energyToday,
  energyNotice,
  onOpenEnergy,
  now,
  bins,
  binNotice,
}: GlanceViewProps) => (
  <section className="grid h-full min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 overflow-hidden max-md:h-auto max-md:grid-cols-1 max-md:overflow-visible" aria-label="Home">
    <div className="flex min-h-0 flex-col gap-3">
      <ParcelsCard summary={parcels} status={parcelStatus} error={parcelError} onOpen={onOpenParcels} featured />
      <HomeLights lights={lights} callService={callService} />
      <div className="min-h-0 flex-1 max-md:flex-none">
        <RainhamBoard departures={departures} status={railStatus} error={railError} notice={railNotice} />
      </div>
    </div>
    <div className="grid h-full min-h-0 grid-cols-2 grid-rows-3 gap-3 max-md:h-auto max-md:grid-rows-none">
      <BinsCard now={now} round={bins} notice={binNotice} />
      <AlarmToggle alarm={alarm} callService={callService} />
      <RoborockCard entities={roborockEntities} callService={callService} />
      <TemperatureCard outside={outsideTemperature} inside={insideTemperature} overnight={overnightLow} condition={weatherLabel} sunLabel={sunLabel} />
      <div className="col-span-2 min-h-0">
        <EnergyCard today={energyToday} notice={energyNotice} onOpen={onOpenEnergy} />
      </div>
    </div>
  </section>
)
