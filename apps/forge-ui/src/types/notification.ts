/**
 * Notification System Types
 * Defines all types for the real-time notification system
 */

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface NotificationOptions {
  /** Duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Show close button */
  dismissible?: boolean;
  /** Priority level affects styling and behavior */
  priority?: NotificationPriority;
  /** Custom icon component or emoji */
  icon?: React.ReactNode;
  /** Position on screen */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  /** Play sound notification */
  sound?: boolean;
  /** Additional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom class name */
  className?: string;
  /** Unique ID for deduplication */
  id?: string;
}

export interface NotificationPreferences {
  /** Enable/disable all notifications */
  enabled: boolean;
  /** Play sounds for notifications */
  sound: boolean;
  /** Show success notifications */
  showSuccess: boolean;
  /** Show error notifications */
  showError: boolean;
  /** Show warning notifications */
  showWarning: boolean;
  /** Show info notifications */
  showInfo: boolean;
  /** Default duration in milliseconds */
  defaultDuration: number;
  /** Position on screen */
  position: NotificationOptions['position'];
}

export interface PromiseMessages {
  loading: string;
  success: string | ((data: any) => string);
  error: string | ((error: any) => string);
}

export interface RobotStatusEvent {
  robotId: string;
  name: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  previousStatus?: string;
  timestamp: string;
  message?: string;
}

export interface TaskEvent {
  taskId: string;
  taskName: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
  robotId?: string;
  robotName?: string;
  timestamp: string;
  message?: string;
  error?: string;
}

export interface PolicyViolationEvent {
  policyId: string;
  policyName: string;
  robotId: string;
  robotName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  message: string;
  details?: string;
}

export interface FleetEvent {
  fleetId: string;
  fleetName?: string;
  eventType: 'status_change' | 'robot_added' | 'robot_removed' | 'emergency' | 'maintenance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  timestamp: string;
  message: string;
  affectedRobots?: string[];
}

export type RealtimeEvent =
  | { type: 'robot_status'; data: RobotStatusEvent }
  | { type: 'task'; data: TaskEvent }
  | { type: 'policy_violation'; data: PolicyViolationEvent }
  | { type: 'fleet'; data: FleetEvent };

export interface NotificationSound {
  success: string;
  error: string;
  warning: string;
  info: string;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  sound: true,
  showSuccess: true,
  showError: true,
  showWarning: true,
  showInfo: true,
  defaultDuration: 4000,
  position: 'top-right',
};

export const NOTIFICATION_SOUNDS: NotificationSound = {
  success: '/sounds/success.mp3',
  error: '/sounds/error.mp3',
  warning: '/sounds/warning.mp3',
  info: '/sounds/info.mp3',
};
