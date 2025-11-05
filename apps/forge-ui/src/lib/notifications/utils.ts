/**
 * Notification Utilities
 * Helper functions for notification system
 */

import type { NotificationType } from '@/types/notification';

/**
 * Format error message for display
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') return error;

  if (error?.message) return error.message;

  if (error?.graphQLErrors?.[0]?.message) {
    return error.graphQLErrors[0].message;
  }

  if (error?.networkError?.message) {
    return error.networkError.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Get icon for notification type
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return icons[type];
}

/**
 * Get color class for notification type (Tailwind)
 */
export function getNotificationColorClass(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    success: 'text-orange-600 border-orange-500',
    error: 'text-red-600 border-red-500',
    warning: 'text-amber-600 border-amber-500',
    info: 'text-blue-600 border-blue-500',
  };

  return colors[type];
}

/**
 * Truncate long messages
 */
export function truncateMessage(message: string, maxLength: number = 150): string {
  if (message.length <= maxLength) return message;
  return `${message.substring(0, maxLength)}...`;
}

/**
 * Parse error from Apollo/GraphQL
 */
export function parseApolloError(error: any): { message: string; code?: string } {
  if (error?.graphQLErrors?.length > 0) {
    const gqlError = error.graphQLErrors[0];
    return {
      message: gqlError.message,
      code: gqlError.extensions?.code,
    };
  }

  if (error?.networkError) {
    return {
      message: 'Network error: Unable to connect to server',
      code: 'NETWORK_ERROR',
    };
  }

  return {
    message: formatErrorMessage(error),
  };
}

/**
 * Debounce notifications to prevent spam
 */
export function createNotificationDebouncer(delayMs: number = 1000) {
  const recentNotifications = new Map<string, number>();

  return (key: string, callback: () => void) => {
    const now = Date.now();
    const lastTime = recentNotifications.get(key);

    if (lastTime && now - lastTime < delayMs) {
      // Too soon, skip
      return false;
    }

    recentNotifications.set(key, now);
    callback();

    // Cleanup old entries
    if (recentNotifications.size > 100) {
      const entries = Array.from(recentNotifications.entries());
      recentNotifications.clear();
      entries.slice(-50).forEach(([k, v]) => recentNotifications.set(k, v));
    }

    return true;
  };
}

/**
 * Format robot name for display
 */
export function formatRobotName(robotId: string, robotName?: string): string {
  if (robotName) return robotName;
  return `Robot ${robotId.substring(0, 8)}`;
}

/**
 * Format task name for display
 */
export function formatTaskName(taskId: string, taskName?: string): string {
  if (taskName) return taskName;
  return `Task ${taskId.substring(0, 8)}`;
}

/**
 * Get notification priority from severity
 */
export function getPriorityFromSeverity(
  severity: 'low' | 'medium' | 'high' | 'critical'
): 'low' | 'medium' | 'high' | 'critical' {
  return severity;
}

/**
 * Check if error is network related
 */
export function isNetworkError(error: any): boolean {
  return !!(
    error?.networkError ||
    error?.message?.includes('network') ||
    error?.message?.includes('fetch')
  );
}

/**
 * Check if error is authentication related
 */
export function isAuthError(error: any): boolean {
  const authCodes = ['UNAUTHENTICATED', 'UNAUTHORIZED', '401', '403'];
  const code = error?.graphQLErrors?.[0]?.extensions?.code || error?.code;
  return authCodes.includes(code);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: any): string {
  if (isAuthError(error)) {
    return 'Authentication required. Please sign in again.';
  }

  if (isNetworkError(error)) {
    return 'Unable to connect to server. Please check your connection.';
  }

  return formatErrorMessage(error);
}
