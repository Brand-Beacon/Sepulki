'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Menu, X, Home, Wrench, Map, ListTodo, FileText } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { LogoutButton } from './LogoutButton';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth: boolean;
  minRole?: 'SMITH' | 'OVER_SMITH' | 'ADMIN';
}

const navigationItems: NavigationItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: Home,
    requiresAuth: false,
  },
  {
    href: '/fleet',
    label: 'Fleet',
    icon: Map,
    requiresAuth: true,
    minRole: 'SMITH',
  },
  {
    href: '/floors',
    label: 'Factory Floors',
    icon: Map,
    requiresAuth: true,
    minRole: 'SMITH',
  },
  {
    href: '/design/new',
    label: 'Design',
    icon: Wrench,
    requiresAuth: false,
  },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: ListTodo,
    requiresAuth: true,
    minRole: 'SMITH',
  },
  {
    href: '/designs',
    label: 'My Designs',
    icon: FileText,
    requiresAuth: true,
    minRole: 'SMITH',
  },
];

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { smith, loading } = useAuth();

  const visibleItems = navigationItems.filter(item => {
    if (!item.requiresAuth) return true;
    if (!smith) return false;

    if (item.minRole) {
      const roleHierarchy = { 'SMITH': 1, 'OVER_SMITH': 2, 'ADMIN': 3 };
      const userLevel = roleHierarchy[smith.role] || 0;
      const requiredLevel = roleHierarchy[item.minRole] || 0;
      return userLevel >= requiredLevel;
    }

    return true;
  });

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile menu dialog */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 sm:hidden" onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-xs">
                    <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-6 border-b border-gray-200">
                        <Dialog.Title className="text-lg font-semibold text-gray-900">
                          Menu
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          onClick={() => setIsOpen(false)}
                        >
                          <span className="sr-only">Close menu</span>
                          <X className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>

                      {/* User info */}
                      {!loading && smith && (
                        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {smith.image ? (
                                <img
                                  className="h-10 w-10 rounded-full"
                                  src={smith.image}
                                  alt={smith.name || 'User avatar'}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-medium">
                                  {smith.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {smith.name || 'User'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {smith.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Navigation */}
                      <nav className="flex-1 px-2 py-4 space-y-1">
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className="group flex items-center px-3 py-2 text-base font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
                            >
                              <Icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                              {item.label}
                            </Link>
                          );
                        })}
                      </nav>

                      {/* Footer with logout */}
                      {!loading && smith && (
                        <div className="flex-shrink-0 border-t border-gray-200 p-4">
                          <LogoutButton
                            variant="default"
                            showConfirmation
                            className="w-full justify-center"
                          />
                        </div>
                      )}
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  );
}
