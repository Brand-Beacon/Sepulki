'use client';

import React, { useState } from 'react';
import { useNotification } from '@/hooks/useNotification';

/**
 * NotificationDemo Component
 *
 * Demonstration component showing all notification features.
 * Useful for testing and documentation.
 *
 * @example
 * <NotificationDemo />
 */
export function NotificationDemo() {
  const notify = useNotification();
  const [isLoading, setIsLoading] = useState(false);

  const demoPromise = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.5 ? resolve('Success!') : reject(new Error('Failed'));
      }, 2000);
    });
  };

  const handlePromiseDemo = async () => {
    setIsLoading(true);
    try {
      await notify.promise(demoPromise(), {
        loading: 'Processing...',
        success: 'Operation completed successfully!',
        error: (err) => `Failed: ${err.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Notification Demo
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => notify.success('Operation completed successfully!')}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Success
        </button>

        <button
          onClick={() => notify.error('Something went wrong!')}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Error
        </button>

        <button
          onClick={() => notify.warning('Please check your settings')}
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          Warning
        </button>

        <button
          onClick={() => notify.info('New feature available')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Info
        </button>

        <button
          onClick={() => notify.critical('CRITICAL: System emergency!')}
          className="px-4 py-2 bg-red-900 text-white rounded-md hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-700"
        >
          Critical
        </button>

        <button
          onClick={handlePromiseDemo}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Promise Demo
        </button>
      </div>

      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Custom Options Demo
        </h4>
        <div className="space-y-2">
          <button
            onClick={() => notify.success('This stays for 10 seconds', { duration: 10000 })}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          >
            Long Duration (10s)
          </button>

          <button
            onClick={() => notify.info('Silent notification', { sound: false })}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm"
          >
            No Sound
          </button>

          <button
            onClick={() => notify.success('Custom icon notification', { icon: '🎉' })}
            className="w-full px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm"
          >
            Custom Icon
          </button>
        </div>
      </div>

      <div className="pt-4 border-t">
        <button
          onClick={() => notify.dismiss()}
          className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
        >
          Dismiss All Notifications
        </button>
      </div>
    </div>
  );
}
