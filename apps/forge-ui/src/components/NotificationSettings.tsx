'use client';

import React from 'react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

/**
 * NotificationSettings Component
 *
 * User interface for managing notification preferences.
 * Can be embedded in a settings page or modal.
 *
 * @example
 * <NotificationSettings />
 */
export function NotificationSettings() {
  const {
    preferences,
    toggleNotifications,
    toggleSound,
    toggleNotificationType,
    setDefaultDuration,
    resetPreferences,
    isLoaded,
  } = useNotificationPreferences();

  if (!isLoaded) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Notification Settings
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Customize how you receive notifications from Sepulki
        </p>
      </div>

      {/* Enable/Disable All */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <label htmlFor="enable-notifications" className="text-sm font-medium text-gray-700">
            Enable Notifications
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Turn all notifications on or off
          </p>
        </div>
        <button
          type="button"
          id="enable-notifications"
          role="switch"
          aria-checked={preferences.enabled}
          onClick={toggleNotifications}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
            ${preferences.enabled ? 'bg-orange-600' : 'bg-gray-200'}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${preferences.enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Sound Toggle */}
      <div className="flex items-center justify-between py-4 border-b">
        <div>
          <label htmlFor="enable-sound" className="text-sm font-medium text-gray-700">
            Sound Effects
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Play sounds with notifications
          </p>
        </div>
        <button
          type="button"
          id="enable-sound"
          role="switch"
          aria-checked={preferences.sound}
          onClick={toggleSound}
          disabled={!preferences.enabled}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
            ${preferences.sound && preferences.enabled ? 'bg-orange-600' : 'bg-gray-200'}
            ${!preferences.enabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
              transition duration-200 ease-in-out
              ${preferences.sound ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Notification Types */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Notification Types
        </label>
        <p className="text-xs text-gray-500">
          Choose which types of notifications to receive
        </p>

        <div className="space-y-2">
          {[
            { key: 'success' as const, label: 'Success', description: 'Task completions and successful operations' },
            { key: 'error' as const, label: 'Errors', description: 'Failures and critical issues' },
            { key: 'warning' as const, label: 'Warnings', description: 'Important alerts and cautions' },
            { key: 'info' as const, label: 'Information', description: 'General updates and information' },
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-start">
              <input
                type="checkbox"
                id={`notify-${key}`}
                checked={preferences[`show${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof preferences] as boolean}
                onChange={() => toggleNotificationType(key)}
                disabled={!preferences.enabled}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded mt-1 disabled:opacity-50"
              />
              <label htmlFor={`notify-${key}`} className="ml-3 flex-1">
                <span className={`text-sm font-medium ${!preferences.enabled ? 'text-gray-400' : 'text-gray-700'}`}>
                  {label}
                </span>
                <p className={`text-xs ${!preferences.enabled ? 'text-gray-400' : 'text-gray-500'}`}>
                  {description}
                </p>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Duration Slider */}
      <div className="space-y-3">
        <label htmlFor="duration-slider" className="text-sm font-medium text-gray-700">
          Default Duration: {preferences.defaultDuration / 1000}s
        </label>
        <input
          type="range"
          id="duration-slider"
          min="1000"
          max="10000"
          step="500"
          value={preferences.defaultDuration}
          onChange={(e) => setDefaultDuration(Number(e.target.value))}
          disabled={!preferences.enabled}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-600 disabled:opacity-50"
        />
        <p className="text-xs text-gray-500">
          How long notifications stay visible (1-10 seconds)
        </p>
      </div>

      {/* Reset Button */}
      <div className="pt-4 border-t">
        <button
          type="button"
          onClick={resetPreferences}
          className="text-sm text-orange-600 hover:text-orange-700 font-medium focus:outline-none focus:underline"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
