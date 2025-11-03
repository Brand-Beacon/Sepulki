import { BaseEntity } from './index';
import { Sepulka, Ingot } from './sepulka';

export enum FleetStatus {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE'
}

export enum RobotStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  CHARGING = 'CHARGING',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE'
}

export interface Fleet extends BaseEntity {
  name: string;
  description?: string;
  locus: Locus;
  robots: Robot[];
  activeTask?: string; // Task ID
  status: FleetStatus;
  constraints: string[]; // Edict IDs
}

export interface Robot extends BaseEntity {
  name: string;
  sepulkaId: string;
  fleetId: string;
  currentIngot: Ingot;
  status: RobotStatus;
  lastSeen?: Date;
  pose?: RobotPose;
  batteryLevel?: number; // 0-100%
  healthScore?: number; // 0-100%
  factoryFloorId?: string;
  factoryFloor?: FactoryFloor;
  floorPositionX?: number; // Position on floor in meters (local coordinate system)
  floorPositionY?: number; // Position on floor in meters
  floorPositionTheta?: number; // Orientation in radians
  isMobile?: boolean | null; // null = auto-detect from pattern, true/false = manual override
  floorRotationDegrees?: number; // Rotation of robot icon on floor for display
}

export interface FactoryFloor extends BaseEntity {
  name: string;
  description?: string;
  blueprintUrl?: string;
  blueprintType?: 'IMAGE' | 'PDF' | 'CAD';
  widthMeters: number;
  heightMeters: number;
  scaleFactor: number;
  originX: number;
  originY: number;
  robots: Robot[];
  createdBy: string; // Smith ID
}

export interface Locus extends BaseEntity {
  name: string;
  description?: string;
  coordinates?: Coordinates;
  constraints: string[]; // Edict IDs
  safetyZones: SafetyZone[];
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export interface SafetyZone {
  id: string;
  name: string;
  type: SafetyZoneType;
  boundaries: GeoBoundary[];
  restrictions: string[];
}

export enum SafetyZoneType {
  EXCLUSION = 'EXCLUSION',
  RESTRICTED = 'RESTRICTED',
  MAINTENANCE = 'MAINTENANCE',
  EMERGENCY = 'EMERGENCY'
}

export interface GeoBoundary {
  type: 'polygon' | 'circle' | 'rectangle';
  coordinates: number[][];
  radius?: number; // for circles
}

export interface RobotPose {
  position: {
    x: number;
    y: number;
    z: number;
  };
  orientation: {
    x: number;
    y: number;
    z: number;
    w: number; // quaternion
  };
  jointPositions?: Record<string, number>;
  timestamp: Date;
}
