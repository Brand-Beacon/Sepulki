// Task type definitions for the Forge UI

export enum TaskType {
  PICK_AND_PLACE = 'PICK_AND_PLACE',
  ASSEMBLY = 'ASSEMBLY',
  INSPECTION = 'INSPECTION',
  TRANSPORT = 'TRANSPORT',
  MAINTENANCE = 'MAINTENANCE',
  PATROL = 'PATROL',
  CUSTOM = 'CUSTOM',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  type: TaskType;
  parameters?: Record<string, any>;
  assignedRobots?: Robot[];
  status: TaskStatus;
  priority: TaskPriority;
  scheduledAt?: Date;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Robot {
  id: string;
  name: string;
  status: string;
  fleetId: string;
  batteryLevel?: number;
  healthScore?: number;
}

export interface Fleet {
  id: string;
  name: string;
  description?: string;
  status: string;
  robots: Robot[];
}

export interface TaskAssignment {
  taskId: string;
  robotId: string;
  confidence: number;
  estimatedDuration?: number;
  assignedAt: Date;
}

export interface TaskInput {
  name: string;
  description?: string;
  type: TaskType;
  parameters?: Record<string, any>;
  priority?: TaskPriority;
  scheduledAt?: Date;
}

export interface DispatchTaskResponse {
  task?: Task;
  assignments?: TaskAssignment[];
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}
