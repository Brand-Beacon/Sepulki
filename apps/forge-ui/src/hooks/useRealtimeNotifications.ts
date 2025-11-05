'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSubscription } from '@apollo/client';
import { useNotification } from './useNotification';
import {
  BELLOWS_STREAM_SUBSCRIPTION,
  TASK_UPDATES_SUBSCRIPTION,
} from '@/lib/graphql/subscriptions';
import type {
  RobotStatusEvent,
  TaskEvent,
  FleetEvent,
} from '@/types/notification';

interface UseRealtimeNotificationsOptions {
  /** Fleet ID to monitor */
  fleetId?: string;
  /** Enable robot status notifications */
  enableRobotStatus?: boolean;
  /** Enable task update notifications */
  enableTaskUpdates?: boolean;
  /** Enable fleet event notifications */
  enableFleetEvents?: boolean;
  /** Custom event handlers */
  onRobotStatus?: (event: RobotStatusEvent) => void;
  onTaskUpdate?: (event: TaskEvent) => void;
  onFleetEvent?: (event: FleetEvent) => void;
}

/**
 * useRealtimeNotifications Hook
 *
 * Connects to GraphQL subscriptions and automatically shows toast notifications
 * for real-time events including:
 * - Robot status changes (errors, offline, battery low)
 * - Task updates (completions, failures)
 * - Fleet events (emergencies, maintenance)
 *
 * @example
 * useRealtimeNotifications({
 *   fleetId: 'fleet-123',
 *   enableRobotStatus: true,
 *   enableTaskUpdates: true,
 *   onRobotStatus: (event) => console.log('Robot status:', event),
 * });
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const {
    fleetId,
    enableRobotStatus = true,
    enableTaskUpdates = true,
    enableFleetEvents = true,
    onRobotStatus,
    onTaskUpdate,
    onFleetEvent,
  } = options;

  const notify = useNotification();
  const processedEventsRef = useRef<Set<string>>(new Set());

  /**
   * Subscribe to Bellows stream for robot status and fleet events
   */
  const { data: bellowsData } = useSubscription(BELLOWS_STREAM_SUBSCRIPTION, {
    variables: { fleetId },
    skip: !fleetId || (!enableRobotStatus && !enableFleetEvents),
  });

  /**
   * Subscribe to task updates
   */
  const { data: taskData } = useSubscription(TASK_UPDATES_SUBSCRIPTION, {
    variables: { fleetId },
    skip: !enableTaskUpdates,
  });

  /**
   * Generate unique event ID for deduplication
   */
  const getEventId = useCallback((event: any, type: string): string => {
    return `${type}-${event.timestamp || Date.now()}-${JSON.stringify(event)}`;
  }, []);

  /**
   * Check if event has already been processed
   */
  const isEventProcessed = useCallback((eventId: string): boolean => {
    if (processedEventsRef.current.has(eventId)) {
      return true;
    }
    processedEventsRef.current.add(eventId);

    // Clean up old events (keep last 100)
    if (processedEventsRef.current.size > 100) {
      const entries = Array.from(processedEventsRef.current);
      processedEventsRef.current = new Set(entries.slice(-100));
    }

    return false;
  }, []);

  /**
   * Handle robot status events from Bellows stream
   */
  useEffect(() => {
    if (!bellowsData?.bellowsStream?.events || !enableRobotStatus) return;

    const events = bellowsData.bellowsStream.events;

    events.forEach((event: any) => {
      const eventId = getEventId(event, 'robot');
      if (isEventProcessed(eventId)) return;

      const robotEvent: RobotStatusEvent = {
        robotId: event.robotId,
        name: event.robotName || `Robot ${event.robotId}`,
        status: event.type === 'error' ? 'error' : 'offline',
        timestamp: event.timestamp,
        message: event.message,
      };

      // Call custom handler
      onRobotStatus?.(robotEvent);

      // Show appropriate notification
      switch (event.type) {
        case 'error':
          notify.error(`${robotEvent.name}: ${event.message}`, {
            duration: 6000,
            id: eventId,
          });
          break;
        case 'offline':
          notify.warning(`${robotEvent.name} went offline`, {
            duration: 5000,
            id: eventId,
          });
          break;
        case 'battery_low':
          notify.warning(`${robotEvent.name}: Low battery (${event.batteryLevel}%)`, {
            duration: 5000,
            id: eventId,
          });
          break;
        case 'maintenance_required':
          notify.info(`${robotEvent.name}: Maintenance required`, {
            duration: 5000,
            id: eventId,
          });
          break;
      }
    });
  }, [bellowsData, enableRobotStatus, notify, onRobotStatus, getEventId, isEventProcessed]);

  /**
   * Handle task updates
   */
  useEffect(() => {
    if (!taskData?.taskUpdates || !enableTaskUpdates) return;

    const task = taskData.taskUpdates;
    const latestRun = task.runs?.[0];

    if (!latestRun) return;

    const eventId = getEventId({ taskId: task.id, runId: latestRun.id, status: latestRun.status }, 'task');
    if (isEventProcessed(eventId)) return;

    const taskEvent: TaskEvent = {
      taskId: task.id,
      taskName: task.name,
      status: latestRun.status,
      robotId: task.assignedRobots?.[0]?.id,
      robotName: task.assignedRobots?.[0]?.name,
      timestamp: latestRun.completedAt || latestRun.startedAt || new Date().toISOString(),
    };

    // Call custom handler
    onTaskUpdate?.(taskEvent);

    // Show appropriate notification
    switch (latestRun.status) {
      case 'completed':
        notify.success(`Task "${task.name}" completed successfully`, {
          duration: 4000,
          id: eventId,
        });
        break;
      case 'failed':
        notify.error(`Task "${task.name}" failed`, {
          duration: 6000,
          id: eventId,
        });
        break;
      case 'running':
        if (task.priority === 'critical') {
          notify.info(`Critical task "${task.name}" is now running`, {
            duration: 3000,
            id: eventId,
          });
        }
        break;
    }
  }, [taskData, enableTaskUpdates, notify, onTaskUpdate, getEventId, isEventProcessed]);

  /**
   * Handle fleet events from Bellows stream
   */
  useEffect(() => {
    if (!bellowsData?.bellowsStream?.events || !enableFleetEvents) return;

    const events = bellowsData.bellowsStream.events;

    events.forEach((event: any) => {
      if (event.type !== 'fleet_event') return;

      const eventId = getEventId(event, 'fleet');
      if (isEventProcessed(eventId)) return;

      const fleetEvent: FleetEvent = {
        fleetId: fleetId || '',
        eventType: event.eventType,
        severity: event.severity || 'info',
        timestamp: event.timestamp,
        message: event.message,
        affectedRobots: event.affectedRobots,
      };

      // Call custom handler
      onFleetEvent?.(fleetEvent);

      // Show appropriate notification based on severity
      switch (fleetEvent.severity) {
        case 'critical':
          notify.critical(fleetEvent.message, { id: eventId });
          break;
        case 'error':
          notify.error(fleetEvent.message, {
            duration: 6000,
            id: eventId,
          });
          break;
        case 'warning':
          notify.warning(fleetEvent.message, {
            duration: 5000,
            id: eventId,
          });
          break;
        case 'info':
          notify.info(fleetEvent.message, {
            duration: 4000,
            id: eventId,
          });
          break;
      }
    });
  }, [bellowsData, enableFleetEvents, fleetId, notify, onFleetEvent, getEventId, isEventProcessed]);

  /**
   * Clean up processed events on unmount
   */
  useEffect(() => {
    return () => {
      processedEventsRef.current.clear();
    };
  }, []);

  return {
    isConnected: !!bellowsData || !!taskData,
  };
}

export type UseRealtimeNotificationsReturn = ReturnType<typeof useRealtimeNotifications>;
