'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type {
  NotificationOptions,
  PromiseMessages,
  NotificationType,
} from '@/types/notification';
import { useNotificationPreferences } from './useNotificationPreferences';
import { toastStyles } from '@/components/ToastProvider';

/**
 * useNotification Hook
 *
 * Provides a comprehensive notification API with support for:
 * - Success, error, warning, info notifications
 * - Promise-based notifications
 * - Custom durations and positioning
 * - User preferences
 * - Sound effects
 * - Action buttons
 *
 * @example
 * const notify = useNotification();
 * notify.success('Task completed!');
 * notify.error('Failed to save', { duration: 5000 });
 * notify.promise(apiCall(), {
 *   loading: 'Saving...',
 *   success: 'Saved!',
 *   error: 'Failed to save'
 * });
 */
export function useNotification() {
  const { preferences, isEnabled } = useNotificationPreferences();

  /**
   * Play notification sound if enabled
   */
  const playSound = useCallback((type: NotificationType) => {
    if (!preferences.sound) return;

    const sounds: Record<NotificationType, string> = {
      success: '/sounds/success.mp3',
      error: '/sounds/error.mp3',
      warning: '/sounds/warning.mp3',
      info: '/sounds/info.mp3',
    };

    try {
      const audio = new Audio(sounds[type]);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Silently fail if sound cannot play (e.g., user hasn't interacted yet)
      });
    } catch (error) {
      // Silently fail
    }
  }, [preferences.sound]);

  /**
   * Check if notification type should be shown based on preferences
   */
  const shouldShow = useCallback((type: NotificationType): boolean => {
    if (!preferences.enabled) return false;

    const typeMap = {
      success: preferences.showSuccess,
      error: preferences.showError,
      warning: preferences.showWarning,
      info: preferences.showInfo,
    };

    return typeMap[type];
  }, [preferences]);

  /**
   * Show success notification
   */
  const success = useCallback((message: string, options?: NotificationOptions) => {
    if (!shouldShow('success')) return;

    const duration = options?.duration ?? preferences.defaultDuration;

    if (options?.sound !== false) {
      playSound('success');
    }

    return toast.success(message, {
      duration,
      id: options?.id,
      className: options?.className,
      icon: options?.icon,
    });
  }, [shouldShow, preferences.defaultDuration, playSound]);

  /**
   * Show error notification
   */
  const error = useCallback((message: string, options?: NotificationOptions) => {
    if (!shouldShow('error')) return;

    const duration = options?.duration ?? preferences.defaultDuration * 1.5; // Errors stay longer

    if (options?.sound !== false) {
      playSound('error');
    }

    return toast.error(message, {
      duration,
      id: options?.id,
      className: options?.className,
      icon: options?.icon,
    });
  }, [shouldShow, preferences.defaultDuration, playSound]);

  /**
   * Show warning notification
   */
  const warning = useCallback((message: string, options?: NotificationOptions) => {
    if (!shouldShow('warning')) return;

    const duration = options?.duration ?? preferences.defaultDuration;

    if (options?.sound !== false) {
      playSound('warning');
    }

    return toast(message, {
      duration,
      id: options?.id,
      className: options?.className,
      icon: options?.icon ?? '⚠️',
      ...toastStyles.warning,
    });
  }, [shouldShow, preferences.defaultDuration, playSound]);

  /**
   * Show info notification
   */
  const info = useCallback((message: string, options?: NotificationOptions) => {
    if (!shouldShow('info')) return;

    const duration = options?.duration ?? preferences.defaultDuration;

    if (options?.sound !== false) {
      playSound('info');
    }

    return toast(message, {
      duration,
      id: options?.id,
      className: options?.className,
      icon: options?.icon ?? 'ℹ️',
      ...toastStyles.info,
    });
  }, [shouldShow, preferences.defaultDuration, playSound]);

  /**
   * Show critical notification (no auto-dismiss)
   */
  const critical = useCallback((message: string, options?: NotificationOptions) => {
    if (!shouldShow('error')) return;

    if (options?.sound !== false) {
      playSound('error');
    }

    return toast(message, {
      duration: 0, // No auto-dismiss
      id: options?.id,
      className: options?.className,
      icon: options?.icon ?? '🚨',
      ...toastStyles.critical,
    });
  }, [shouldShow, playSound]);

  /**
   * Show promise-based notification (loading -> success/error)
   */
  const promise = useCallback(<T,>(
    promiseOrFunction: Promise<T> | (() => Promise<T>),
    messages: PromiseMessages,
    options?: NotificationOptions
  ) => {
    if (!preferences.enabled) {
      // Still execute the promise, just don't show notifications
      const promiseToExecute = typeof promiseOrFunction === 'function'
        ? promiseOrFunction()
        : promiseOrFunction;
      return promiseToExecute;
    }

    const promiseToExecute = typeof promiseOrFunction === 'function'
      ? promiseOrFunction()
      : promiseOrFunction;

    return toast.promise(
      promiseToExecute,
      {
        loading: messages.loading,
        success: (data) => {
          if (options?.sound !== false && shouldShow('success')) {
            playSound('success');
          }
          return typeof messages.success === 'function'
            ? messages.success(data)
            : messages.success;
        },
        error: (err) => {
          if (options?.sound !== false && shouldShow('error')) {
            playSound('error');
          }
          return typeof messages.error === 'function'
            ? messages.error(err)
            : messages.error;
        },
      },
      {
        loading: {
          duration: Infinity,
        },
        success: {
          duration: options?.duration ?? preferences.defaultDuration,
        },
        error: {
          duration: options?.duration ?? preferences.defaultDuration * 1.5,
        },
        id: options?.id,
      }
    );
  }, [preferences.enabled, preferences.defaultDuration, shouldShow, playSound]);

  /**
   * Dismiss a specific notification or all notifications
   */
  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }, []);

  /**
   * Check if notifications are enabled
   */
  const enabled = preferences.enabled;

  return {
    success,
    error,
    warning,
    info,
    critical,
    promise,
    dismiss,
    enabled,
    isEnabled,
  };
}

export type UseNotificationReturn = ReturnType<typeof useNotification>;
