'use client';

import { useState, useEffect, useCallback } from 'react';
import type { NotificationPreferences } from '@/types/notification';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notification';

const STORAGE_KEY = 'sepulki_notification_preferences';

/**
 * useNotificationPreferences Hook
 *
 * Manages user notification preferences with localStorage persistence.
 * Allows users to control:
 * - Enable/disable notifications
 * - Sound on/off
 * - Which notification types to show
 * - Default duration
 * - Toast position
 *
 * @example
 * const { preferences, updatePreferences, resetPreferences } = useNotificationPreferences();
 *
 * // Toggle sounds
 * updatePreferences({ sound: !preferences.sound });
 *
 * // Disable all notifications
 * updatePreferences({ enabled: false });
 */
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Load preferences from localStorage on mount
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as NotificationPreferences;
        // Merge with defaults to ensure all properties exist
        setPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  /**
   * Save preferences to localStorage
   */
  const savePreferences = useCallback((newPreferences: NotificationPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }, []);

  /**
   * Update specific preference fields
   */
  const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    savePreferences(newPreferences);
  }, [preferences, savePreferences]);

  /**
   * Reset to default preferences
   */
  const resetPreferences = useCallback(() => {
    savePreferences(DEFAULT_NOTIFICATION_PREFERENCES);
  }, [savePreferences]);

  /**
   * Toggle notifications on/off
   */
  const toggleNotifications = useCallback(() => {
    updatePreferences({ enabled: !preferences.enabled });
  }, [preferences.enabled, updatePreferences]);

  /**
   * Toggle sound on/off
   */
  const toggleSound = useCallback(() => {
    updatePreferences({ sound: !preferences.sound });
  }, [preferences.sound, updatePreferences]);

  /**
   * Toggle specific notification type
   */
  const toggleNotificationType = useCallback((
    type: 'success' | 'error' | 'warning' | 'info'
  ) => {
    const typeMap = {
      success: 'showSuccess',
      error: 'showError',
      warning: 'showWarning',
      info: 'showInfo',
    } as const;

    const key = typeMap[type];
    updatePreferences({ [key]: !preferences[key] });
  }, [preferences, updatePreferences]);

  /**
   * Set default duration
   */
  const setDefaultDuration = useCallback((duration: number) => {
    updatePreferences({ defaultDuration: Math.max(1000, Math.min(10000, duration)) });
  }, [updatePreferences]);

  /**
   * Set toast position
   */
  const setPosition = useCallback((
    position: NotificationPreferences['position']
  ) => {
    updatePreferences({ position });
  }, [updatePreferences]);

  /**
   * Check if notifications are enabled
   */
  const isEnabled = preferences.enabled;

  /**
   * Check if a specific notification type is enabled
   */
  const isTypeEnabled = useCallback((type: 'success' | 'error' | 'warning' | 'info') => {
    if (!preferences.enabled) return false;

    const typeMap = {
      success: preferences.showSuccess,
      error: preferences.showError,
      warning: preferences.showWarning,
      info: preferences.showInfo,
    };

    return typeMap[type];
  }, [preferences]);

  return {
    preferences,
    isLoaded,
    updatePreferences,
    resetPreferences,
    toggleNotifications,
    toggleSound,
    toggleNotificationType,
    setDefaultDuration,
    setPosition,
    isEnabled,
    isTypeEnabled,
  };
}

export type UseNotificationPreferencesReturn = ReturnType<typeof useNotificationPreferences>;
