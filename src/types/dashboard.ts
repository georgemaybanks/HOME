export type DashboardTab = 'overview' | 'cameras' | 'lights' | 'security' | 'climate' | 'energy' | 'cleaning' | 'aircraft' | 'speakers' | 'buttons' | 'house' | 'parcels' | 'oscar'

export type CallService = (domain: string, service: string, serviceData?: Record<string, unknown>, target?: Record<string, unknown>) => Promise<void>
