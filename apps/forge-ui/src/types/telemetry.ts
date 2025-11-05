// Telemetry types for robot monitoring

export interface RobotTelemetry {
  timestamp: string
  batteryLevel: number
  healthScore: number
  status: RobotStatus
  performance?: PerformanceMetrics
  metrics?: SystemMetrics
}

export interface PerformanceMetrics {
  speed: number
  efficiency: number
  uptime: number
}

export interface SystemMetrics {
  cpu?: number
  memory?: number
  temperature?: number
}

export enum RobotStatus {
  WORKING = 'WORKING',
  IDLE = 'IDLE',
  CHARGING = 'CHARGING',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export interface RobotDetails {
  id: string
  name: string
  sepulkaId?: string
  fleetId: string
  status: RobotStatus
  batteryLevel: number
  healthScore: number
  lastSeen: string
  pose?: RobotPose
  streamUrl?: string
  currentIngot?: CurrentIngot
}

export interface RobotPose {
  position?: {
    latitude: number
    longitude: number
    altitude: number
  }
  orientation?: number
  jointPositions?: number[]
  timestamp?: string
}

export interface CurrentIngot {
  id: string
  version: string
  status: IngotStatus
}

export enum IngotStatus {
  PENDING = 'PENDING',
  BUILDING = 'BUILDING',
  TESTING = 'TESTING',
  READY = 'READY',
  DEPLOYED = 'DEPLOYED',
  FAILED = 'FAILED',
}

export type TimeRange = '1h' | '6h' | '24h' | '7d'
