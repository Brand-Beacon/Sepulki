'use client';

import { useState } from 'react';
import { LogOut, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LogoutButtonProps {
  variant?: 'default' | 'menu' | 'icon';
  showConfirmation?: boolean;
  className?: string;
}

export function LogoutButton({
  variant = 'default',
  showConfirmation = false,
  className = ''
}: LogoutButtonProps) {
  const { signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  const handleSignOut = async () => {
    if (showConfirmation && !showDialog) {
      setShowDialog(true);
      return;
    }

    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      // Still proceed with sign out even if error occurs
    } finally {
      setIsLoading(false);
      setShowDialog(false);
    }
  };

  const handleCancel = () => {
    setShowDialog(false);
  };

  // Icon variant - just the icon with hover effect
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className={`p-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
          title="Sign Out"
          aria-label="Sign Out"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LogOut className="h-5 w-5" />
          )}
        </button>
        {showDialog && <ConfirmationDialog onConfirm={handleSignOut} onCancel={handleCancel} />}
      </>
    );
  }

  // Menu variant - for dropdown menus
  if (variant === 'menu') {
    return (
      <>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className={`w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
          role="menuitem"
        >
          {isLoading ? (
            <Loader2 className="mr-3 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-3 h-4 w-4" />
          )}
          Sign Out
        </button>
        {showDialog && <ConfirmationDialog onConfirm={handleSignOut} onCancel={handleCancel} />}
      </>
    );
  }

  // Default variant - full button
  return (
    <>
      <button
        onClick={handleSignOut}
        disabled={isLoading}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing Out...
          </>
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </>
        )}
      </button>
      {showDialog && <ConfirmationDialog onConfirm={handleSignOut} onCancel={handleCancel} />}
    </>
  );
}

function ConfirmationDialog({
  onConfirm,
  onCancel
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-in fade-in duration-200">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Sign Out
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Are you sure you want to sign out? You'll need to sign in again to access your account.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
