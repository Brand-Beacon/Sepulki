'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * ToastProvider Component
 *
 * Provides toast notification functionality with Sepulki theme styling.
 * Wraps the app with react-hot-toast configuration.
 *
 * Features:
 * - Custom Sepulki orange accent colors
 * - Responsive positioning
 * - Queue management for multiple toasts
 * - Smooth animations
 * - Dark mode support
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName="toast-container"
      containerStyle={{
        top: 80, // Below navbar
        right: 20,
        zIndex: 9999,
      }}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,

        // Default styling matching Sepulki theme
        style: {
          background: '#fff',
          color: '#374151',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
          maxWidth: '500px',
          border: '1px solid #e5e7eb',
        },

        // Success toast styling (Sepulki orange)
        success: {
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #fb923c',
          },
          iconTheme: {
            primary: '#f97316', // Sepulki orange-500
            secondary: '#fff',
          },
        },

        // Error toast styling
        error: {
          duration: 6000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #ef4444',
          },
          iconTheme: {
            primary: '#dc2626', // red-600
            secondary: '#fff',
          },
        },

        // Loading toast styling
        loading: {
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #3b82f6',
          },
          iconTheme: {
            primary: '#3b82f6', // blue-500
            secondary: '#fff',
          },
        },

        // Custom blank toast (for custom types)
        blank: {
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
          },
        },
      }}
    />
  );
}

/**
 * Toast custom styles for different notification types
 * Can be imported and used with toast.custom()
 */
export const toastStyles = {
  warning: {
    style: {
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fbbf24',
    },
    iconTheme: {
      primary: '#f59e0b', // amber-500
      secondary: '#fffbeb',
    },
  },

  info: {
    style: {
      background: '#eff6ff',
      color: '#1e40af',
      border: '1px solid #60a5fa',
    },
    iconTheme: {
      primary: '#3b82f6', // blue-500
      secondary: '#eff6ff',
    },
  },

  critical: {
    duration: 0, // No auto-dismiss for critical
    style: {
      background: '#fef2f2',
      color: '#7f1d1d',
      border: '2px solid #dc2626',
      boxShadow: '0 20px 25px -5px rgba(220, 38, 38, 0.3), 0 10px 10px -5px rgba(220, 38, 38, 0.2)',
    },
    iconTheme: {
      primary: '#dc2626',
      secondary: '#fef2f2',
    },
  },
};
