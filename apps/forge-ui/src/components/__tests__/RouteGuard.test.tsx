// Unit tests for RouteGuard component
// Tests route protection, authentication requirements, and role-based access

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { RouteGuard } from '../RouteGuard';
import { useAuth } from '../AuthProvider';

// Mock AuthProvider
jest.mock('../AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('RouteGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe('Basic Rendering', () => {
    test('renders children when no auth required', () => {
      mockUseAuth.mockReturnValue({
        smith: null,
        loading: false,
        signOut: jest.fn(),
        authMode: 'none',
      });

      render(
        <RouteGuard>
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('shows loading state during auth check', () => {
      mockUseAuth.mockReturnValue({
        smith: null,
        loading: true,
        signOut: jest.fn(),
        authMode: 'none',
      });

      render(
        <RouteGuard>
          <div data-testid="content">Content</div>
        </RouteGuard>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });
  });

  describe('Authentication Required', () => {
    test('redirects to sign in when auth required but not logged in', async () => {
      mockUseAuth.mockReturnValue({
        smith: null,
        loading: false,
        signOut: jest.fn(),
        authMode: 'none',
      });

      render(
        <RouteGuard requiresAuth>
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin');
      });
    });

    test('shows authentication required UI when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        smith: null,
        loading: false,
        signOut: jest.fn(),
        authMode: 'none',
      });

      render(
        <RouteGuard requiresAuth>
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByText(/Authentication Required/i)).toBeInTheDocument();
      expect(screen.getByText(/Please sign in to access this page/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Sign In/i })).toHaveAttribute('href', '/auth/signin');
    });

    test('renders children when authenticated', () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'OVER_SMITH',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard requiresAuth>
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('uses custom fallback when provided', () => {
      mockUseAuth.mockReturnValue({
        smith: null,
        loading: false,
        signOut: jest.fn(),
        authMode: 'none',
      });

      render(
        <RouteGuard 
          requiresAuth 
          fallback={<div data-testid="custom-fallback">Custom Fallback</div>}
        >
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('content')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    test('allows access when user has sufficient role', () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'OVER_SMITH',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard minRole="SMITH">
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('denies access when user has insufficient role', async () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'SMITH',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard minRole="OVER_SMITH">
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });

      expect(screen.getByText(/Insufficient Permissions/i)).toBeInTheDocument();
    });

    test('allows ADMIN access for OVER_SMITH requirement', () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'ADMIN',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard minRole="OVER_SMITH">
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    test('denies SMITH access for ADMIN requirement', async () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'SMITH',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard minRole="ADMIN">
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Combined Requirements', () => {
    test('requires both auth and role', async () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'SMITH',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard requiresAuth minRole="OVER_SMITH">
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    test('grants access when both requirements met', () => {
      mockUseAuth.mockReturnValue({
        smith: {
          id: 'test-smith',
          email: 'test@example.com',
          role: 'OVER_SMITH',
        },
        loading: false,
        signOut: jest.fn(),
        authMode: 'mock',
      });

      render(
        <RouteGuard requiresAuth minRole="SMITH">
          <div data-testid="content">Protected Content</div>
        </RouteGuard>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
    });
  });
});

