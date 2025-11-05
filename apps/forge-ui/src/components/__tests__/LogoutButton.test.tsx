import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogoutButton } from '../LogoutButton';
import { useAuth } from '../AuthProvider';

// Mock the AuthProvider
jest.mock('../AuthProvider', () => ({
  useAuth: jest.fn(),
}));

describe('LogoutButton', () => {
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signOut: mockSignOut,
      smith: { id: '1', name: 'Test User', email: 'test@example.com', role: 'SMITH' },
      loading: false,
      authMode: 'mock',
    });
  });

  describe('default variant', () => {
    it('renders sign out button with text and icon', () => {
      render(<LogoutButton />);

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('calls signOut when clicked without confirmation', async () => {
      render(<LogoutButton />);

      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it('shows confirmation dialog when showConfirmation is true', () => {
      render(<LogoutButton showConfirmation />);

      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      expect(screen.getByText(/are you sure you want to sign out/i)).toBeInTheDocument();
    });

    it('calls signOut when confirmation is accepted', async () => {
      render(<LogoutButton showConfirmation />);

      // Open dialog
      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      // Confirm
      const confirmButton = screen.getAllByRole('button', { name: /sign out/i })[1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call signOut when confirmation is cancelled', () => {
      render(<LogoutButton showConfirmation />);

      // Open dialog
      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('shows loading state during sign out', async () => {
      // Make signOut async
      mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<LogoutButton />);

      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText(/signing out/i)).toBeInTheDocument();
      });
    });

    it('is disabled during loading', async () => {
      mockSignOut.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<LogoutButton />);

      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('menu variant', () => {
    it('renders with menu styling', () => {
      render(<LogoutButton variant="menu" />);

      const button = screen.getByRole('menuitem');
      expect(button).toHaveClass('w-full');
      expect(screen.getByText(/sign out/i)).toBeInTheDocument();
    });

    it('calls signOut when clicked', async () => {
      render(<LogoutButton variant="menu" />);

      const button = screen.getByRole('menuitem');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('icon variant', () => {
    it('renders only icon without text', () => {
      render(<LogoutButton variant="icon" />);

      const button = screen.getByRole('button', { name: /sign out/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Sign Out');

      // Should not have text content
      expect(button.textContent).toBe('');
    });

    it('calls signOut when clicked', async () => {
      render(<LogoutButton variant="icon" />);

      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error handling', () => {
    it('handles signOut errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockSignOut.mockRejectedValue(new Error('Sign out failed'));

      render(<LogoutButton />);

      const button = screen.getByRole('button', { name: /sign out/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Sign out error:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      render(<LogoutButton className="custom-class" />);

      const button = screen.getByRole('button', { name: /sign out/i });
      expect(button).toHaveClass('custom-class');
    });
  });
});
