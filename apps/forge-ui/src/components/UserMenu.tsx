'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { User, Settings, HelpCircle, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { LogoutButton } from './LogoutButton';

export function UserMenu() {
  const { smith, loading } = useAuth();

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 h-10 w-32 rounded-md"></div>
    );
  }

  if (!smith) {
    return null;
  }

  // Get initials for avatar
  const initials = smith.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || smith.email?.[0].toUpperCase() || 'U';

  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex items-center justify-center w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors">
          <div className="flex items-center space-x-2">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {smith.image ? (
                <img
                  className="h-8 w-8 rounded-full"
                  src={smith.image}
                  alt={smith.name || 'User avatar'}
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-medium">
                  {initials}
                </div>
              )}
            </div>

            {/* Name and role - hidden on mobile */}
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-900">
                {smith.name || 'User'}
              </div>
              <div className="text-xs text-gray-500">
                {smith.role}
              </div>
            </div>

            <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* User info section */}
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-gray-900">{smith.name || 'User'}</p>
            <p className="text-xs text-gray-500 truncate">{smith.email}</p>
            <p className="text-xs text-gray-400 mt-1">Role: {smith.role}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/designs"
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex items-center px-4 py-2 text-sm`}
                >
                  <User className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  My Designs
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/settings"
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex items-center px-4 py-2 text-sm`}
                >
                  <Settings className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  Settings
                </Link>
              )}
            </Menu.Item>

            <Menu.Item>
              {({ active }) => (
                <Link
                  href="/help"
                  className={`${
                    active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                  } group flex items-center px-4 py-2 text-sm`}
                >
                  <HelpCircle className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                  Help & Support
                </Link>
              )}
            </Menu.Item>
          </div>

          {/* Sign out section */}
          <div className="py-1">
            <Menu.Item>
              {() => (
                <LogoutButton variant="menu" showConfirmation />
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
