import { render, screen, fireEvent } from '@testing-library/react';
import { UserMenu } from '../UserMenu';
import { useAuth } from '../AuthProvider';

// Mock the AuthProvider
jest.mock('../AuthProvider', () => ({
  useAuth: jest.fn(),
}));

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('UserMenu', () => {
  const mockSmith = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'SMITH' as const,
    image: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state when auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: null,
      loading: true,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    expect(screen.getByRole('presentation')).toHaveClass('animate-pulse');
  });

  it('returns null when not authenticated', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: null,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    const { container } = render(<UserMenu />);

    expect(container.firstChild).toBeNull();
  });

  it('renders user menu button with avatar and name', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: mockSmith,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('SMITH')).toBeInTheDocument();
    expect(screen.getByAltText('John Doe')).toBeInTheDocument();
  });

  it('displays initials when no avatar image', () => {
    const smithWithoutImage = { ...mockSmith, image: undefined };
    (useAuth as jest.Mock).mockReturnValue({
      smith: smithWithoutImage,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('opens menu when button is clicked', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: mockSmith,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Menu items should be visible
    expect(screen.getByText('My Designs')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help & Support')).toBeInTheDocument();
  });

  it('displays user info in menu header', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: mockSmith,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // User info should be in menu
    const userInfos = screen.getAllByText('John Doe');
    expect(userInfos.length).toBeGreaterThan(1);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText(/role: smith/i)).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: mockSmith,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('link', { name: /my designs/i })).toHaveAttribute('href', '/designs');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
    expect(screen.getByRole('link', { name: /help & support/i })).toHaveAttribute('href', '/help');
  });

  it('includes logout button in menu', () => {
    (useAuth as jest.Mock).mockReturnValue({
      smith: mockSmith,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('handles smith with only email (no name)', () => {
    const smithWithoutName = { ...mockSmith, name: undefined };
    (useAuth as jest.Mock).mockReturnValue({
      smith: smithWithoutName,
      loading: false,
      signOut: jest.fn(),
      authMode: 'mock',
    });

    render(<UserMenu />);

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('J')).toBeInTheDocument(); // First letter of email
  });
});
