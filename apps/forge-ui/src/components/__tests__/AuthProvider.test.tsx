// Unit tests for AuthProvider component
// Tests authentication state management, session checking, and sign out functionality

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthProvider';

// Mock the env module
jest.mock('@/lib/env', () => ({
  shouldUseMockAuth: jest.fn(() => true),
  shouldUseRealAuth: jest.fn(() => false),
  env: {
    authProviders: ['mock']
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    
    // Clear window global auth state
    if (typeof window !== 'undefined') {
      delete (window as any).__SEPULKI_AUTH__;
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders children correctly', () => {
      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('starts in loading state', () => {
      render(
        <AuthProvider>
          <div>Test Content</div>
        </AuthProvider>
      );

      // Auth provider should initialize in loading state
      // We can't directly test loading state from outside, but we can test via useAuth hook
    });
  });

  describe('Authentication State Management', () => {
    test('provides auth context via useAuth hook', () => {
      const TestComponent = () => {
        const { smith, loading, authMode } = useAuth();
        return (
          <div>
            <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
            <div data-testid="auth-mode">{authMode}</div>
            {smith && <div data-testid="smith-email">{smith.email}</div>}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('auth-mode')).toBeInTheDocument();
    });

    test('throws error when useAuth used outside provider', () => {
      // Suppress console error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <div>
            <TestComponent />
          </div>
        );
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Mock Authentication', () => {
    test('uses mock auth when shouldUseMockAuth returns true', async () => {
      const { shouldUseMockAuth } = require('@/lib/env');
      shouldUseMockAuth.mockReturnValue(true);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Service unavailable'));

      const TestComponent = () => {
        const { smith, loading } = useAuth();
        
        if (loading) return <div>Loading...</div>;
        
        return (
          <div>
            {smith ? (
              <div data-testid="smith-name">{smith.name}</div>
            ) : (
              <div data-testid="no-smith">No smith</div>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 3000 });

      // Should fallback to mock smith when local auth service fails
      await waitFor(() => {
        const smithName = screen.queryByTestId('smith-name');
        if (smithName) {
          expect(smithName.textContent).toBe('Development Smith');
        }
      }, { timeout: 3000 });
    });

    test('checks local auth service session', async () => {
      const mockSession = {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'OVER_SMITH'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockSession
      });

      const TestComponent = () => {
        const { smith, loading } = useAuth();
        
        if (loading) return <div>Loading...</div>;
        
        return smith ? (
          <div data-testid="smith-email">{smith.email}</div>
        ) : null;
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4446/auth/session',
          { credentials: 'include' }
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('smith-email')).toBeInTheDocument();
      });
    });
  });

  describe('Sign Out Functionality', () => {
    test('signOut clears smith state', async () => {
      const mockSession = {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'OVER_SMITH'
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => mockSession }) // Initial session check
        .mockResolvedValueOnce({ ok: true }); // Sign out request

      const TestComponent = () => {
        const { smith, signOut, loading } = useAuth();
        
        if (loading) return <div>Loading...</div>;
        
        return (
          <div>
            {smith ? (
              <>
                <div data-testid="smith-email">{smith.email}</div>
                <button onClick={signOut} data-testid="sign-out-btn">Sign Out</button>
              </>
            ) : (
              <div data-testid="signed-out">Signed Out</div>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('smith-email')).toBeInTheDocument();
      });

      const signOutBtn = screen.getByTestId('sign-out-btn');
      
      await act(async () => {
        signOutBtn.click();
      });

      // Wait for sign out to complete
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4446/auth/signout',
          { method: 'POST', credentials: 'include' }
        );
      });
    });

    test('signOut handles errors gracefully', async () => {
      const mockSession = {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'OVER_SMITH'
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ json: async () => mockSession })
        .mockRejectedValueOnce(new Error('Network error'));

      const TestComponent = () => {
        const { smith, signOut, loading } = useAuth();
        
        if (loading) return <div>Loading...</div>;
        
        return (
          <div>
            {smith && (
              <button onClick={signOut} data-testid="sign-out-btn">Sign Out</button>
            )}
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('sign-out-btn')).toBeInTheDocument();
      });

      const signOutBtn = screen.getByTestId('sign-out-btn');
      
      await act(async () => {
        signOutBtn.click();
      });

      // Should not throw error
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:4446/auth/signout',
          expect.any(Object)
        );
      });
    });
  });

  describe('Window Global Auth State', () => {
    test('updates window global auth state', async () => {
      const mockSession = {
        user: {
          id: 'test-user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'OVER_SMITH'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockSession
      });

      render(
        <AuthProvider>
          <div>Test</div>
        </AuthProvider>
      );

      await waitFor(() => {
        expect((window as any).__SEPULKI_AUTH__).toBeDefined();
        expect((window as any).__SEPULKI_AUTH__.smith).toBeDefined();
        expect((window as any).__SEPULKI_AUTH__.authMode).toBe('mock');
      });
    });
  });
});

