export type DashboardTab = 'overview' | 'cameras' | 'lights' | 'security' | 'climate' | 'cleaning' | 'aircraft' | 'speakers' | 'buttons' | 'house'

export type CallService = (domain: string, service: string, serviceData?: Record<string, unknown>) => Promise<void>
