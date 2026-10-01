import { lazy, Suspense, useCallback, useState } from 'react';
import { CameraBoard } from './components/CameraBoard';
import { CleaningBoard } from './components/CleaningBoard';
import { DashboardDock } from './components/DashboardDock';
import { DashboardTopBar } from './components/DashboardTopBar';
import { GlanceView } from './components/GlanceView';
import { LightBoard } from './components/LightBoard';
import { RadarScope } from './components/RadarScope';
import { SectionBoard } from './components/SectionBoard';
import { SpeakerBoard } from './components/SpeakerBoard';
import { useDashboardData } from './hooks/useDashboardData';
import type { DashboardTab } from './types/dashboard';

const VantaBackground = lazy(() => import('./components/VantaBackground.jsx').then((module) => ({ default: module.VantaBackground })));

export const App = () => {
  const dashboard = useDashboardData();
  const [tab, setTab] = useState<DashboardTab>('overview');
  const selectTab = useCallback((nextTab: DashboardTab) => setTab(nextTab), []);
  const showHome = useCallback(() => setTab('overview'), []);

  return (
    <Suspense fallback={<div className="h-dvh bg-paper" />}>
      <VantaBackground>
        <main className="relative z-10 grid h-dvh grid-rows-[auto_minmax(0,1fr)_4rem] overflow-hidden max-md:h-auto max-md:min-h-dvh max-md:overflow-visible">
          <DashboardTopBar
            now={dashboard.now}
            networkName={dashboard.networkName}
            speedLabel={dashboard.speedLabel}
            status={dashboard.status}
            connectionLabel={dashboard.connectionLabel}
            onGoHome={showHome}
          />
          <div className="flex min-h-0 flex-col gap-3 px-5 pb-3 pt-4">
            {dashboard.error ? <div className="border-l-4 border-clay bg-orange-50 px-3.5 py-3 text-base text-clay" role="status">{dashboard.error}</div> : null}
            {tab === 'overview' ? (
              <GlanceView
                camera={dashboard.noahCamera}
                alarm={dashboard.primaryAlarm}
                callService={dashboard.callService}
                outsideTemperature={dashboard.outsideTemperature}
                insideTemperature={dashboard.insideTemperature}
                overnightLow={dashboard.overnightLow}
                roborockEntities={dashboard.roborockEntities}
                departures={dashboard.departures}
                railStatus={dashboard.railStatus}
                railError={dashboard.railError}
                railNotice={dashboard.railNotice}
              />
            ) : null}
            {tab === 'cameras' ? <CameraBoard cameras={dashboard.cameraEntities} controls={dashboard.cameraControls} callService={dashboard.callService} /> : null}
            {tab === 'lights' ? <LightBoard lights={dashboard.lightEntities} callService={dashboard.callService} /> : null}
            {tab === 'security' ? (
              <SectionBoard
                label="Security"
                callService={dashboard.callService}
                sections={[
                  { title: 'Alarm', entities: dashboard.securityActions, kind: 'action' },
                  { title: 'Motion, sound, and batteries', entities: dashboard.securityReadings, kind: 'readout' },
                ]}
              />
            ) : null}
            {tab === 'climate' ? (
              <SectionBoard label="Climate" callService={dashboard.callService} sections={[{ title: 'Temperature, humidity, and sun', entities: dashboard.climateEntities, kind: 'readout' }]} />
            ) : null}
            {tab === 'cleaning' ? <CleaningBoard entities={dashboard.roborockEntities} callService={dashboard.callService} /> : null}
            {tab === 'aircraft' ? (
              <section className="flex min-h-0 flex-1" aria-label="Aircraft">
                <RadarScope aircraft={dashboard.aircraft} status={dashboard.aircraftStatus} error={dashboard.aircraftError} />
              </section>
            ) : null}
            {tab === 'speakers' ? <SpeakerBoard players={dashboard.playerEntities} remotes={dashboard.remoteEntities} callService={dashboard.callService} /> : null}
            {tab === 'buttons' ? (
              <SectionBoard label="Buttons" callService={dashboard.callService} sections={[{ title: 'Routines and device buttons', entities: dashboard.buttonEntities, kind: 'action' }]} />
            ) : null}
            {tab === 'house' ? (
              <SectionBoard
                label="House"
                callService={dashboard.callService}
                sections={[
                  { title: 'Switches, choices, and charger', entities: dashboard.controlEntities, kind: 'action' },
                  { title: 'Sensors', entities: dashboard.houseSensors, kind: 'readout' },
                  { title: 'Updates', entities: dashboard.houseUpdates, kind: 'action' },
                  { title: 'Lists', entities: dashboard.houseLists, kind: 'readout' },
                  { title: 'People, places, and services', entities: dashboard.houseOther, kind: 'readout' },
                ]}
              />
            ) : null}
          </div>
          <DashboardDock tab={tab} onSelectTab={selectTab} />
        </main>
      </VantaBackground>
    </Suspense>
  );
};
