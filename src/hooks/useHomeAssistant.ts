import { useContext } from 'react';
import { HomeAssistantContext } from '../context/HomeAssistantContext';

export function useHomeAssistant() {
  const context = useContext(HomeAssistantContext);
  if (!context) throw new Error('useHomeAssistant must be used inside HomeAssistantProvider.');
  return context;
}
