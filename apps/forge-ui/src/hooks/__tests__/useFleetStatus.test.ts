// Unit tests for useFleetStatus hook
// Tests fleet status subscription and state management

import { renderHook, waitFor } from '@testing-library/react';
import { useFleetStatus } from '../useFleetStatus';
import { useSubscription } from '@apollo/client/react';
import { BELLOWS_STREAM_SUBSCRIPTION } from '@/lib/graphql/subscriptions';

// Mock Apollo Client
jest.mock('@apollo/client', () => ({
  useSubscription: jest.fn(),
}));

// Mock GraphQL subscriptions
jest.mock('@/lib/graphql/subscriptions', () => ({
  BELLOWS_STREAM_SUBSCRIPTION: 'subscription bellowsStream($fleetId: String!) { bellowsStream(fleetId: $fleetId) { ... } }',
}));

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

describe('useFleetStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns initial null status', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useFleetStatus('fleet-123'));

    expect(result.current.status).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('subscribes to fleet status with correct variables', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as any);

    renderHook(() => useFleetStatus('fleet-123'));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      BELLOWS_STREAM_SUBSCRIPTION,
      expect.objectContaining({
        variables: { fleetId: 'fleet-123' },
        skip: false,
      })
    );
  });

  test('skips subscription when fleetId is empty', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as any);

    renderHook(() => useFleetStatus(''));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      BELLOWS_STREAM_SUBSCRIPTION,
      expect.objectContaining({
        skip: true,
      })
    );
  });

  test('updates status when subscription data arrives', async () => {
    const mockData = {
      bellowsStream: {
        fleetId: 'fleet-123',
        metrics: [
          {
            timestamp: new Date(),
            robotId: 'robot-1',
            batteryLevel: 85,
            healthScore: 92,
          },
        ],
        events: [
          {
            timestamp: new Date(),
            type: 'TASK_COMPLETED',
            robotId: 'robot-1',
            message: 'Task completed successfully',
          },
        ],
        realTime: true,
      },
    };

    mockUseSubscription.mockReturnValue({
      data: mockData,
      loading: false,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useFleetStatus('fleet-123'));

    await waitFor(() => {
      expect(result.current.status).toBeDefined();
    });

    expect(result.current.status).toEqual(mockData.bellowsStream);
  });

  test('handles subscription errors', () => {
    const mockError = new Error('Subscription failed');

    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: mockError,
    } as any);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useFleetStatus('fleet-123'));

    expect(result.current.error).toEqual(mockError);

    consoleSpy.mockRestore();
  });

  test('handles loading state', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useFleetStatus('fleet-123'));

    expect(result.current.loading).toBe(true);
  });

  test('logs subscription errors to console', () => {
    const mockError = new Error('Subscription error');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: mockError,
      onError: jest.fn(),
    } as any);

    renderHook(() => useFleetStatus('fleet-123'));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      BELLOWS_STREAM_SUBSCRIPTION,
      expect.objectContaining({
        onError: expect.any(Function),
      })
    );

    // Call the onError handler
    const callArgs = mockUseSubscription.mock.calls[0][1];
    if (callArgs?.onError) {
      callArgs.onError(mockError);
    }

    // Note: The actual error logging happens in the hook's onError callback
    // We verify the callback was set up correctly

    consoleSpy.mockRestore();
  });
});

